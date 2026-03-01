import { BaseEntity } from "./BaseEntity.js";
import { Sprite } from "pixi.js";
import { audioEngine } from "../../services/AudioEngine.js";

/**
 * Car - Vehicle obstacle entity using Pixi sprites
 * Handles car rendering, movement, and lifecycle with hardware acceleration
 */
export class Car extends BaseEntity {
  // Gate stopping configuration
  static STOP_OFFSET = 250; // Distance (in px) to stop above the gate

  constructor(x, y, config) {
    super(x, y);

    this.config = config;
    this.lane = config.lane || 0;
    this.speed = config.speed || 1500; // pixels per second (moving down)
    this.carType = config.carType || "truck"; // truck, car, etc.
    this.roadBottomY = config.roadBottomY || 1000; // Bottom boundary for offscreen detection
    this.gate = config.gate || null; // Gate reference for stopping
    this.isStopped = false; // Track if car is stopped at gate

    this.width = 196;
    this.height = 98; // Will be recalculated based on image aspect ratio

    this.sprite = null;
    this.isOffscreen = false;

    // For object pooling
    this.inUse = true;
    this.active = true;
  }

  /**
   * Set the car sprite texture and calculate height to maintain aspect ratio
   */
  setTexture(texture) {
    // Guard against destroyed container
    if (!this.container) {
      console.warn("Cannot set texture: container is null");
      return;
    }

    if (this.sprite) {
      this.sprite.destroy();
    }

    this.sprite = new Sprite(texture);

    // Set anchor to center
    this.sprite.anchor.set(0.5);

    // Calculate height to maintain texture aspect ratio (prevent distortion)
    if (texture && texture.width > 0 && texture.height > 0) {
      const aspectRatio = texture.height / texture.width;
      this.height = this.width * aspectRatio;
    }

    // Set sprite size
    this.sprite.width = this.width;
    this.sprite.height = this.height;

    this.container.addChild(this.sprite);
  }

  /**
   * Reset car for object pool reuse
   */
  reset(x, y, config) {
    this.x = x;
    this.y = y;
    this.lane = config.lane || 0;
    this.speed = config.speed || 1500;
    this.carType = config.carType || "truck";
    this.roadBottomY = config.roadBottomY || 1000;
    this.gate = config.gate || null;
    this.isStopped = false;
    this.active = true;
    this.isOffscreen = false;
    this.inUse = true;

    // Guard against null container
    if (this.container) {
      this.container.position.set(x, y);
      this.container.renderable = true; // Use renderable instead of visible for better performance
      this.container.cullable = false; // Disable automatic culling

      // CRITICAL: Ensure container bounds are not cached (they update as car moves)
      this.container.cacheAsTexture = false; // Updated from deprecated cacheAsBitmap

      // Set explicit bounds to prevent clipping (use very large bounds)
      this.container.filterArea = null; // No filter area restriction
    }
  }

  /**
   * Update car position
   */
  update(deltaTime) {
    super.update(deltaTime);

    if (!this.active) return;

    // Don't move if already stopped at gate
    if (this.isStopped) {
      return;
    }

    // REQUIREMENT: Check if car should stop at gate BEFORE moving
    // Gate interaction with "point of no return" logic
    if (this.gate && this.gate.active && this.lane === this.gate.laneIndex) {
      const gateY = this.gate.y;
      const stopY = gateY - Car.STOP_OFFSET; // Stop 250px above gate

      // Get car's front position (bottom edge, since car moves downward)
      const carFrontY = this.y + this.height / 2;

      // REQUIREMENT: "Point of No Return" - If car's front has already passed the gate,
      // do not stop, continue at full speed
      if (carFrontY < gateY) {
        // Car hasn't reached the gate yet, check if it should stop
        const nextY = this.y + this.speed * deltaTime;
        const nextFrontY = nextY + this.height / 2;

        // If next position would reach or pass the stop point, stop there
        if (nextFrontY >= stopY + this.height / 2) {
          this.y = stopY;
          this.isStopped = true;

          // Play crash sound when car stops at gate
          audioEngine.onCrash();

          return; // Don't move further
        }
      }
    }

    // Move car downward along the lane
    this.y += this.speed * deltaTime;

    // Check if car has moved off the bottom of the screen
    if (this.y > this.roadBottomY + 200) {
      this.isOffscreen = true;
    }
  }

  /**
   * Release car back to pool (use renderable for better performance)
   */
  release() {
    this.inUse = false;
    this.active = false;
    this.isStopped = false; // Reset stopped state
    if (this.container) {
      this.container.renderable = false; // Better than visible = false for performance
    }
  }

  /**
   * Check collision with another entity (for future use)
   */
  checkCollision(entity) {
    const bounds = this.getBounds();
    const otherBounds = entity.getBounds();

    return (
      bounds.x < otherBounds.x + otherBounds.width &&
      bounds.x + bounds.width > otherBounds.x &&
      bounds.y < otherBounds.y + otherBounds.height &&
      bounds.y + bounds.height > otherBounds.y
    );
  }

  /**
   * Check if car is visible in viewport (for optimized cleanup)
   */
  isInViewport(scrollX, scrollY, viewportWidth, viewportHeight) {
    // Use World Space bounds for accurate viewport detection
    // Cars should only be cleaned up when they're truly offscreen
    const worldBounds = this.container
      ? this.container.getBounds()
      : this.getBounds();

    // Large buffer to prevent premature cleanup (especially important for horizontal scrolling)
    const buffer = 1000;

    // Check if car is within extended viewport bounds
    const inViewportX =
      worldBounds.x + worldBounds.width > scrollX - buffer &&
      worldBounds.x < scrollX + viewportWidth + buffer;

    const inViewportY =
      worldBounds.y + worldBounds.height > scrollY - buffer &&
      worldBounds.y < scrollY + viewportHeight + buffer;

    return inViewportX && inViewportY;
  }

  /**
   * Get actual bounds (accounting for centered position)
   */
  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
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
