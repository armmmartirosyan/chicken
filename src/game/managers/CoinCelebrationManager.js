import { AnimatedSprite, Assets, Texture, Rectangle } from "pixi.js";
import { gameEvents } from "../core/GameEventBus.js";
import {
  COIN_SPRITESHEET,
  validateCoinAssets,
} from "../../constants/vfxAssets.js";

export class CoinCelebrationManager {
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
    this.boundPlayHandler = this.play.bind(this);
    this.boundResizeHandler = this.onResize.bind(this);
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
    const validation = validateCoinAssets();
    console.log(`----------------: ${JSON.stringify(validation)}`);

    if (!validation.isComplete) {
      console.warn(
        "[CoinCelebrationManager] Asset validation failed. Missing:",
        validation.missingFields,
      );
      console.warn(
        "[CoinCelebrationManager] Coin celebration VFX will be disabled until assets are provided.",
      );
      return false;
    }

    try {
      // Load coin spritesheet frames
      await this.loadCoinTextures();

      // Register event listeners
      gameEvents.on("gameComplete", this.boundPlayHandler);
      window.addEventListener("resize", this.boundResizeHandler);
      window.addEventListener("orientationchange", this.boundResizeHandler);

      console.log("[CoinCelebrationManager] Initialized successfully");
      return true;
    } catch (error) {
      console.error("[CoinCelebrationManager] Initialization failed:", error);
      return false;
    }
  }

  /**
   * Load coin spritesheet and create texture array
   * Slices Base64 spritesheet into individual frame textures
   *
   * @returns {Promise<void>}
   */
  async loadCoinTextures() {
    const { imageBase64, frameWidth, frameHeight, frameCount } =
      COIN_SPRITESHEET;

    // imageBase64 already contains the full data URI (data:image/webp;base64,...)
    // No need to add another prefix
    console.log("[CoinCelebrationManager] Loading spritesheet...");
    const assetKey = "coin_celebration_spritesheet";
    Assets.add({ alias: assetKey, src: imageBase64 });
    const mainTexture = await Assets.load(assetKey);

    // Get texture source dimensions
    const textureWidth = mainTexture.width;
    const textureHeight = mainTexture.height;

    // Calculate spritesheet grid layout
    const columns = Math.floor(textureWidth / frameWidth);
    const rows = Math.ceil(frameCount / columns);

    console.log(
      `[CoinCelebrationManager] Spritesheet dimensions: ${textureWidth}x${textureHeight}`,
    );
    console.log(
      `[CoinCelebrationManager] Frame dimensions: ${frameWidth}x${frameHeight}`,
    );
    console.log(
      `[CoinCelebrationManager] Grid layout: ${columns} columns x ${rows} rows`,
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
      `[CoinCelebrationManager] Loaded ${this.textures.length} frame textures`,
    );
  }

  /**
   * Play coin celebration animation
   * Triggered by gameEvents.emit('gameComplete')
   */
  play() {
    // Guard: Prevent double-play
    if (this.isPlaying) {
      console.warn("[CoinCelebrationManager] Animation already playing");
      return;
    }

    // Guard: Check if textures loaded
    if (!this.textures || this.textures.length === 0) {
      console.warn(
        "[CoinCelebrationManager] Cannot play: textures not loaded. Did you provide Base64 data?",
      );
      gameEvents.emit("coinCelebrationSkipped");
      return;
    }

    // Guard: Check if PixiRenderer available
    if (!this.pixiRenderer || !this.pixiRenderer.app) {
      console.error("[CoinCelebrationManager] PixiRenderer not available");
      return;
    }

    console.log("[CoinCelebrationManager] Playing coin celebration animation");
    this.isPlaying = true;

    // Create AnimatedSprite from texture array
    this.animatedSprite = new AnimatedSprite(this.textures);

    // Configure animation
    this.animatedSprite.anchor.set(0.5); // Center origin for perfect centering
    this.animatedSprite.loop = false; // Play once
    this.animatedSprite.animationSpeed = COIN_SPRITESHEET.frameRate / 60; // Convert FPS to speed

    // Position at absolute screen center (DPI-safe coordinates)
    const app = this.pixiRenderer.app;
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    this.animatedSprite.position.set(centerX, centerY);

    // Scale to fit viewport (mid-ground layer)
    this.scaleToViewport();

    // Set z-index (mid-ground, below confetti at 999)
    this.animatedSprite.zIndex = 500;

    // Add to uiLayer (screen-space, not world-space)
    const uiLayer = this.pixiRenderer.uiLayer || app.stage;
    uiLayer.addChild(this.animatedSprite);
    uiLayer.sortableChildren = true; // Enable z-index sorting

    // Start animation
    this.animatedSprite.gotoAndPlay(0);

    // Register completion handler
    this.animatedSprite.onComplete = () => {
      console.log("[CoinCelebrationManager] Animation complete - cleaning up");
      this.destroy();
      gameEvents.emit("coinCelebrationComplete");
    };

    gameEvents.emit("coinCelebrationStarted");
  }

  /**
   * Scale sprite to fit viewport (maintain aspect ratio for mid-ground)
   * Called on play() and resize events
   */
  scaleToViewport() {
    if (!this.animatedSprite || !this.pixiRenderer.app) return;

    const app = this.pixiRenderer.app;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Scale to fit viewport while maintaining aspect ratio
    // Use 70% of viewport for mid-ground layer
    const scale = Math.min(
      (screenWidth * 1.1) / this.animatedSprite.texture.width,
      (screenHeight * 1.1) / this.animatedSprite.texture.height,
    );

    this.animatedSprite.scale.set(scale);
  }

  /**
   * Handle viewport resize during playback
   * Repositions and rescales sprite to maintain proper coverage
   */
  onResize() {
    if (!this.isPlaying || !this.animatedSprite) return;

    console.log("[CoinCelebrationManager] Resizing to new viewport dimensions");

    const app = this.pixiRenderer.app;

    // Reposition to new screen center (absolute coordinates)
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    this.animatedSprite.position.set(centerX, centerY);

    // Rescale to new viewport
    this.scaleToViewport();
  }

  /**
   * Cleanup and remove from stage
   * Called automatically after animation completes, or can be called manually
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
  }

  /**
   * Complete cleanup - removes event listeners and destroys textures
   * Call this when shutting down the game or manager is no longer needed
   */
  dispose() {
    // Destroy current animation if playing
    this.destroy();

    // Remove event listeners
    gameEvents.off("gameComplete", this.boundPlayHandler);
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

    console.log("[CoinCelebrationManager] Disposed");
  }
}
