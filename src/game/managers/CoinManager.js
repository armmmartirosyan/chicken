import { Coin } from "../entities/Coin.js";
import {
  FIXED_WIN_VALUES,
  FIXED_MULTIPLIERS,
} from "../../config/gameConfig.js";
import { gameEvents } from "../core/GameEventBus.js";

/**
 * CoinManager - Manages all coins across lanes
 * Handles coin creation, visibility, and state updates
 * Emits lane:changed events for FSM state transitions
 */
export class CoinManager {
  constructor(config) {
    this.config = config;
    this.pixiRenderer = null;
    this.road = null;
    this.chicken = null;
    this.entityManager = null;

    this.coins = []; // All coins indexed by lane
    this.currentLaneIndex = -1; // Current lane the chicken is on (-1 means not on road yet)
    this.highestPassedLane = -1; // Highest lane index the chicken has passed

    this.silverTexture = null;
    this.goldTexture = null;

    // Use hard-coded win values for payouts (6 lanes)
    this.coinWinValues = FIXED_WIN_VALUES;
    // Use hard-coded multipliers for coin display
    this.coinMultipliers = FIXED_MULTIPLIERS;
  }

  /**
   * Initialize the coin manager
   */
  initialize(entityManager, pixiRenderer, road, chicken) {
    this.entityManager = entityManager;
    this.pixiRenderer = pixiRenderer;
    this.road = road;
    this.chicken = chicken;

    // Load textures
    this.silverTexture = this.pixiRenderer.getTexture("coin");
    this.goldTexture = this.pixiRenderer.getTexture("coin-gold");

    if (!this.silverTexture || !this.goldTexture) {

      return;
    }

    // Create coins for all lanes
    this.createCoins();
  }

  /**
   * Create one coin per lane (up to the number of multipliers available)
   */
  createCoins() {
    const laneCount = this.road.laneCount;
    const laneWidth = this.road.laneWidth;

    // Position coins 50px above chicken's Y level (where chicken will jump)
    const coinY = this.chicken.y - 50;

    // Only create as many coins as we have win values
    const coinsToCreate = Math.min(laneCount, this.coinWinValues.length);

    for (let i = 0; i < coinsToCreate; i++) {
      // Calculate coin position (center of lane)
      const coinX = this.road.x + (i + 0.5) * laneWidth;

      // Get multiplier for display and win value for payout
      const multiplier = this.coinMultipliers[i];
      const winValue = this.coinWinValues[i];

      // Create coin
      const coin = new Coin(coinX, coinY, {
        laneIndex: i,
        multiplier: multiplier, // For display on coin
        value: winValue, // For actual win amount
        laneWidth: laneWidth, // Pass lane width for dynamic scaling
      });

      coin.setTextures(this.silverTexture, this.goldTexture);

      // Add to entity manager stage
      if (this.entityManager && this.entityManager.stage && coin.container) {
        this.entityManager.stage.addChild(coin.container);
        // Ensure coin is visible
        coin.container.visible = true;
        coin.container.zIndex = 80; // Above chicken (80) to ensure coins are always visible
      }

      this.coins.push(coin);
    }

    // Sort stage children by zIndex
    if (this.entityManager && this.entityManager.stage) {
      this.entityManager.stage.sortableChildren = true;
    }

    // Set initial coin opacity (all coins start at 0.5 opacity before game starts)
    this.updateCoinVisibility();
  }

  /**
   * Update coin manager state
   */
  update(deltaTime) {
    if (!this.chicken || !this.road) return;

    // Calculate current lane based on chicken position
    const chickenLaneIndex = this.road.getLaneAtPosition(this.chicken.x);

    if (chickenLaneIndex !== this.currentLaneIndex) {
      // Chicken moved to a new lane (or position changed)
      if (chickenLaneIndex !== -1) {
        this.onLaneChanged(chickenLaneIndex);
      } else {
        // Chicken is not on the road (might be on start scenery)
        if (this.currentLaneIndex !== -1) {
          this.currentLaneIndex = -1;
        }
      }
    }

    // Update visibility of coins
    this.updateCoinVisibility();

    // Update all coins
    for (const coin of this.coins) {
      if (coin.active) {
        coin.update(deltaTime);
      }
    }
  }

  /**
   * Handle lane change
   */
  onLaneChanged(newLaneIndex) {
    const oldLaneIndex = this.currentLaneIndex;
    this.currentLaneIndex = newLaneIndex;

    // Emit lane:changed event for FSM state transitions
    gameEvents.emit("lane:changed", {
      laneIndex: newLaneIndex,
      oldLaneIndex: oldLaneIndex,
    });

    // If chicken moved forward (to a higher lane index)
    if (newLaneIndex > this.highestPassedLane) {
      // Turn all coins from 0 to oldLaneIndex to gold
      for (let i = 0; i <= oldLaneIndex; i++) {
        if (i < this.coins.length) {
          this.coins[i].turnGold();
        }
      }

      // Update highest passed lane
      this.highestPassedLane = oldLaneIndex;
    }
  }

