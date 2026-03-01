import { BaseEntity } from "./BaseEntity.js";
import { Graphics } from "pixi.js";

/**
 * Road - Represents the road with lanes using Pixi graphics
 * Handles road rendering with hardware acceleration
 */
export class Road extends BaseEntity {
  constructor(x, y, config) {
    super(x, y);

    this.laneWidth = config.laneWidth || 300;
    this.laneCount = config.laneCount || 30;
    this.height = config.roadHeight || 600;
    this.width = this.laneWidth * this.laneCount;

    this.backgroundColor = this.hexToNumber(config.roadColor || "#716c69");
    this.lineColor = this.hexToNumber(config.lineColor || "#ffffff");
    this.lineWidth = config.roadLineWidth || 5;
    this.dashPattern = config.dashPattern || [40, 40];

    // Create road graphics
    this.graphics = new Graphics();

    // Guard against null container
    if (this.container) {
      this.container.addChild(this.graphics);
      this.drawRoad();

      // PERFORMANCE: Cache as texture since road is static (PixiJS v8)
      // This treats the entire road as a single texture, dramatically improving FPS
      this.container.cacheAsTexture = true;
    }
  }

  /**
   * Convert hex color string to number
   */
  hexToNumber(hex) {
    return parseInt(hex.replace("#", ""), 16);
  }

  /**
   * Draw the road using Pixi graphics
   */
  drawRoad() {
    if (!this.graphics) return;

    this.graphics.clear();

    // Draw road background
    this.graphics.rect(0, 0, this.width, this.height);
    this.graphics.fill(this.backgroundColor);

    // Draw lane dividers with dashed lines
    const dashLength = this.dashPattern[0];
    const gapLength = this.dashPattern[1];
    const totalDashCycle = dashLength + gapLength;

    for (let i = 1; i < this.laneCount; i++) {
      const laneX = i * this.laneWidth;

      // Draw dashed lines manually
      let currentY = 0;
      while (currentY < this.height) {
        const dashEndY = Math.min(currentY + dashLength, this.height);

        this.graphics.moveTo(laneX, currentY);
        this.graphics.lineTo(laneX, dashEndY);
        this.graphics.stroke({ width: this.lineWidth, color: this.lineColor });

        currentY += totalDashCycle;
      }
    }
  }

  /**
   * Road doesn't need updates
   */
  update(deltaTime) {
    super.update(deltaTime);
    // Static entity
    void deltaTime;
  }

  /**
   * Get lane index at x position
   */
  getLaneAtPosition(x) {
    const relativeX = x - this.x;
    if (relativeX < 0 || relativeX > this.width) {
      return -1;
    }
    return Math.floor(relativeX / this.laneWidth);
  }

  /**
   * Update road with new lane count
   */
  updateLaneCount(newLaneCount) {
    this.laneCount = newLaneCount;
    this.width = this.laneWidth * this.laneCount;

    // Temporarily disable cache while redrawing (PixiJS v8)
    if (this.container) {
      this.container.cacheAsTexture = false;
    }

    this.drawRoad();

    // Re-enable cache after redrawing (PixiJS v8)
    if (this.container) {
      this.container.cacheAsTexture = true;
    }
  }

  /**
   * Get x position of lane center
   */
  getLaneCenter(laneIndex) {
    if (laneIndex < 0 || laneIndex >= this.laneCount) {
      return null;
    }
    return this.x + (laneIndex + 0.5) * this.laneWidth;
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    super.destroy();
  }
}
