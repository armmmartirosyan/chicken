import { AnimatedSprite, Assets, Texture, Rectangle } from "pixi.js";
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
      return false;
    }

    try {
      // Load cashout spritesheet frames
      await this.loadCashoutTextures();

      // Register resize listeners (no event bus listener - called manually)
      window.addEventListener("resize", this.boundResizeHandler);
      window.addEventListener("orientationchange", this.boundResizeHandler);

      console.log("[CashoutVFXManager] Initialized successfully");
      return true;
    } catch (error) {
      console.error("[CashoutVFXManager] Initialization failed:", error);
      return false;
    }
  }

  /**
   * Load cashout spritesheet and create texture array
   * Slices Base64 spritesheet into individual frame textures
   *
   * @returns {Promise<void>}
   */
  async loadCashoutTextures() {
    const { imageBase64, frameWidth, frameHeight, frameCount } =
      CASHOUT_SPRITESHEET;

    console.log("[CashoutVFXManager] Loading spritesheet...");
    const assetKey = "cashout_vfx_spritesheet";
    Assets.add({ alias: assetKey, src: imageBase64 });
    const mainTexture = await Assets.load(assetKey);

    // Get texture source dimensions
    const textureWidth = mainTexture.width;
    const textureHeight = mainTexture.height;

    // Calculate spritesheet grid layout
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

    // Slice main texture into individual frame textures
    this.textures = [];
    for (let i = 0; i < frameCount; i++) {
      const x = (i % columns) * frameWidth;
      const y = Math.floor(i / columns) * frameHeight;
      const rect = new Rectangle(x, y, frameWidth, frameHeight);
      // PixiJS v8: Share the same texture source with different frames
      const texture = new Texture({
        source: mainTexture.source,
        frame: rect,
      });
      this.textures.push(texture);
    }

    console.log(
      `[CashoutVFXManager] Loaded ${this.textures.length} frame textures`,
    );
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
      console.warn("[CashoutVFXManager] Animation already playing");
      return;
    }

    // Guard: Check if textures loaded
    if (!this.textures || this.textures.length === 0) {
      console.warn(
        "[CashoutVFXManager] Cannot play: textures not loaded. Assets not provided.",
      );
      // Immediately call completion callback if no animation available
      if (onComplete) onComplete();
      return;
    }

    // Guard: Check if PixiRenderer available
    if (!this.pixiRenderer || !this.pixiRenderer.app) {
      console.error("[CashoutVFXManager] PixiRenderer not available");
      if (onComplete) onComplete();
      return;
    }

    console.log("[CashoutVFXManager] Playing cashout animation");
    this.isPlaying = true;
    this.onAnimationComplete = onComplete;

    // Create AnimatedSprite from texture array
    this.animatedSprite = new AnimatedSprite(this.textures);

    // Configure animation
    this.animatedSprite.anchor.set(0.5); // Center origin
    this.animatedSprite.loop = false; // Play once (MASTER DIRECTIVE requirement)
    this.animatedSprite.animationSpeed = CASHOUT_SPRITESHEET.frameRate / 60;

    // Position at chicken location or screen center (most visually impactful)
    this.positionAtChicken();

    // Scale using renderer's currentScale (MASTER DIRECTIVE: inherit global scale)
    this.scaleWithCurrentScale();

    // Set z-index (above gameplay, below UI modals)
    this.animatedSprite.zIndex = 800;

    // Add to stage
    const app = this.pixiRenderer.app;
    app.stage.addChild(this.animatedSprite);
    app.stage.sortableChildren = true; // Enable z-index sorting

    // Start animation
    this.animatedSprite.gotoAndPlay(0);

    // Register completion handler (MASTER DIRECTIVE: Sequential hand-off to React)
    this.animatedSprite.onComplete = () => {
      console.log("[CashoutVFXManager] Animation complete - triggering dialog");

      // CRITICAL FIX: Store callback before destroy() nullifies it
      const callback = this.onAnimationComplete;
      this.destroy();

      // Execute completion callback (shows React dialog)
      if (callback) {
        callback();
      }
    };
  }

  /**
   * Position animation at chicken location or screen center
   * Uses PixiRenderer's logicalToScreen conversion for accurate positioning
   */
  positionAtChicken() {
    if (!this.animatedSprite || !this.pixiRenderer) return;

    const app = this.pixiRenderer.app;
    const game = this.pixiRenderer.game;

    // Try to position at chicken if available (most visually impactful)
    if (game && game.chicken && game.chicken.getPosition) {
      const chickenPos = game.chicken.getPosition();
      const screenPos = this.pixiRenderer.logicalToScreen(
        chickenPos.x,
        chickenPos.y,
      );

      this.animatedSprite.x = screenPos.x;
      this.animatedSprite.y = screenPos.y;

      console.log(
        `[CashoutVFXManager] Positioned at chicken: (${Math.round(screenPos.x)}, ${Math.round(screenPos.y)})`,
      );
    } else {
      // Fallback: Center of screen
      this.animatedSprite.x = app.view.width / 2;
      this.animatedSprite.y = app.view.height / 2;

      console.log("[CashoutVFXManager] Positioned at screen center");
    }
  }

  /**
   * Scale sprite using renderer's currentScale (MASTER DIRECTIVE requirement)
   * Ensures animation remains proportional on Mobile/Tablet
   */
  scaleWithCurrentScale() {
    if (!this.animatedSprite || !this.pixiRenderer) return;

    // Use renderer's currentScale for responsive sizing
    const baseScale = this.pixiRenderer.currentScale || 1;

    // Apply scale to sprite
    this.animatedSprite.scale.set(baseScale);

    console.log(`[CashoutVFXManager] Applied scale: ${baseScale.toFixed(3)}`);
  }

  /**
   * Handle viewport resize during playback
   * Repositions and rescales sprite to maintain proper coverage
   */
  onResize() {
    if (!this.isPlaying || !this.animatedSprite) return;

    console.log("[CashoutVFXManager] Resizing to new viewport dimensions");

    // Reposition at chicken/center
    this.positionAtChicken();

    // Rescale with new currentScale
    this.scaleWithCurrentScale();
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

    console.log("[CashoutVFXManager] Disposed");
  }
}
