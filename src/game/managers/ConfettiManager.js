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


      return true;
    } catch (error) {

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

      return;
    }


    this.isPlaying = true;

    // Create AnimatedSprite from texture array
    this.animatedSprite = new AnimatedSprite(this.textures);

    // Configure animation
    this.animatedSprite.anchor.set(0.5); // Center origin for perfect centering
    this.animatedSprite.loop = false; // Play once
    this.animatedSprite.animationSpeed = CONFETTI_SPRITESHEET.frameRate / 60; // Convert FPS to speed (28/60 = 0.467)

    // Position at absolute screen center (DPI-safe coordinates)
    const app = this.pixiRenderer.app;
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    this.animatedSprite.position.set(centerX, centerY);

    // Scale to fill viewport (cover screen on all devices)
    this.scaleToViewport();

    // Set z-index (highest layer)
    this.animatedSprite.zIndex = 999;

    // Add to uiLayer (screen-space, not world-space)
    const uiLayer = this.pixiRenderer.uiLayer || app.stage;
    uiLayer.addChild(this.animatedSprite);
    uiLayer.sortableChildren = true; // Enable z-index sorting

    // Start animation
    this.animatedSprite.gotoAndPlay(0);

    // Play audio
    this.playAudio();

    // Register completion handler
    this.animatedSprite.onComplete = () => {

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

    }
  }

  /**
   * Scale sprite to fill viewport (cover screen)
   * Called on play() and resize events
   */
  scaleToViewport() {
    if (!this.animatedSprite || !this.pixiRenderer.app) return;

    const app = this.pixiRenderer.app;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Calculate scale to cover screen (scale-to-fill)
    const frame = this.animatedSprite.texture;
    if (frame && frame.width && frame.height) {
      const scaleX = screenWidth / frame.width;
      const scaleY = screenHeight / frame.height;
      const finalScale = Math.max(scaleX, scaleY); // Cover the screen
      this.animatedSprite.scale.set(finalScale);
    } else {
      // Fallback: stretch to fill
      this.animatedSprite.width = screenWidth;
      this.animatedSprite.height = screenHeight;
    }
  }

  /**
   * Handle viewport resize during playback
   * Repositions and rescales sprite to maintain fullscreen coverage
   */
  onResize() {
    if (!this.isPlaying || !this.animatedSprite) return;



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
