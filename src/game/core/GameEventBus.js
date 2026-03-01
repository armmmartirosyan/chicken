/**
 * GameEventBus - Event-driven architecture for decoupling PixiJS game from React UI
 * Implements pub/sub pattern for state synchronization
 */
class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Event to listen for
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit an event
   * @param {string} eventName - Event to emit
   * @param {*} data - Event payload
   */
  emit(eventName, data) {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  off(eventName) {
    this.events.delete(eventName);
  }

  /**
   * Clear all events
   */
  clear() {
    this.events.clear();
  }
}

// Singleton instance
export const gameEvents = new EventBus();
