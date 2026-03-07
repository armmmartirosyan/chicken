import { ConfettiManager } from "./ConfettiManager.js";
import { CashoutVFXManager } from "./CashoutVFXManager.js";
import { gameEvents } from "../core/GameEventBus.js";

/**
 * VFXManager - Coordinates celebration and cashout VFX
 *
 * Orchestrates ConfettiManager and CashoutVFXManager
 * with parallel asset loading and centralized control.
 *
 * Architecture:
 * - Uses Promise.all to load all VFX spritesheets simultaneously
 * - ConfettiManager: Auto-trigger on gameComplete
 * - CashoutVFXManager: Manual trigger from handleCashout with completion callback
 *
 * Layering:
 * - Confetti: z-index 999 (background, fullscreen)
 * - Cashout: z-index 800 (above gameplay, centered on chicken)
 * - React UI: Top layer (dialogs, win amounts)
 */
export class VFXManager {
  constructor(config, pixiRenderer, audioEngine) {
    // Dependencies
    this.config = config;
    this.pixiRenderer = pixiRenderer;
    this.audioEngine = audioEngine;

    // Manager instances
    this.confettiManager = null;
    this.cashoutVFXManager = null;

    // Initialization state
    this.initialized = false;

    // Event handler references (for cleanup)
    this.boundCelebrationHandler = this.onGameComplete.bind(this);
  }

  /**
   * Initialize both VFX managers in parallel
   * Uses Promise.all for simultaneous asset loading
   *
   * @param {HTMLElement} containerElement - Parent element for viewport dimensions
   * @returns {Promise<Object>} Status of both managers
   */
  async initialize(containerElement) {
    // Create manager instances
    this.confettiManager = new ConfettiManager(
      this.config,
      this.pixiRenderer,
      this.audioEngine,
    );
    this.cashoutVFXManager = new CashoutVFXManager(
      this.config,
      this.pixiRenderer,
    );

    try {
      // Load all VFX systems in parallel using Promise.all
      const [confettiSuccess, cashoutSuccess] = await Promise.all([
        this.confettiManager.initialize(containerElement),
        this.cashoutVFXManager.initialize(containerElement),
      ]);

      this.initialized = true;

      // Log initialization status
      const status = {
        confetti: confettiSuccess,
        cashout: cashoutSuccess,
        allReady: confettiSuccess && cashoutSuccess,
      };

      return status;
    } catch (error) {
      return {
        confetti: false,
        cashout: false,
        allReady: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle game completion event
   * Triggers both VFX managers to play simultaneously
   *
   * Note: Individual managers listen to gameComplete independently,
   * but VFXManager can add coordination logic here if needed.
   *
   * @param {Object} eventData - Game completion data
   */
  onGameComplete(eventData) {
    // Both managers listen to gameComplete event independently
    // This allows them to trigger simultaneously without sequential delays

    // Optional: Add custom coordination logic here if needed
    // For example: delay one VFX, or add custom event emissions

    gameEvents.emit("celebrationTriggered", {
      timestamp: Date.now(),
      ...eventData,
    });
  }

  /**
   * Manually trigger celebration (bypass gameComplete event)
   * Useful for testing or special scenarios
   */
  playCelebration() {
    if (!this.initialized) {
      return;
    }

    // Trigger confetti manager manually
    if (this.confettiManager) {
      this.confettiManager.play();
    }
  }

  /**
   * Trigger cashout animation with completion callback
   * Used by handleCashout to show animation before React dialog
   *
   * @param {Function} onComplete - Callback when animation finishes
   */
  playCashoutAnimation(onComplete) {
    if (!this.initialized || !this.cashoutVFXManager) {
      // Immediately call completion if animation unavailable
      if (onComplete) onComplete();
      return;
    }

    // Play cashout animation with completion callback
    this.cashoutVFXManager.play(onComplete);
  }

  /**
   * Stop all currently playing celebrations
   * Useful for interrupting celebrations (e.g., user closes modal)
   */
  stopCelebration() {
    if (this.confettiManager) {
      this.confettiManager.destroy();
    }

    if (this.cashoutVFXManager) {
      this.cashoutVFXManager.destroy();
    }
  }

  /**
   * Complete cleanup - dispose both managers
   * Call when shutting down game or VFXManager no longer needed
   */
  dispose() {
    // Dispose individual managers
    if (this.confettiManager) {
      this.confettiManager.dispose();
      this.confettiManager = null;
    }

    if (this.cashoutVFXManager) {
      this.cashoutVFXManager.dispose();
      this.cashoutVFXManager = null;
    }

    // Remove event listeners
    gameEvents.off("gameComplete", this.boundCelebrationHandler);

    this.initialized = false;
  }
}