  /**
   * Update coin visibility and opacity based on chicken position
   */
  updateCoinVisibility() {
    // Next available coin is currentLaneIndex + 1 (or 0 if not on road yet)
    const nextAvailableCoin = this.currentLaneIndex + 1;

    for (let i = 0; i < this.coins.length; i++) {
      const coin = this.coins[i];

      // Hide coin on current lane, show all others
      // If currentLaneIndex is -1 (not on road), show all coins
      if (this.currentLaneIndex !== -1 && i === this.currentLaneIndex) {
        coin.setVisible(false);
      } else {
        coin.setVisible(true);

        // Set opacity: next available coin = 1.0 (only during gameplay), all others = 0.5
        if (coin.sprite) {
          if (coin.isGold) {
            // Gold coins always full opacity
            coin.sprite.alpha = 1.0;
            if (coin.text) coin.text.alpha = 1.0;
          } else if (i === nextAvailableCoin && this.currentLaneIndex >= 0) {
            // Next available coin full opacity (only when game is active)
            coin.sprite.alpha = 1.0;
            if (coin.text) coin.text.alpha = 1.0;
          } else {
            // All other silver coins reduced opacity (including initial state)
            coin.sprite.alpha = 0.5;
            if (coin.text) coin.text.alpha = 0.5;
          }
        }
      }
    }
  }

  /**
   * Get total collected value (sum of gold coins)
   */
  getCollectedValue() {
    let total = 0;
    for (const coin of this.coins) {
      if (coin.isGold) {
        total += coin.value;
      }
    }
    return total;
  }

  /**
   * Get the current win value (based on current lane position)
   * Returns the euro amount for cashout button and win notification
   */
  getCurrentMultiplier() {
    // Use currentLaneIndex if chicken is on a valid lane, otherwise use highestPassedLane
    const laneIndex =
      this.currentLaneIndex >= 0
        ? this.currentLaneIndex
        : this.highestPassedLane;

    if (laneIndex >= 0 && laneIndex < this.coins.length) {
      return this.coins[laneIndex].value;
    }
    return 0; // Default to 0 if no coins passed
  }

  /**
   * Get the current display multiplier (based on current lane position)
   * Returns the multiplier value for tooltip display (e.g., 2.21, 9.09)
   */
  getCurrentDisplayMultiplier() {
    // Use currentLaneIndex if chicken is on a valid lane, otherwise use highestPassedLane
    const laneIndex =
      this.currentLaneIndex >= 0
        ? this.currentLaneIndex
        : this.highestPassedLane;

    if (laneIndex >= 0 && laneIndex < this.coins.length) {
      return this.coins[laneIndex].multiplier;
    }
    return 0.0; // Default to 0.0x if no coins passed
  }

  /**
   * Turn current lane's coin to gold (called when game ends or cashout)
   * CRITICAL: When chicken reaches finish line, currentLaneIndex becomes -1
   * In this case, we need to turn the last coin (highestPassedLane + 1) to gold
   */
  finishCurrentLane() {
    let targetLaneIndex = this.currentLaneIndex;

    // If chicken is off the road (at finish line), use the next coin after highest passed
    if (targetLaneIndex === -1 && this.highestPassedLane >= 0) {
      targetLaneIndex = this.highestPassedLane + 1;
    }

    // If we still don't have a valid lane but have coins, use the last coin
    if (targetLaneIndex === -1 && this.coins.length > 0) {
      targetLaneIndex = this.coins.length - 1;
    }

    if (targetLaneIndex >= 0 && targetLaneIndex < this.coins.length) {
      // Turn target coin to gold
      this.coins[targetLaneIndex].turnGold();

      // Update highest passed lane to include this coin
      if (targetLaneIndex > this.highestPassedLane) {
        this.highestPassedLane = targetLaneIndex;
      }
    }
  }

  /**
   * Reset all coins to silver and restore default opacity
   */
  reset() {
    this.currentLaneIndex = -1;
    this.highestPassedLane = -1;

    for (const coin of this.coins) {
      coin.isGold = false;
      if (coin.sprite && coin.silverTexture) {
        coin.sprite.texture = coin.silverTexture;
      }
      // Show text on silver coins
      if (coin.text) {
        coin.text.visible = true;
      }
      coin.setVisible(true);

      // Reset opacity to default (will be updated by updateCoinVisibility)
      if (coin.sprite) {
        coin.sprite.alpha = 1.0;
      }
      if (coin.text) {
        coin.text.alpha = 1.0;
      }
    }

    // Update visibility and opacity based on reset state
    this.updateCoinVisibility();
  }

  /**
   * Clean up all coins
   */
  cleanup() {
    for (const coin of this.coins) {
      if (coin.container && this.entityManager && this.entityManager.stage) {
        try {
          if (coin.container.parent === this.entityManager.stage) {
            this.entityManager.stage.removeChild(coin.container);
          }
        } catch {
          // Container might already be removed
        }
      }
      coin.destroy();
    }
    this.coins = [];
  }
}
