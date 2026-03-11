import { AnimatedSprite, Texture, Rectangle } from "pixi.js";
import {
  CASHOUT_SPRITESHEET,
  validateCashoutAssets,
} from "../../constants/vfxAssets.js";

/**
 * CashoutVFXManager - Manages cashout celebration animation
 *
 * Plays a one-shot PixiJS AnimatedSprite when user cashes out.
 * Animation centers on the chicken (for visual impact) and respects
 * the global currentScale for responsive mobile/tablet support.
 *
 * Architecture:
 * - Non-blocking: No audio (keeps build size optimized)
 * - Event-driven: Emits "cashoutAnimationComplete" for React dialog handoff
 * - Responsive: Inherits renderer's currentScale for consistent sizing
 * - One-shot: loop=false ensures single playback
 *
 * Usage:
 *   const manager = new CashoutVFXManager(config, pixiRenderer);
 *   await manager.initialize(containerElement);
 *   manager.play();  // Triggers animation at chicken position
 *   // Listen for "cashoutAnimationComplete" event to show dialog
 */
export class CashoutVFXManager {
  constructor(config, pixiRenderer) {
    // Dependencies
    this.config = config;
    this.pixiRenderer = pixiRenderer;

    // Animation state
    this.animatedSprite = null; // PIXI.AnimatedSprite instance
    this.isPlaying = false; // Prevents double-play
    this.textures = null; // Array of PIXI.Texture (frames)
    this.loadFailed = false; // Tracks if external asset failed to load

    // POT (Power-of-Two) Hardware Abstraction
    this.POT_FRAME_WIDTH = 512; // POT-compliant width
    this.POT_FRAME_HEIGHT = 1024; // POT-compliant height
    this.MAX_ATLAS_SIZE = 2048; // Android GPU texture size limit
    this.potAtlases = []; // Multiple atlas textures for fragmentation

    // Viewport tracking for responsive scaling
    this.containerElement = null;

    // Event handler references (for cleanup)
    this.boundResizeHandler = this.onResize.bind(this);

    // Callback for animation completion (used to trigger React dialog)
    this.onAnimationComplete = null;
  }

  /**
   * Initialize manager and load assets
   *
   * @param {HTMLElement} containerElement - Parent element for viewport dimensions
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize(containerElement) {
    this.containerElement = containerElement;

    // Validate assets before attempting load
    const validation = validateCashoutAssets();

    if (!validation.isComplete) {
      console.warn(
        "[CashoutVFXManager] Asset validation failed. Missing:",
        validation.missingFields,
      );
      console.warn(
        "[CashoutVFXManager] Cashout VFX will be disabled until assets are provided.",
      );
      this.loadFailed = true;
      return false;
    }

    try {
      // Load cashout spritesheet frames using Canvas-Proxy pattern
      await this.loadCashoutTextures();

      // Register resize listeners (no event bus listener - called manually)
      window.addEventListener("resize", this.boundResizeHandler);
      window.addEventListener("orientationchange", this.boundResizeHandler);

      this.loadFailed = false;
      return true;
    } catch (error) {
      console.error(
        "[CashoutVFXManager] Failed to load external spritesheet:",
        error.message,
      );
      console.warn(
        "[CashoutVFXManager] Fallback mode activated - animation will be skipped",
      );
      this.loadFailed = true;
      return false;
    }
  }

  /**
   * Load cashout spritesheet using Canvas-Proxy pattern
   *
   * VITE BUNDLED MODEL:
   * 1. Uses Vite-imported asset (bundled into HTML build)
   * 2. Canvas-Proxy forces 2D decode before WebGL bind
   * 3. Solves Android Native Browser "black rectangle" bug
   * 4. Mathematically parses frames (no JSON atlas needed)
   *
   * @returns {Promise<void>}
   * @throws {Error} If image fails to load or is invalid
   */
  async loadCashoutTextures() {
    const { imageUrl, frameWidth, frameHeight, frameCount } =
      CASHOUT_SPRITESHEET;

    console.log(
      `[CashoutVFXManager] Loading Vite-bundled spritesheet: ${imageUrl}`,
    );

    // STEP 1: Load Vite-bundled image using HTML Image object
    const image = await this.loadExternalImage(imageUrl);

    console.log(
      `[CashoutVFXManager] Image loaded: ${image.width}x${image.height}`,
    );

    // STEP 2: Canvas-Proxy decode (forces 2D buffer decode before WebGL)
    const canvasSource = this.createCanvasProxy(image);

    // STEP 3: Create PixiJS Texture from canvas (PixiJS v8 API)
    const baseTexture = Texture.from(canvasSource, {
      scaleMode: "linear", // Smooth scaling on mobile
    });

    // Get texture dimensions
    const textureWidth = image.width;
    const textureHeight = image.height;

    // STEP 4: Calculate spritesheet grid layout (SENIOR ARCHITECT MATH)
    const columns = Math.floor(textureWidth / frameWidth);
    const rows = Math.ceil(frameCount / columns);

    console.log(
      `[CashoutVFXManager] Spritesheet dimensions: ${textureWidth}x${textureHeight}`,
    );
    console.log(
      `[CashoutVFXManager] Frame dimensions: ${frameWidth}x${frameHeight}`,
    );
    console.log(
      `[CashoutVFXManager] Grid layout: ${columns} columns x ${rows} rows`,
    );

    // STEP 5: Dynamically slice frames from baseTexture
    this.textures = [];
    for (let i = 0; i < frameCount; i++) {
      const x = (i % columns) * frameWidth;
      const y = Math.floor(i / columns) * frameHeight;
      const rect = new Rectangle(x, y, frameWidth, frameHeight);

      // Create texture from baseTexture with frame rectangle
      const texture = new Texture({
        source: baseTexture.source,
        frame: rect,
      });

      this.textures.push(texture);
    }

    console.log(
      `[CashoutVFXManager] ✓ Loaded ${this.textures.length} frames via Canvas-Proxy`,
    );
  }

