import { Container } from "pixi.js";

/**
 * BaseEntity - Abstract base class for all game entities using Pixi.js
 * Provides common entity functionality with Pixi display objects
 */
export class BaseEntity {
  constructor(x = 0, y = 0) {
    // Create Pixi container for this entity
    this.container = new Container();
    this.container.position.set(x, y);

    this.x = x;
    this.y = y;
    this.width = 0;
    this.height = 0;
    this.active = true;
    this.visible = true;

    // Link container visibility to entity visibility
    this.container.visible = this.visible;
  }

  /**
   * Update entity state
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Guard against destroyed container
    if (!this.container) return;

    // Update container position if entity position changed
    if (
      this.container.position.x !== this.x ||
      this.container.position.y !== this.y
    ) {
      this.container.position.set(this.x, this.y);
    }

    // Update container visibility
    this.container.visible = this.visible;

    // Override in subclasses for custom update logic
    void deltaTime;
  }

  /**
   * Render entity - Pixi handles rendering automatically via container
   * @param {PixiRenderer} renderer - The Pixi renderer instance
   */
  render(renderer) {
    // Pixi automatically renders all display objects in the scene graph
    // This method is kept for compatibility but rendering is handled by Pixi
    void renderer;
  }

  /**
   * Set entity position
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    if (this.container) {
      this.container.position.set(x, y);
    }
  }

  /**
   * Get entity bounds
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Get Pixi display object
   */
  getDisplayObject() {
    return this.container;
  }

  /**
   * Check if point is inside entity
   */
  containsPoint(x, y) {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }

  /**
   * Destroy entity and cleanup resources
   */
  destroy() {
    this.active = false;
    this.visible = false;

    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }
  }
}
