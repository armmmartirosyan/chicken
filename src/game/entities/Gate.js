import { BaseEntity } from "./BaseEntity.js";
import { Sprite } from "pixi.js";

/**
 * Gate - Barrier that stops cars
 * Positioned on a specific lane to block car movement
 */
export class Gate extends BaseEntity {
  constructor(x, y, texture, config = {}) {
    super(x, y);

    this.sprite = null;
    this.scale = config.scale || 0.7;
    this.laneIndex = config.laneIndex || 0;

    // Drop animation state
    this.isAnimating = true;
    this.animationProgress = 0;
    this.animationDuration = 0.2; // 200ms drop animation
    this.startY = y - 200; // Start 400px above final position
    this.targetY = y;

    // Set initial position for animation (start above, then drop down)
    this.y = this.startY;
    this.container.position.y = this.startY;

    if (texture) {
      this.setTexture(texture);
    }
  }

  /**
   * Set the gate texture
   */
  setTexture(texture) {
    if (!this.container) {

      return;
    }

    if (this.sprite) {
      this.sprite.destroy();
    }

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(this.scale);
    this.container.addChild(this.sprite);

    this.width = texture.width * this.scale;
    this.height = texture.height * this.scale;
  }

  /**
   * Get the Y position where cars should stop
   * Note: Car class now handles stop offset internally
   */
  getStopY() {
    // Return gate's Y position - Car.STOP_OFFSET is applied in Car class
    return this.y;
  }

  /**
   * Update gate (with drop animation)
   */
  update(deltaTime) {
    super.update(deltaTime);

    // Handle drop animation
    if (this.isAnimating) {
      this.animationProgress += deltaTime / this.animationDuration;

      if (this.animationProgress >= 1) {
        // Animation complete
        this.animationProgress = 1;
        this.isAnimating = false;
        this.y = this.targetY;
        this.container.position.y = this.y;
      } else {
        // Ease out cubic for smooth deceleration
        const easeProgress = 1 - Math.pow(1 - this.animationProgress, 3);
        this.y = this.startY + (this.targetY - this.startY) * easeProgress;
        this.container.position.y = this.y;
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
    super.destroy();
  }
}
