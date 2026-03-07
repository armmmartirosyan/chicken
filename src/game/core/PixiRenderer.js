import { Application, Assets, Container, Graphics } from "pixi.js";
import {
  Spine,
  TextureAtlas,
  AtlasAttachmentLoader,
  SkeletonJson,
  SpineTexture,
} from "@esotericsoftware/spine-pixi-v8";

/**
 * PixiRenderer - Advanced WebGL-based rendering using Pixi.js
 * Provides hardware-accelerated rendering with optimal performance
 * Implements vertical-anchor viewport with frame-perfect camera tracking
 *
 * ARCHITECTURE:
 * - Viewport Scaling: Based ONLY on window height (ignores width)
 * - Scale Formula: (viewportHeight / 1080) * 1.25 (1.25x zoom for visibility)
 * - Horizontal Position: Always left-aligned (x=0) - no centering
 * - Vertical Position: Frame-locked to chicken's Y coordinate
 *
 * CRITICAL TIMING:
 * - updateViewport(): Called on window resize (updates scale + canvas size ATOMICALLY)
 * - updateCamera(): Called EVERY FRAME in game ticker (locks chicken to screen center)
 *
 * PERFORMANCE:
 * - No interpolation/smoothing on camera (eliminates lag)
 * - Direct mathematical binding: worldContainer.y = viewportMid - (chicken.y * scale)
 * - Instant visual response to window resize (no refresh required)
 */
export class PixiRenderer {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.app = null;
    this.stage = null;
    this.worldContainer = null; // Main container for all game entities (camera target)
    this.uiLayer = null; // Separate UI layer for notifications that don't scroll
    this.initialized = false;

    // Vertical-Anchor Scaling System
    // Base logical height for vertical scaling calculations
    this.BASE_LOGICAL_HEIGHT = 1080;

    // Zoom multiplier for better visibility (1.25x enlargement)
    this.ZOOM_MULTIPLIER = 1.5;

    // Vertical focal point (0.55 = 55% from top, moves chicken slightly below center)
    this.VERTICAL_FOCAL_POINT = 0.75;

    // Current scale and viewport state
    this.currentScale = 1;
    this.viewportWidth = 0;
    this.viewportHeight = 0;

    // World dimensions for finish-line clamping
    this.worldWidth = 0; // Total logical world width (set by game)

    // Camera follow target (typically the chicken)
    this.cameraTarget = null;
    this.cameraOffsetY = 0; // Vertical offset for centering
    this.chickenScreenAnchor = 0.1; // Dynamic horizontal anchor (recalculated on resize)
    this.chickenScreenX = 0; // Cached screen X position for chicken

