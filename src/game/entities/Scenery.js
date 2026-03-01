import { BaseEntity } from "./BaseEntity.js";
import { Sprite, Texture, Rectangle } from "pixi.js";

/**
 * Scenery - Represents start and finish images using Pixi sprites
 * Handles scenery rendering with hardware acceleration
 */
export class Scenery extends BaseEntity {
  constructor(x, y, type, texture = null, scale = 1, clipRect = null) {
    super(x, y);

    this.type = type; // 'start' or 'finish'
    this.sprite = null;
    this.scale = scale;
    this.clipRect = clipRect; // Optional Rectangle for texture clipping

    if (texture) {
      this.setTexture(texture);
    }
  }

  /**
   * Set the scenery texture (Pixi texture)
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

    // Create clipped texture if clipRect is specified
    let displayTexture = texture;
    if (this.clipRect) {
      displayTexture = new Texture({
        source: texture.source,
        frame: this.clipRect,
      });
    }

    this.sprite = new Sprite(displayTexture);
    this.sprite.position.set(0, 0);
    this.sprite.scale.set(this.scale);
    this.container.addChild(this.sprite);

    this.width = displayTexture.width * this.scale;
    this.height = displayTexture.height * this.scale;

    // PERFORMANCE: Cache scenery as texture since it's static (PixiJS v8)
    // This treats the scenery as a single texture, improving rendering performance
    this.container.cacheAsTexture = true;
  }

  /**
   * Update scenery (static)
   */
  update(deltaTime) {
    super.update(deltaTime);
    // Static entity
    void deltaTime;
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
