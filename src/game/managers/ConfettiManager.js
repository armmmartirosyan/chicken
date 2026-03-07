import { AnimatedSprite, Assets, Texture, Rectangle } from "pixi.js";
import { gameEvents } from "../core/GameEventBus.js";
import {
  CONFETTI_SPRITESHEET,
  validateConfettiAssets,
} from "../../constants/vfxAssets.js";

export class ConfettiManager {
  constructor(config, pixiRenderer, audioEngine) {
    // Dependencies
    this.config = config;
    this.pixiRenderer = pixiRenderer;
    this.audioEngine = audioEngine;

    // Animation state
    this.animatedSprite = null; // PIXI.AnimatedSprite instance
    this.isPlaying = false; // Prevents double-play
    this.textures = null; // Array of PIXI.Texture (40 frames)

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
    const validation = validateConfettiAssets();
    if (!validation.isComplete) {
      console.warn(
        "[ConfettiManager] Asset validation failed. Missing:",
        validation.missingFields,
      );
      console.warn(
        "[ConfettiManager] Confetti VFX will be disabled until assets are provided.",
      );
      return false;
    }

    try {
      // Load confetti spritesheet frames
      await this.loadConfettiTextures();

      // Register event listeners
      gameEvents.on("gameComplete", this.boundPlayHandler);
      window.addEventListener("resize", this.boundResizeHandler);
      window.addEventListener("orientationchange", this.boundResizeHandler);

      console.log("[ConfettiManager] Initialized successfully");
      return true;
    } catch (error) {
      console.error("[ConfettiManager] Initialization failed:", error);
      return false;
    }
  }

  /**
   * Load confetti spritesheet and create texture array
   * Slices Base64 PNG into 40 individual frame textures
   *
   * @returns {Promise<void>}
   */
  async loadConfettiTextures() {
    const { imageBase64, frameWidth, frameHeight, frameCount } =
      CONFETTI_SPRITESHEET;

    // imageBase64 already contains the full data URI (data:image/webp;base64,...)
    // No need to add another prefix
    console.log("[ConfettiManager] Loading spritesheet...");
    const assetKey = "confetti_spritesheet";
    Assets.add({ alias: assetKey, src: imageBase64 });
    const mainTexture = await Assets.load(assetKey);

    // Get texture source dimensions
    const textureWidth = mainTexture.width;
    const textureHeight = mainTexture.height;

    // Calculate spritesheet grid layout
    const columns = Math.floor(textureWidth / frameWidth);
    const rows = Math.ceil(frameCount / columns);

    console.log(
      `[ConfettiManager] Spritesheet dimensions: ${textureWidth}x${textureHeight}`,
    );
    console.log(
      `[ConfettiManager] Frame dimensions: ${frameWidth}x${frameHeight}`,
    );
    console.log(
      `[ConfettiManager] Grid layout: ${columns} columns x ${rows} rows`,
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
      `[ConfettiManager] Loaded ${this.textures.length} frame textures`,
    );
  }

  /**
   * Play confetti animation
   * Triggered by gameEvents.emit('gameComplete')
   */
  play() {
    // Guard: Prevent double-play
    if (this.isPlaying) {
      console.warn("[ConfettiManager] Animation already playing");
      return;
    }

    // Guard: Check if textures loaded
    if (!this.textures || this.textures.length === 0) {
      console.warn(
        "[ConfettiManager] Cannot play: textures not loaded. Did you provide Base64 data?",
      );
      gameEvents.emit("confettiSkipped");
      return;
    }

    // Guard: Check if PixiRenderer available
    if (!this.pixiRenderer || !this.pixiRenderer.app) {
      console.error("[ConfettiManager] PixiRenderer not available");
      return;
    }

    console.log("[ConfettiManager] Playing confetti animation");
    this.isPlaying = true;

    // Create AnimatedSprite from texture array
    this.animatedSprite = new AnimatedSprite(this.textures);

    // Configure animation
    this.animatedSprite.anchor.set(0.5); // Center origin
    this.animatedSprite.loop = false; // Play once
    this.animatedSprite.animationSpeed = CONFETTI_SPRITESHEET.frameRate / 60; // Convert FPS to speed (28/60 = 0.467)

    // Position at viewport center
    const app = this.pixiRenderer.app;
    this.animatedSprite.x = app.view.width / 2;
    this.animatedSprite.y = app.view.height / 2;

    // Scale to fill viewport
    this.scaleToViewport();

    // Set z-index (highest layer)
    this.animatedSprite.zIndex = 999;

    // Add to stage
    app.stage.addChild(this.animatedSprite);
    app.stage.sortableChildren = true; // Enable z-index sorting

    // Start animation
    this.animatedSprite.gotoAndPlay(0);

    // Play audio
    this.playAudio();

    // Register completion handler
    this.animatedSprite.onComplete = () => {
      console.log("[ConfettiManager] Animation complete - cleaning up");
      this.destroy();
      gameEvents.emit("confettiComplete");
    };

    gameEvents.emit("confettiStarted");
  }

  /**
   * Play synchronized audio tracks
   * - Confetti SFX plays immediately
   * Loads audio on first play if not already loaded
   */
  async playAudio() {
    if (!this.audioEngine) return;

    try {
      // Play confetti burst sound immediately
      this.audioEngine.playSound?.("confetti");
    } catch (error) {
      console.warn("[ConfettiManager] Audio playback failed:", error);
    }
  }

  /**
   * Scale sprite to fill viewport (stretch-to-fit)
   * Called on play() and resize events
   */
  scaleToViewport() {
    if (!this.animatedSprite || !this.pixiRenderer.app) return;

    const app = this.pixiRenderer.app;
    const viewportWidth = app.view.width;
    const viewportHeight = app.view.height;

    // Stretch to fill viewport (non-uniform scaling)
    this.animatedSprite.width = viewportWidth;
    this.animatedSprite.height = viewportHeight;
  }

  /**
   * Handle viewport resize during playback
   * Repositions and rescales sprite to maintain fullscreen coverage
   */
  onResize() {
    if (!this.isPlaying || !this.animatedSprite) return;

    console.log("[ConfettiManager] Resizing to new viewport dimensions");

    const app = this.pixiRenderer.app;

    // Reposition to new center
    this.animatedSprite.x = app.view.width / 2;
    this.animatedSprite.y = app.view.height / 2;

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

    console.log("[ConfettiManager] Disposed completely");
  }

  /**
   * Check if confetti assets are ready
   * @returns {boolean}
   */
  isReady() {
    return this.textures !== null && this.textures.length > 0;
  }

  /**
   * Get animation duration in milliseconds
   * @returns {number}
   */
  getDuration() {
    return (
      (CONFETTI_SPRITESHEET.frameCount / CONFETTI_SPRITESHEET.frameRate) * 1000
    );
  }
}