    // Configuration with optimal defaults
    this.config = {
      backgroundColor: config.backgroundColor || 0x2a2a2a,
      resolution: config.resolution || window.devicePixelRatio || 1,
      antialias: config.antialias !== false,
      autoDensity: true,
      ...config,
    };
  }

  /**
   * Initialize Pixi.js Application with optimal settings
   */
  async initialize() {
    if (this.initialized) return;

    // Create Pixi Application with WebGL renderer
    this.app = new Application();

    await this.app.init({
      canvas: this.canvas,
      background: this.config.backgroundColor,
      resolution: this.config.resolution,
      antialias: this.config.antialias,
      autoDensity: this.config.autoDensity,
      powerPreference: "high-performance", // Use high-performance GPU
      hello: false, // Disable Pixi.js banner in console
      roundPixels: true, // Prevent sub-pixel rendering for sharper graphics
    });

    // Check if app was destroyed during async init (race condition)
    if (!this.app) {
      return;
    }

    this.stage = this.app.stage;
    this.initialized = true;

    // CRITICAL FIX: Disable stage culling to prevent cars from disappearing
    // PixiJS may automatically cull objects it thinks are off-screen
    if (this.stage) {
      this.stage.cullable = false;
    }

    // Create world container - holds all game entities and follows camera
    this.worldContainer = new Container();
    this.worldContainer.cullable = false; // Prevent culling
    this.worldContainer.sortableChildren = true; // Enable z-index
    this.app.stage.addChild(this.worldContainer);

    // Create separate UI layer for notifications that stays fixed on viewport
    // This layer doesn't scroll with the game world (stage.x changes)
    this.uiLayer = new Container();
    this.uiLayer.zIndex = 10000; // Very high to be above everything
    this.app.stage.addChild(this.uiLayer);
    this.app.stage.sortableChildren = true;
  }

  /**
   * Get the main stage container
   */
  getStage() {
    return this.stage;
  }

  /**
   * Get the world container (where all game entities live)
   */
  getWorldContainer() {
    return this.worldContainer;
  }

  /**
   * Create a new container for organizing sprites
   */
  createContainer() {
    return new Container();
  }

  /**
   * Create a graphics object for drawing shapes
   */
  createGraphics() {
    return new Graphics();
  }

  /**
   * Load texture from URL using Pixi's asset system
   */
  async loadTexture(key, url) {
    try {
      Assets.add({ alias: key, src: url });
      const texture = await Assets.load(key);
      return texture;
    } catch (error) {

      return null;
    }
  }

  /**
   * Load multiple textures in parallel
   */
  async loadTextures(assets) {
    const assetArray = [];

    // Only add assets that aren't already loaded
    for (const { key, url } of assets) {
      if (!Assets.cache.has(key)) {
        assetArray.push({ alias: key, src: url });
      }
    }

    if (assetArray.length > 0) {
      Assets.add(assetArray);
    }

    try {
      const allKeys = assets.map((a) => a.key);
      const textures = await Assets.load(allKeys);
      return textures;
    } catch (error) {

      return {};
    }
  }

  /**
   * Get loaded texture
   */
  getTexture(key) {
    return Assets.get(key);
  }

  /**
   * Load Spine animation from imported ESM modules (Base64 embedded assets)
   * This method handles the manual resolution of atlas textures for single-file builds
   *
   * @param {string} key - Unique identifier for this Spine animation
   * @param {object} skeletonData - Imported JSON skeleton data
   * @param {string} atlasText - Imported .atlas file as raw text
   * @param {string} textureUrl - Imported PNG texture (Base64 data URI or ESM import)
   */
  async loadSpineFromImports(key, skeletonData, atlasText, textureUrl) {
    try {
      // Load the texture first using PixiJS Assets
      const textureKey = `${key}_texture`;
      Assets.add({ alias: textureKey, src: textureUrl });
      const pixiTexture = await Assets.load(textureKey);

      // Create a TextureAtlas from the atlas text
      const spineAtlas = new TextureAtlas(atlasText);

      // Set the texture for each atlas page
      // The atlas text references a PNG file, we need to provide that texture
      for (const page of spineAtlas.pages) {
        // Create a SpineTexture from the PixiJS texture source
        const spineTexture = SpineTexture.from(pixiTexture.source);
        page.setTexture(spineTexture);
      }

      // Create an attachment loader with the atlas
      const attachmentLoader = new AtlasAttachmentLoader(spineAtlas);

      // Create a skeleton JSON parser
      const skeletonJsonParser = new SkeletonJson(attachmentLoader);

      // Parse the skeleton data (can be object or JSON string)
      const parsedSkeletonData =
        skeletonJsonParser.readSkeletonData(skeletonData);

      // Store in our custom cache for later use
      if (!this._spineCache) {
        this._spineCache = {};
      }

      this._spineCache[key] = {
        skeletonData: parsedSkeletonData,
        atlas: spineAtlas,
      };

      return { key };
    } catch (error) {

      throw error;
    }
  }

  /**
   * Load Spine animation from JSON file (legacy method for URL-based loading)
   * The spine-pixi-v8 loader automatically handles atlas loading
   * @deprecated Use loadSpineFromImports for single-file builds
   */
  async loadSpineAnimation(key, jsonUrl, atlasUrl) {
    try {
      // Load atlas and skeleton separately as required by spine-pixi-v8
      Assets.add({ alias: `${key}_atlas`, src: atlasUrl });
      Assets.add({ alias: `${key}_skeleton`, src: jsonUrl });

      await Assets.load([`${key}_atlas`, `${key}_skeleton`]);

      return { skeleton: `${key}_skeleton`, atlas: `${key}_atlas` };
    } catch (error) {

      throw error;
    }
  }

  /**
   * Create a Spine instance from loaded data
   * @param {object} assetKeys - Either { skeleton, atlas } for URL-based or { key } for ESM imports
   */
  createSpine(assetKeys) {
    try {
      // Check if this is from our custom spine cache (ESM imports)
      if (
        assetKeys.key &&
        this._spineCache &&
        this._spineCache[assetKeys.key]
      ) {
        const cached = this._spineCache[assetKeys.key];
        // Create Spine instance directly from parsed data
        const spine = new Spine(cached.skeletonData);
        return spine;
      }

      // Otherwise, use the standard Assets-based loading (URL-based)
      // Create Spine instance - spine-pixi-v8 format
      // Expects { skeleton: 'skeleton-key', atlas: 'atlas-key' }
      const spine = Spine.from(assetKeys);

      return spine;
    } catch (error) {


      return null;
    }
  }

  /**
   * Set camera target for follow behavior
   * @param {Object} target - Entity with x, y properties
   * @param {Number} offsetY - Vertical offset (0 = center, positive = lower on screen)
   */
  setCameraTarget(target, offsetY = 0) {
    this.cameraTarget = target;
    this.cameraOffsetY = offsetY;
  }

  /**
   * Set world dimensions for finish-line clamping
   * Must be called after world is created
   */
  setWorldDimensions(worldWidth) {
    this.worldWidth = worldWidth;
  }

  /**
   * Resize renderer - sets canvas internal rendering resolution
   * This is the actual size the game renders at (can be large)
   */
  resize(width, height) {
    if (!this.app) return;

    // Resize the actual renderer (internal rendering resolution)
    this.app.renderer.resize(width, height);
  }

  /**
   * Update viewport scaling - Vertical-Anchor Strategy (ATOMIC OPERATION)
   * CRITICAL: This must update FOUR properties atomically for instant visual response:
   * 1. Renderer size (canvas dimensions)
   * 2. Global scale (calculated from viewport height)
   * 3. WorldContainer scale (applied to all entities)
   * 4. Dynamic horizontal anchor (aspect-ratio aware)
   *
   * ARCHITECTURE NOTE:
   * We scale worldContainer (child of app.stage), NOT app.stage itself.
   * This allows UI elements to remain unscaled while game world scales.
   * app.stage.scale is always 1.0 - worldContainer.scale varies.
   */
  updateViewport(viewportWidth, viewportHeight) {
    if (!this.app || !this.worldContainer) return;

    // Store viewport dimensions (used by updateCamera every frame)
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    // Update renderer resolution for high-DPI displays
    this.app.renderer.resolution = window.devicePixelRatio || 1;

    // ━━━ ATOMIC OPERATION 1: Resize canvas to match viewport ━━━
    this.app.renderer.resize(viewportWidth, viewportHeight);

    // ━━━ ATOMIC OPERATION 2: Calculate scale based ONLY on viewport height ━━━
    // Vertical-Anchor Strategy: Height is the master constraint
    // Apply 1.25x zoom multiplier for better visibility
    this.currentScale =
      (viewportHeight / this.BASE_LOGICAL_HEIGHT) * this.ZOOM_MULTIPLIER;

    // ━━━ ATOMIC OPERATION 3: Apply scale to worldContainer immediately ━━━
    // This ensures visual update happens in the SAME FRAME as resize event
    // CRITICAL: This is the "live Pixi object" scale application the user requires
    this.worldContainer.scale.set(this.currentScale);

    // ENFORCE: Ensure stage itself is at baseline scale (1.0)
    // worldContainer handles all game scaling, stage remains unscaled for UI layer
    this.app.stage.scale.set(1.0);

    // ━━━ ATOMIC OPERATION 4: Dynamic Horizontal Anchor (Aspect-Ratio Aware) ━━━
    // RESPONSIVE X-ANCHOR: Adjust chicken position based on aspect ratio
    // Narrow screens (mobile/portrait/tablet): Push chicken inward (22%) to prevent clipping
    // Wide screens (desktop/landscape): Keep chicken at left edge (10%) for maximum forward view
    const aspectRatio = viewportWidth / viewportHeight;
    const isNarrow = aspectRatio < 1.0; // Portrait or square aspect ratio

    // CRITICAL: Use 22% anchor for narrow screens, 10% for wide screens
    // This prevents the chicken from being clipped on mobile devices
    this.chickenScreenAnchor = isNarrow ? 0.22 : 0.1;

    // Cache the computed screen X position for use in camera calculations
    this.chickenScreenX = viewportWidth * this.chickenScreenAnchor;

    // LEFT-ALIGNED: No horizontal centering (horizontally scrollable game)
    // Lock to left edge (x=0) for all viewport sizes
    // CRITICAL: This must NEVER be changed elsewhere - horizontal position is ALWAYS 0
    this.worldContainer.x = 0;

    // SYNCHRONIZE CAMERA IMMEDIATELY
    // Must call updateCamera() HERE to prevent frame-delay desync
    // This ensures camera position updates in the SAME FRAME as scale change
    this.updateCamera();
  }

  /**
   * ATOMIC CAMERA UPDATE (Both X and Y Axis)
   * Called EVERY FRAME in the game ticker + on resize
   * CRITICAL: No interpolation, no smoothing - direct mathematical binding
   *
   * The world is a MIRROR of the chicken's visual progress:
   * - Y-axis: worldContainer.y = verticalFocalPoint - (chicken.y * scale)
   * - X-axis: worldContainer.x = chickenScreenX - (chicken.x * scale)
   *
   * ASPECT-RATIO AWARE: chickenScreenX is now dynamically calculated in updateViewport()
   * based on the current aspect ratio (22% for narrow, 10% for wide)
   */
  updateCamera() {
    if (!this.worldContainer || !this.cameraTarget) return;

    // Safeguard: Ensure viewport dimensions are valid
    // This prevents NaN or 0 values during initialization
    if (this.viewportHeight <= 0 || this.currentScale <= 0) return;

    // ━━━ Y-AXIS (VERTICAL): Hard-locked at 55% from top ━━━
    const verticalFocalPoint = this.viewportHeight * this.VERTICAL_FOCAL_POINT;
    const chickenScaledY = this.cameraTarget.y * this.currentScale;
    this.worldContainer.y =
      verticalFocalPoint - chickenScaledY + this.cameraOffsetY;

    // ━━━ X-AXIS (HORIZONTAL): Atomic mirror of chicken position ━━━
    // RESPONSIVE: Use cached chickenScreenX (calculated in updateViewport based on aspect ratio)
    // The chicken's world X directly determines the camera X
    // No separate animation - this runs EVERY FRAME
    const chickenScaledX = this.cameraTarget.x * this.currentScale;
    const rawTargetX = this.chickenScreenX - chickenScaledX;

    // ━━━ DUAL CLAMP: Prevents empty space on BOTH sides ━━━
    // START CLAMP: worldContainer.x <= 0 (never show left of start image)
    // FINISH CLAMP: worldContainer.x >= maxScroll (never show right of finish image)
    // ASPECT-AWARE: maxScroll now accounts for the dynamic horizontal anchor
    const worldScaledWidth = this.worldWidth * this.currentScale;
    const maxScroll = -(worldScaledWidth - this.viewportWidth);

    // Apply dual clamping: constrain to [maxScroll, 0]
    // Math.min(0, ...) prevents showing left of start
    // Math.max(..., maxScroll) prevents showing right of finish
    this.worldContainer.x = Math.min(0, Math.max(rawTargetX, maxScroll));
  }

  /**
   * Get logical-to-screen coordinate conversion
   * Useful for converting logical game coordinates to screen pixels
   */
  logicalToScreen(logicalX, logicalY) {
    return {
      x: this.worldContainer.x + logicalX * this.currentScale,
      y: this.worldContainer.y + logicalY * this.currentScale,
    };
  }

  /**
   * Get screen-to-logical coordinate conversion
   * Useful for converting mouse/touch input to game coordinates
   */
  screenToLogical(screenX, screenY) {
    return {
      x: (screenX - this.worldContainer.x) / this.currentScale,
      y: (screenY - this.worldContainer.y) / this.currentScale,
    };
  }

  /**
   * Add child to stage
   */
  addToStage(displayObject) {
    if (this.stage && displayObject) {
      this.stage.addChild(displayObject);
    }
  }

  /**
   * Remove child from stage
   */
  removeFromStage(displayObject) {
    if (this.stage && displayObject) {
      this.stage.removeChild(displayObject);
    }
  }

  /**
   * Clear stage
   */
  clear() {
    if (this.stage) {
      this.stage.removeChildren();
    }
  }

  /**
   * Render frame (handled automatically by Pixi's ticker)
   */
  render() {
    // Pixi automatically renders, but we can force a render if needed
    if (this.app && this.app.renderer) {
      this.app.renderer.render(this.stage);
    }
  }

  /**
   * Get renderer instance
   */
  getRenderer() {
    return this.app ? this.app.renderer : null;
  }

  /**
   * Destroy renderer and cleanup
   */
  destroy() {
    if (this.app) {
      // Stop ticker first (if it exists)
      if (this.app.ticker) {
        try {
          this.app.ticker.stop();
        } catch {
          // Ticker might already be stopped or destroyed
        }
      }

      // Clear stage
      if (this.stage) {
        try {
          this.stage.removeChildren();
        } catch {
          // Stage might already be destroyed
        }
      }

      // Destroy app but keep canvas element
      try {
        this.app.destroy(false, {
          children: true,
          texture: false, // Keep textures cached
          baseTexture: false,
        });
      } catch {
        // App might already be destroyed
      }

      this.app = null;
      this.stage = null;
      this.initialized = false;
    }
  }
}
