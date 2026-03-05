import { BaseEntity } from "./BaseEntity.js";
import { Sprite, Text } from "pixi.js";

/**
 * Coin - Collectible coin entity with number display
 * Shows silver coin by default, turns gold when lane is passed
 */
export class Coin extends BaseEntity {
  constructor(x, y, config) {
    super(x, y);

    this.laneIndex = config.laneIndex || 0;
    this.multiplier = config.multiplier || 1.01; // For display on coin
    this.value = config.value || 1.01; // For actual win amount
    this.isCollected = false;
    this.isGold = false;
    this.laneWidth = config.laneWidth || 252; // Store lane width for dynamic scaling

    this.sprite = null;
    this.text = null;

    this.width = 144; // Base size (will be overridden by dynamic scaling)
    this.height = 144; // Base size (will be overridden by dynamic scaling)

    // Flip animation state
    this.isFlipping = false;
    this.flipProgress = 0;
    this.flipDuration = 0.4; // 400ms flip animation (match jump duration)
  }

  /**
   * Set the coin sprite textures
   */
  setTextures(silverTexture, goldTexture) {
    if (!this.container) {
      console.warn("Cannot set textures: container is null");
      return;
    }

    this.silverTexture = silverTexture;
    this.goldTexture = goldTexture;

    // Create sprite with silver texture initially
    this.sprite = new Sprite(silverTexture);
    this.sprite.anchor.set(0.5);

    // Dynamic scaling: fill lane width with 20px total padding (10px each side)
    const targetSize = this.laneWidth - 80;
    const textureWidth = silverTexture.width;
    const dynamicScale = targetSize / textureWidth;

    this.sprite.scale.set(dynamicScale);
    this.width = targetSize;
    this.height = targetSize;

    this.container.addChild(this.sprite);

    // Create text label showing multiplier with smart formatting
    let displayText;
    if (this.multiplier >= 100) {
      displayText = this.multiplier.toFixed(0) + "x";
    } else if (this.multiplier >= 10) {
      displayText = this.multiplier.toFixed(1) + "x";
    } else {
      displayText = this.multiplier.toFixed(2) + "x";
    }

    this.text = new Text({
      text: displayText,
      style: {
        fontFamily: "Arial",
        fontSize: 40, // Scaled by 2x for better legibility (24 * 2)
        fontWeight: "bold",
        fill: "#ffffff",
        stroke: { color: "#000000", width: 4 },
        dropShadow: {
          alpha: 0.7,
          angle: Math.PI / 4,
          blur: 4,
          color: "#000000",
          distance: 5,
        },
      },
    });
    this.text.anchor.set(0.5, 0.5); // Perfectly centered
    this.text.x = 0;
    this.text.y = 0;

    this.container.addChild(this.text);
  }

  /**
   * Turn coin to gold with flip animation
   */
  turnGold() {
    if (this.isGold || !this.sprite || !this.goldTexture) return;

    // Start flip animation
    this.isFlipping = true;
    this.flipProgress = 0;

    // Gold conversion will happen at 50% of flip (when coin is edge-on)
    setTimeout(() => {
      if (this.sprite && !this.isGold) {
        this.isGold = true;
        this.sprite.texture = this.goldTexture;

        // Hide the number text on gold coins
        if (this.text) {
          this.text.visible = false;
        }
      }
    }, this.flipDuration * 500); // 50% of flip duration
  }

  /**
   * Show or hide the coin with flip animation when hiding
   */
  setVisible(visible) {
    const wasVisible = this.visible;
    this.visible = visible;

    if (this.container) {
      // If hiding coin (collected), start flip animation
      if (wasVisible && !visible && !this.isGold) {
        this.isFlipping = true;
        this.flipProgress = 0;

        // Hide coin after flip animation completes
        setTimeout(() => {
          if (this.container) {
            this.container.visible = false;
          }
        }, this.flipDuration * 1000);
      } else {
        // Show immediately or if already gold
        this.container.visible = visible;
      }
    }
  }

  /**
   * Update coin state with flip animation
   */
  update(deltaTime) {
    super.update(deltaTime);

    // Handle flip animation
    if (this.isFlipping && this.container) {
      this.flipProgress += deltaTime / this.flipDuration;

      if (this.flipProgress >= 1) {
        // Animation complete
        this.flipProgress = 1;
        this.isFlipping = false;
        this.container.scale.x = Math.abs(this.container.scale.x); // Ensure positive scale
      } else {
        // Animate flip: scale X from 1 to 0 to 1 (creates flip effect)
        // Use cosine for smooth flip
        const flipScale = Math.abs(Math.cos(this.flipProgress * Math.PI));
        const currentScaleY = this.container.scale.y;
        this.container.scale.set(
          flipScale > 0 ? flipScale : 0.01,
          currentScaleY,
        );
      }
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    if (this.text) {
      this.text.destroy();
      this.text = null;
    }
    super.destroy();
  }
}
