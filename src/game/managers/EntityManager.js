/**
 * EntityManager - Manages all game entities with Pixi.js integration
 * Handles entity lifecycle, batch operations, and stage management
 */
export class EntityManager {
  constructor(pixiRenderer = null) {
    this.entities = [];
    this.entitiesToAdd = [];
    this.entitiesToRemove = [];
    this.pixiRenderer = pixiRenderer;
    this.worldContainer = pixiRenderer
      ? pixiRenderer.getWorldContainer()
      : null;
    // Backwards compatibility: stage now points to worldContainer
    this.stage = this.worldContainer;
  }

  /**
   * Set the Pixi renderer (for adding entities to world container)
   */
  setPixiRenderer(pixiRenderer) {
    this.pixiRenderer = pixiRenderer;
    this.worldContainer = pixiRenderer
      ? pixiRenderer.getWorldContainer()
      : null;
    // Backwards compatibility: stage now points to worldContainer
    this.stage = this.worldContainer;

    // World container is already configured in PixiRenderer with:
    // - sortableChildren: true (z-index support)
    // - cullable: false (prevent car flickering)
  }

  /**
   * Add an entity
   */
  addEntity(entity) {
    this.entitiesToAdd.push(entity);
  }

  /**
   * Remove an entity
   */
  removeEntity(entity) {
    this.entitiesToRemove.push(entity);
  }

  /**
   * Get all entities
   */
  getEntities() {
    return this.entities;
  }

  /**
   * Get entities of a specific type
   */
  getEntitiesOfType(type) {
    return this.entities.filter((entity) => entity instanceof type);
  }

  /**
   * Update all entities
   */
  update(deltaTime) {
    // Process additions (batch operation)
    if (this.entitiesToAdd.length > 0) {
      for (let i = 0; i < this.entitiesToAdd.length; i++) {
        const entity = this.entitiesToAdd[i];
        if (!entity) continue;

        this.entities.push(entity);

        // Add entity's display object to Pixi world container
        if (this.worldContainer && entity.getDisplayObject) {
          const displayObject = entity.getDisplayObject();
          if (displayObject && !displayObject.destroyed) {
            try {
              this.worldContainer.addChild(displayObject);
            } catch (e) {
              console.error(
                `Failed to add ${entity.constructor.name} to world:`,
                e,
              );
            }
          }
        }
      }
      this.entitiesToAdd.length = 0; // Faster than = []
    }

    // Update active entities
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      if (entity && entity.active) {
        try {
          entity.update(deltaTime);
        } catch (e) {
          console.warn("Error updating entity:", e);
        }
      }
    }

    // Process removals (batch operation)
    if (this.entitiesToRemove.length > 0) {
      // Use filter for better performance with many removals
      const toRemoveSet = new Set(this.entitiesToRemove);
      this.entities = this.entities.filter((entity) => {
        if (!entity || toRemoveSet.has(entity)) {
          if (entity) {
            // Remove from Pixi world container
            if (this.worldContainer && entity.getDisplayObject) {
              const displayObject = entity.getDisplayObject();
              if (displayObject && displayObject.parent) {
                try {
                  this.worldContainer.removeChild(displayObject);
                } catch {
                  // Display object might already be removed
                }
              }
            }
            try {
              entity.destroy();
            } catch {
              // Entity might already be destroyed
            }
          }
          return false;
        }
        return true;
      });
      this.entitiesToRemove.length = 0;
    }
  }

  /**
   * Render all entities - Pixi handles this automatically via stage
   */
  render(renderer) {
    // Pixi automatically renders all display objects in the stage
    // This method is kept for compatibility but rendering is handled by Pixi
    void renderer;
  }

  /**
   * Clear all entities
   */
  clear() {
    // Optimized: destroy all and clear arrays efficiently
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      if (!entity) continue;

      // Remove from Pixi world container
      if (this.worldContainer && entity.getDisplayObject) {
        const displayObject = entity.getDisplayObject();
        if (displayObject && displayObject.parent) {
          try {
            this.worldContainer.removeChild(displayObject);
          } catch {
            // Display object might already be removed
          }
        }
      }

      try {
        entity.destroy();
      } catch {
        // Entity might already be destroyed
      }
    }
    this.entities.length = 0;
    this.entitiesToAdd.length = 0;
    this.entitiesToRemove.length = 0;
  }

  /**
   * Get entity count
   */
  getEntityCount() {
    return this.entities.length;
  }
}
