import { PixiRenderer } from "./PixiRenderer.js";
import { CarSpawner } from "../systems/CarSpawner.js";
import { CoinManager } from "../managers/CoinManager.js";
import { GateManager } from "../managers/GateManager.js";
import { DIFFICULTY_SETTINGS } from "../../config/gameConfig.js";
import { Container, Sprite, Text } from "pixi.js";

/**
 * Game - Main game class that orchestrates all game systems using Pixi.js
 * Manages game state, entities, and hardware-accelerated rendering
 */
export class Game {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.state = "idle"; // idle, playing, paused, gameover

    // Core systems - using Pixi renderer
    this.renderer = new PixiRenderer(canvas, config.renderer || {});
    this.initialized = false;

    // Managers
    this.entityManager = null;
    this.assetManager = null;
    this.inputSystem = null;
    this.carSpawner = null;
    this.coinManager = null;
    this.gateManager = null;

    // Entity references for dynamic updates
    this.road = null;
    this.finishScenery = null;

    // Win notification UI
    this.winDisplay = null;
    this.winNotificationSprite = null;
    this.winHeaderText = null; // "Win!" header
    this.winAmountText = null;
    this.winDisplayTimeout = null;
    this.containerElement = null; // Store container for viewport dimensions

    // Pulse animation for win notification
    this.pulseAnimationActive = false;
    this.pulseAnimationTime = 0;
    this.pulseIntensity = 0.05; // 5% scale growth
    this.pulseSpeed = 4.0; // Calm, rhythmic pulse
  }

  /**
   * Initialize game systems with Pixi
   */
  async initialize(entityManager, assetManager, inputSystem) {
    // Initialize Pixi renderer first
    await this.renderer.initialize();

    this.entityManager = entityManager;
    this.assetManager = assetManager;
    this.inputSystem = inputSystem;

    // Connect EntityManager to Pixi stage
    if (this.entityManager) {
      this.entityManager.setPixiRenderer(this.renderer);
    }

    // Initialize car spawner
    this.carSpawner = new CarSpawner(this.config.carSpawner || {});

    // Initialize coin manager
    this.coinManager = new CoinManager(this.config);

    // Initialize gate manager
    this.gateManager = new GateManager(this.config);

    // NOTE: Win notification will be initialized AFTER textures load in useGame.js
    // This ensures the win-notification texture exists before creating the sprite

    this.initialized = true;
  }

  /**
   * Start the game loop - Pixi uses its own ticker
   * NOTE: Game loop starts, but state remains "idle" until Play button clicked
   */
  start() {
    if (!this.initialized || !this.renderer.app) {
      console.error("Game not initialized");
      return;
    }

    // CRITICAL: Start in "idle" state - wait for Play button
    // Game loop will run and cars will spawn/move, but collision detection is disabled
    this.state = "idle";

    // Disable collisions in idle state (enabled when user clicks play)
    if (this.carSpawner) {
      this.carSpawner.disableCollisions();
    }

    // PERFORMANCE: Remove existing callback first to prevent duplicate tickers (memory leak)
    // Use try-catch since ticker may not have callback registered
    try {
      this.renderer.app.ticker.remove(this.gameLoop, this);
    } catch {
      // Callback wasn't registered yet, that's fine
    }

    // Use Pixi's built-in ticker for optimal performance
    this.renderer.app.ticker.add(this.gameLoop, this);
  }

  /**
   * Pause the game
   */
  pause() {
    if (this.renderer.app) {
      this.renderer.app.ticker.remove(this.gameLoop, this);
    }
    this.state = "paused";
  }

  /**
   * Resume the game
   */
  resume() {
    if (this.state === "paused" && this.renderer.app) {
      this.renderer.app.ticker.add(this.gameLoop, this);
      this.state = "playing";
    }
  }

  /**
   * Reset the game
   */
  reset() {
    if (this.renderer.app && this.renderer.app.ticker) {
      this.renderer.app.ticker.remove(this.gameLoop, this);
    }
    this.state = "idle";

    // Disable collisions when resetting
    if (this.carSpawner) {
      this.carSpawner.disableCollisions();
    }

    // Stop any active animations
    this.pulseAnimationActive = false;
    this.pulseAnimationTime = 0;
  }

  /**
   * Set game state and handle collision detection accordingly
   * @param {string} newState - The new game state (idle, playing, paused, gameover)
   */
  setGameState(newState) {
    this.state = newState;

    // Enable collisions only when playing
    if (this.carSpawner) {
      if (newState === "playing") {
        this.carSpawner.enableCollisions();
      } else {
        this.carSpawner.disableCollisions();
      }
    }
  }

  /**
   * Main game loop - called by Pixi ticker
   * CRITICAL: This must ALWAYS run to render the scene, regardless of game state
   */
  gameLoop(ticker) {
    // Delta time in seconds (Pixi ticker provides delta in frames, convert to seconds)
    const deltaTime = ticker.deltaTime / 60; // 60 FPS baseline

    // ALWAYS update entities for rendering (chicken, road, scenery must be visible in idle state)
    this.update(deltaTime);
    // Pixi handles rendering automatically, no need to call render()
  }

  /**
   * Update game logic
   * CRITICAL: Entities must ALWAYS update for rendering, game systems only update when playing
   */
  update(deltaTime) {
    // ALWAYS update all entities for rendering (chicken, road, scenery visible in all states)
    // This ensures the scene is rendered even in "idle" state
    if (this.entityManager) {
      this.entityManager.update(deltaTime);
    }

    // Update car spawner in ALL states (idle, playing, gameover)
    // Cars spawn and move even before play button is clicked
    // Collision detection is controlled separately via collisionsEnabled flag
    if (this.carSpawner) {
      this.carSpawner.update(deltaTime);
    }

    // Coin and gate systems only update when playing
    if (this.state === "playing") {
      // Update coin manager
      if (this.coinManager) {
        this.coinManager.update(deltaTime);
      }

      // Update gate manager
      if (this.gateManager) {
        this.gateManager.update(deltaTime);
      }
    }

    // Update win notification pulse animation (only when visible)
    if (
      this.pulseAnimationActive &&
      this.winDisplay &&
      this.winDisplay.visible
    ) {
      this.pulseAnimationTime += deltaTime;

      // Calculate scale using sine wave: Scale = 1.0 + sin(time * speed) * intensity
      const scale =
        1.0 +
        Math.sin(this.pulseAnimationTime * this.pulseSpeed) *
          this.pulseIntensity;
      this.winDisplay.scale.set(scale);
    }

    // Update camera to follow chicken (keeps chicken vertically centered)
    if (this.renderer) {
      this.renderer.updateCamera();
    }
  }

  /**
   * Handle chicken death sequence with timing
   * REQUIREMENT: Proper sequence timing
   *   1. Collision detected -> set state to "gameover" (halt game systems)
   *   2. Play death animation and wait for completion
   *   3. Add 1-second visual buffer
   *   4. Trigger reset callback (cleanup and restore state)
   *
   * @param {Function} onComplete - Callback to execute after full death sequence
   * @returns {Promise} - Resolves when death sequence is complete
   */
  async handleChickenDeath(onComplete) {
    // REQUIREMENT: Set state to gameover to halt all game systems and prevent input
    // This is the internal game state - App.jsx gameState is managed separately
    this.state = "gameover";

    // Find chicken entity (look for entity with playDeath method)
    const chicken = this.entityManager
      ? this.entityManager.entities.find(
          (e) => e.playDeath && typeof e.playDeath === "function",
        )
      : null;

    if (!chicken) {
      console.warn("Chicken entity not found for death animation");
      if (onComplete) onComplete();
      return;
    }

    // REQUIREMENT: Play death animation and wait for completion
    await new Promise((resolve) => {
      chicken.playDeath(() => {
        resolve();
      });
    });

    // REQUIREMENT: 1-second buffer delay for visual beat
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Trigger reset callback
    if (onComplete) {
      onComplete();
    }
  }

  /**
   * Get current coin multiplier from CoinManager
   */
  getCurrentMultiplier() {
    if (this.coinManager) {
      return this.coinManager.getCurrentMultiplier();
    }
    return 1.0;
  }

  /**
   * Finish current lane (turn current lane's coin to gold)
   */
  finishCurrentLane() {
    if (this.coinManager) {
      this.coinManager.finishCurrentLane();
    }
  }

  /**
   * Initialize win notification display
   * MUST be called AFTER textures are loaded
   */
  initializeWinDisplay() {
    if (!this.renderer || !this.renderer.app || !this.renderer.uiLayer) {
      console.warn(
        "⚠️ Win display init failed: renderer or uiLayer not available",
      );
      return;
    }

    // Get win notification texture
    const notificationTexture = this.renderer.getTexture("win-notification");
    if (!notificationTexture) {
      console.warn(
        "⚠️ Win notification texture not found - cannot create notification",
      );
      return;
    }

    // Create container for win display
    this.winDisplay = new Container();
    this.winDisplay.visible = false;
    this.winDisplay.zIndex = 2000; // Very high to be on top within UI layer
    this.winDisplay.pivot.set(0, 0); // Set pivot for centered scaling

    // Create notification sprite
    this.winNotificationSprite = new Sprite(notificationTexture);
    this.winNotificationSprite.anchor.set(0.5, 0.5);

    // Create "Win!" header text (PixiJS v8 format) - will be scaled adaptively
    this.winHeaderText = new Text({
      text: "Win!",
      style: {
        fontFamily: "Montserrat, sans-serif",
        fontSize: 21, // Base size - will be scaled (reduced 1.5x)
        fontWeight: "bold",
        fill: "#ffffff",
        dropShadow: {
          color: "#000000",
          blur: 4,
          angle: Math.PI / 4,
          distance: 2,
        },
      },
    });
    this.winHeaderText.anchor.set(0.5, 0.5);

    // Create text for win amount with coin styling (PixiJS v8 format) - will be scaled adaptively
    this.winAmountText = new Text({
      text: "$0.00",
      style: {
        fontFamily: "Montserrat, sans-serif",
        fontSize: 27, // Base size - will be scaled (reduced 1.5x)
        fontWeight: "bold",
        fill: "#ffffff", // Gold color like coins
        dropShadow: {
          color: "#000000",
          blur: 4,
          angle: Math.PI / 4,
          distance: 2,
        },
      },
    });
    this.winAmountText.anchor.set(0.5, 0.5);

    // Add sprite and texts to container
    this.winDisplay.addChild(this.winNotificationSprite);
    this.winDisplay.addChild(this.winHeaderText);
    this.winDisplay.addChild(this.winAmountText);

    // CRITICAL: Add to UI layer (not main stage) so it doesn't scroll with world
    this.renderer.uiLayer.addChild(this.winDisplay);
    this.renderer.uiLayer.sortableChildren = true;

    // Position at top center (will be updated on resize)
    this.positionWinDisplay();
  }

  /**
   * Set container element for viewport calculations
   */
  setContainerElement(container) {
    this.containerElement = container;
  }

  /**
   * Position win display at top center with adaptive scaling
   */
  positionWinDisplay() {
    if (!this.winDisplay || !this.renderer || !this.renderer.app) return;

    // Get the visible viewport dimensions from the container element
    let viewportWidth = 800; // Default fallback
    let viewportHeight = 600; // Default fallback

    if (this.containerElement) {
      viewportWidth = this.containerElement.clientWidth;
      viewportHeight = this.containerElement.clientHeight;
    } else if (this.canvas) {
      // Fallback to canvas parent container
      const parent = this.canvas.parentElement;
      if (parent) {
        viewportWidth = parent.clientWidth;
        viewportHeight = parent.clientHeight;
      }
    }

    // Calculate adaptive scale based on viewport size
    // Make popup smaller for all screens, extra small for mobile
    const scaleX = Math.min(1, viewportWidth / 600);
    const scaleY = Math.min(1, viewportHeight / 400); // Reference height

    // Base scale: 0.333 (reduced 1.5x for all screens)
    // Extra reduction for small screens (< 600px width)
    let sizeMultiplier = 0.333; // 33% of original size (reduced 1.5x from 0.5)
    if (viewportWidth < 600) {
      sizeMultiplier = 0.167; // ~17% for small screens (reduced 1.5x from 0.25)
    } else if (viewportWidth < 900) {
      sizeMultiplier = 0.2; // 20% for medium screens (reduced 1.5x from 0.3)
    }

    const adaptiveScale = Math.min(scaleX, scaleY) * sizeMultiplier;

    // Apply adaptive scale to the entire display
    this.winDisplay.scale.set(adaptiveScale);

    // Get current stage offset (world scrolling)
    const stageX = this.renderer.app.stage.x || 0;

    // Position at center horizontally, and 30% from top vertically (fully inside canvas)
    // This ensures popup is well within the visible area
    this.winDisplay.position.x = -stageX + viewportWidth / 2;
    this.winDisplay.position.y = viewportHeight * 0.2; // 20% from top (lower than before)

    // Position texts within the notification sprite (vertically stacked)
    if (
      this.winHeaderText &&
      this.winAmountText &&
      this.winNotificationSprite
    ) {
      // Header "Win!" above the amount
      this.winHeaderText.position.x = 0;
      this.winHeaderText.position.y = -35; // 20px above center

      // Amount below the header
      this.winAmountText.position.x = 0;
      this.winAmountText.position.y = 30; // 15px below center
    }
  }

  /**
   * Show win notification with amount
   * @param {number} amount - Win amount to display
   * @param {number} duration - Duration in milliseconds (3000 for auto-win, 2000 for cashout)
   */
  showWinNotification(amount, duration = 3000) {
    if (!this.winDisplay || !this.winAmountText) {
      console.warn("⚠️ Win display not initialized - cannot show notification");
      return;
    }

    // Clear any existing timeout
    if (this.winDisplayTimeout) {
      clearTimeout(this.winDisplayTimeout);
      this.winDisplayTimeout = null;
    }

    // Round amount using currency helper to prevent floating point artifacts
    const roundedAmount = Math.round(amount * 100) / 100;

    // Update text with win amount
    this.winAmountText.text = `$${roundedAmount.toFixed(2)}`;

    // Re-position in case screen was resized
    this.positionWinDisplay();

    // Reset scale and start pulse animation
    this.winDisplay.scale.set(1.0);
    this.pulseAnimationActive = true;
    this.pulseAnimationTime = 0;

    // Show display
    this.winDisplay.visible = true;

    // Hide after duration
    this.winDisplayTimeout = setTimeout(() => {
      this.hideWinNotification();
    }, duration);
  }

  /**
   * Hide win notification
   */
  hideWinNotification() {
    if (this.winDisplay) {
      this.winDisplay.visible = false;
      // Reset scale to avoid ghost animations
      this.winDisplay.scale.set(1.0);
    }
    if (this.winDisplayTimeout) {
      clearTimeout(this.winDisplayTimeout);
      this.winDisplayTimeout = null;
    }
  }

  /**
   * Set entity references for dynamic updates
   */
  setEntityReferences(road, finishScenery) {
    this.road = road;
    this.finishScenery = finishScenery;
  }

  /**
   * Update game difficulty and recreate coins
   */
  updateDifficulty(newDifficulty, newConfig, startWidth) {
    if (!this.initialized) {
      console.warn("Cannot update difficulty: game not initialized");
      return;
    }

    try {
      // 1. Update road lane count
      if (this.road) {
        this.road.updateLaneCount(newConfig.laneCount);
      }

      // 2. Update finish scenery position
      if (this.finishScenery && startWidth !== undefined) {
        const newRoadWidth = newConfig.laneWidth * newConfig.laneCount;
        this.finishScenery.x = startWidth + newRoadWidth;
      }

      // 3. Update car spawner lanes and difficulty settings
      if (this.carSpawner && this.road) {
        this.carSpawner.updateLaneCount(this.road);

        // Get difficulty settings and update car spawner
        const difficultySettings =
          DIFFICULTY_SETTINGS[newDifficulty] || DIFFICULTY_SETTINGS.Easy;
        this.carSpawner.updateDifficulty(newDifficulty, difficultySettings);
      }

      // 4. Clear and reset gate manager
      if (this.gateManager) {
        this.gateManager.destroy();
      }

      // 5. Update coin manager
      if (this.coinManager) {
        this.coinManager.updateDifficulty(newDifficulty);
      }
    } catch (error) {
      console.error("Error updating difficulty:", error);
    }
  }

  /**
   * Reset game to initial state (for new game)
   */
  resetGame() {
    if (!this.initialized) {
      console.warn("Cannot reset game: game not initialized");
      return;
    }

    // CRITICAL: Keep game in "idle" state - wait for Play button to start
    // The Play button handler will set state to "playing"
    this.state = "idle";

    // Hide win notification if it's showing
    this.hideWinNotification();

    // Reset coin manager
    if (this.coinManager) {
      try {
        this.coinManager.reset();
      } catch (error) {
        console.error("Error resetting coins:", error);
      }
    }

    // Reset gate manager
    if (this.gateManager) {
      try {
        this.gateManager.destroy();
      } catch (error) {
        console.error("Error resetting gates:", error);
      }
    }

    // Reset car spawner - REQUIREMENT: Remove all active cars and reset state
    if (this.carSpawner) {
      try {
        this.carSpawner.reset();
      } catch (error) {
        console.error("Error resetting car spawner:", error);
      }
    }
  }

  /**
   * Resize canvas - sets internal rendering resolution
   */
  resize(width, height) {
    if (this.renderer) {
      this.renderer.resize(width, height);
    }
    // Reposition win display after resize
    this.positionWinDisplay();
  }

  /**
   * Update viewport scaling - handles window/container resize
   */
  updateViewport(viewportWidth, viewportHeight) {
    if (this.renderer) {
      this.renderer.updateViewport(viewportWidth, viewportHeight);
    }
    // Reposition win display after viewport change
    this.positionWinDisplay();
  }

  /**
   * Destroy game and cleanup resources
   */
  destroy() {
    // Stop game first
    this.state = "idle";

    // Clear win display timeout
    if (this.winDisplayTimeout) {
      clearTimeout(this.winDisplayTimeout);
      this.winDisplayTimeout = null;
    }

    // Remove ticker callback safely
    if (this.renderer && this.renderer.app && this.renderer.app.ticker) {
      try {
        this.renderer.app.ticker.remove(this.gameLoop, this);
      } catch {
        // Ticker might already be destroyed
      }
    }

    if (this.inputSystem) {
      this.inputSystem.destroy();
    }

    if (this.carSpawner) {
      this.carSpawner.cleanup();
    }

    if (this.coinManager) {
      this.coinManager.cleanup();
    }

    if (this.gateManager) {
      this.gateManager.destroy();
    }

    if (this.entityManager) {
      this.entityManager.clear();
    }

    if (this.renderer) {
      this.renderer.destroy();
    }

    this.initialized = false;
  }
}