  /**
   * Load external image using Promise-based HTML Image
   *
   * @param {string} url - Image URL (relative or absolute)
   * @returns {Promise<HTMLImageElement>} Loaded image
   * @throws {Error} If image fails to load
   */
  loadExternalImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      // CRITICAL: Set crossOrigin for CDN compatibility
      img.crossOrigin = "anonymous";

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${url}`));

      img.src = url;
    });
  }

  /**
   * Canvas-Proxy pattern: Draw image to canvas to force 2D decode
   *
   * ANDROID COMPATIBILITY FIX:
   * - Android Native Browser has a bug where external images loaded directly
   *   into WebGL textures can render as "black rectangles"
   * - By drawing to a canvas first, we force the browser to decode the image
   *   in its 2D rendering pipeline before WebGL attempts to bind it
   * - This ensures the decoded pixel data is available to WebGL
   *
   * @param {HTMLImageElement} image - Loaded image
   * @returns {HTMLCanvasElement|OffscreenCanvas} Canvas with decoded image
   */
  createCanvasProxy(image) {
    // Try OffscreenCanvas for better performance (if supported)
    let canvas;
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(image.width, image.height);
      console.log(
        "[CashoutVFXManager] Using OffscreenCanvas for hardware acceleration",
      );
    } else {
      // Fallback to regular canvas
      canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      console.log("[CashoutVFXManager] Using standard canvas (fallback)");
    }

    // Draw image to canvas (forces decode)
    const ctx = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true, // Hint for performance
    });

    ctx.drawImage(image, 0, 0);

    return canvas;
  }

  /**
   * Play cashout animation
   * Must be called manually from handleCashout function
   *
   * @param {Function} onComplete - Callback executed when animation finishes
   */
  play(onComplete) {
    // Guard: Prevent double-play
    if (this.isPlaying) {
      return;
    }

    // Guard: Check if external asset failed to load - use fallback
    if (this.loadFailed) {
      console.warn(
        "[CashoutVFXManager] External asset unavailable, using fallback",
      );
      this.playFallback(onComplete);
      return;
    }

    // Guard: Check if textures loaded
    if (!this.textures || this.textures.length === 0) {
      console.warn(
        "[CashoutVFXManager] Cannot play: textures not loaded. Using fallback.",
      );
      this.playFallback(onComplete);
      return;
    }

    // Guard: Check if PixiRenderer available
    if (!this.pixiRenderer || !this.pixiRenderer.app) {
      if (onComplete) onComplete();
      return;
    }

    this.isPlaying = true;
    this.onAnimationComplete = onComplete;

    // Create AnimatedSprite from texture array
    this.animatedSprite = new AnimatedSprite(this.textures);

    // Configure animation
    this.animatedSprite.anchor.set(0.5); // Center origin for perfect centering
    this.animatedSprite.loop = false; // Play once (MASTER DIRECTIVE requirement)
    this.animatedSprite.animationSpeed = CASHOUT_SPRITESHEET.frameRate / 60;

    // Position at absolute screen center (DPI-safe, ignore chicken position)
    const app = this.pixiRenderer.app;
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    this.animatedSprite.position.set(centerX, centerY);

    // Scale appropriately for screen size
    this.scaleForScreen();

    // Set z-index (above gameplay, below UI modals)
    this.animatedSprite.zIndex = 800;

    // Add to uiLayer (screen-space, not world-space)
    const uiLayer = this.pixiRenderer.uiLayer || app.stage;
    uiLayer.addChild(this.animatedSprite);
    uiLayer.sortableChildren = true; // Enable z-index sorting

    // Start animation
    this.animatedSprite.gotoAndPlay(0);

    // Register completion handler (MASTER DIRECTIVE: 200ms Perceptual Buffer)
    this.animatedSprite.onComplete = () => {
      // Step 1: Animation has finished - sprite now frozen on final frame
      console.log(
        "[CashoutVFXManager] Animation finished. Holding final frame for 200ms perceptual buffer...",
      );

      // Step 2: 200ms delay - let player absorb the final payout amount
      // During this time:
      // - Sprite remains visible at screen center
      // - Final frame (e.g., "10,278€") is frozen on screen
      // - Game inputs remain locked (handled by parent component)
      console.log(
        "[CashoutVFXManager] Perceptual buffer complete. Triggering React dialog transition...",
      );

      // Step 5: Clean up VFX sprite after dialog is mounted
      // Brief additional delay ensures dialog renders before cleanup
      setTimeout(() => {
        // Step 3: Store callback before cleanup
        const callback = this.onAnimationComplete;

        // Step 4: Trigger React CashoutDialog (appears over animation)
        if (callback) {
          callback();
        }

        this.destroy();
        console.log("[CashoutVFXManager] VFX cleanup complete.");
      }, 200);
    };
  }

  /**
   * Fallback mode: Skip animation and immediately trigger dialog
   *
   * SAFETY NET:
   * - Used when external spritesheet fails to load (404, network timeout, etc.)
   * - Ensures game flow continues even without VFX
   * - Maintains clean handoff to React CashoutDialog
   *
   * @param {Function} onComplete - Callback to trigger dialog
   */
  playFallback(onComplete) {
    console.log(
      "[CashoutVFXManager] Fallback: Skipping animation, triggering dialog immediately",
    );

    // Brief delay to prevent jarring instant transition
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 100);
  }

  /**
   * Scale sprite appropriately for screen size
   * Uses screen dimensions for consistent sizing across devices
   */
  scaleForScreen() {
    if (!this.animatedSprite || !this.pixiRenderer) return;

    const app = this.pixiRenderer.app;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Scale to fit screen while maintaining aspect ratio
    const frame = this.animatedSprite.texture;
    if (frame && frame.width && frame.height) {
      const scaleX = (screenWidth * 1.1) / frame.width;
      const scaleY = (screenHeight * 1.1) / frame.height;
      const finalScale = Math.min(scaleX, scaleY); // Fit within screen
      this.animatedSprite.scale.set(finalScale);
    } else {
      // Fallback: Use renderer's currentScale
      const baseScale = this.pixiRenderer.currentScale || 1;
      this.animatedSprite.scale.set(baseScale);
    }

    console.log(
      `[CashoutVFXManager] Applied scale: ${this.animatedSprite.scale.x.toFixed(3)}`,
    );
  }

  /**
   * Handle viewport resize during playback
   * Repositions and rescales sprite to maintain proper coverage
   */
  onResize() {
    if (!this.isPlaying || !this.animatedSprite) return;

    const app = this.pixiRenderer.app;

    // Reposition to new screen center (absolute coordinates)
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    this.animatedSprite.position.set(centerX, centerY);

    // Rescale for new viewport
    this.scaleForScreen();
  }

  /**
   * Cleanup and remove from stage
   * Called automatically after animation completes
   */
  destroy() {
    // Stop and remove animated sprite
    if (this.animatedSprite) {
      this.animatedSprite.stop();

      // Remove from stage
      if (this.animatedSprite.parent) {
        this.animatedSprite.parent.removeChild(this.animatedSprite);
      }

      // Destroy sprite instance
      // IMPORTANT: texture: false preserves textures for potential replay
      this.animatedSprite.destroy({
        texture: false,
      });

      this.animatedSprite = null;
    }

    this.isPlaying = false;
    this.onAnimationComplete = null;
  }

  /**
   * Complete cleanup - removes event listeners and destroys textures
   * Call this when shutting down the game or manager is no longer needed
   */
  dispose() {
    // Destroy current animation if playing
    this.destroy();

    // Remove event listeners
    window.removeEventListener("resize", this.boundResizeHandler);
    window.removeEventListener("orientationchange", this.boundResizeHandler);

    // Destroy all texture data (final cleanup)
    if (this.textures) {
      this.textures.forEach((texture) => {
        // Destroy texture and its source
        texture.destroy(true);
      });
      this.textures = null;
    }
  }
}
