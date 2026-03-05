/**
 * SettingsManager - Singleton class for managing persistent user settings
 * Implements localStorage persistence with instant updates and event-driven architecture
 */
class SettingsManager {
  static instance = null;
  static STORAGE_KEY = "chicken-game-settings";

  static DEFAULTS = {
    soundEnabled: true,
    musicEnabled: true,
  };

  constructor() {
    if (SettingsManager.instance) {
      return SettingsManager.instance;
    }

    this.settings = this.loadSettings();
    this.listeners = new Map();
    SettingsManager.instance = this;
  }

  /**
   * Load settings from localStorage with fallback to defaults
   */
  loadSettings() {
    try {
      const stored = localStorage.getItem(SettingsManager.STORAGE_KEY);
      if (stored) {
        return { ...SettingsManager.DEFAULTS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
    }
    return { ...SettingsManager.DEFAULTS };
  }

  /**
   * Save settings to localStorage immediately
   */
  saveSettings() {
    try {
      localStorage.setItem(
        SettingsManager.STORAGE_KEY,
        JSON.stringify(this.settings),
      );
    } catch (error) {
      console.error("Failed to save settings to localStorage:", error);
    }
  }

  /**
   * Get a specific setting value
   */
  get(key) {
    return this.settings[key] ?? SettingsManager.DEFAULTS[key];
  }

  /**
   * Set a specific setting value with instant persistence and notification
   */
  set(key, value) {
    const oldValue = this.settings[key];
    if (oldValue !== value) {
      this.settings[key] = value;
      this.saveSettings();
      this.notify(key, value, oldValue);
    }
  }

  /**
   * Toggle a boolean setting
   */
  toggle(key) {
    this.set(key, !this.get(key));
  }

  /**
   * Subscribe to setting changes
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Notify all listeners of a setting change
   */
  notify(key, newValue, oldValue) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error(`Error in settings listener for ${key}:`, error);
        }
      });
    }
  }

  /**
   * Get all settings
   */
  getAll() {
    return { ...this.settings };
  }

  /**
   * Reset all settings to defaults
   */
  reset() {
    const keys = Object.keys(this.settings);
    this.settings = { ...SettingsManager.DEFAULTS };
    this.saveSettings();

    keys.forEach((key) => {
      this.notify(key, this.settings[key], undefined);
    });
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();
