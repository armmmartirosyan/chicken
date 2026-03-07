import { settingsManager } from "./SettingsManager.js";

// Import all audio files as Base64-inlined modules
import jumpSound from "../assets/audios/jump.webm";
import chickSound from "../assets/audios/chick.webm";
import cashoutSound from "../assets/audios/cashout.webm";
import winSound from "../assets/audios/win.webm";
import soundtrack from "../assets/audios/Soundtrack.webm";
import loseSound from "../assets/audios/lose.webm";
import crashSound from "../assets/audios/crash.webm";
import buttonClickSound from "../assets/audios/buttonClick.webm";

/**
 * AudioEngine - Singleton class for managing game audio with Base64-inlined assets
 * Implements Web Audio API for optimal performance and memory efficiency
 */
class AudioEngine {
  static instance = null;

  constructor() {
    if (AudioEngine.instance) {
      return AudioEngine.instance;
    }

    // Audio context for Web Audio API
    this.audioContext = null;
    this.initialized = false;

    // Audio buffers (decoded audio data)
    this.buffers = new Map();

    // Active audio sources (for stopping/cleanup)
    this.activeSources = new Map();

    // Music-specific state
    this.musicSource = null;
    this.musicGainNode = null; // Store gain node for volume control (ducking)
    this.musicStartTime = 0;
    this.musicPausedAt = 0;

    // Audio file mappings
    this.audioFiles = {
      jump: jumpSound,
      chick: chickSound,
      cashout: cashoutSound,
      win: winSound,
      music: soundtrack,
      lose: loseSound,
      crash: crashSound,
      buttonClick: buttonClickSound,
    };

    // Volume settings
    this.sfxVolume = 0.7;
    this.musicVolume = 0.4;

    AudioEngine.instance = this;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Create audio context
      this.audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();

      // Load all audio files
      await this.loadAllAudio();

      this.initialized = true;

      // Start music if enabled
      if (settingsManager.get("musicEnabled")) {
        this.playMusic();
      }

      // Subscribe to settings changes
      settingsManager.subscribe("musicEnabled", (enabled) => {
        if (enabled) {
          this.playMusic();
        } else {
          this.stopMusic();
        }
      });
    } catch {
      // Some
    }
  }

  /**
   * Load and decode all audio files
   */
  async loadAllAudio() {
    const loadPromises = Object.entries(this.audioFiles).map(
      async ([key, url]) => {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer =
            await this.audioContext.decodeAudioData(arrayBuffer);
          this.buffers.set(key, audioBuffer);
        } catch {
          // Some
        }
      },
    );

    await Promise.all(loadPromises);
  }

  /**
   * Play a sound effect
   */
  playSFX(soundKey, volume = 1.0, loop = false) {
    if (!this.initialized || !settingsManager.get("soundEnabled")) {
      return null;
    }

    const buffer = this.buffers.get(soundKey);
    if (!buffer) {
      return null;
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      // Create source node
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;

      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume * this.sfxVolume;

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start playback
      source.start(0);

      // Store source for cleanup
      const sourceId = `${soundKey}-${Date.now()}`;
      this.activeSources.set(sourceId, source);

      // Auto-cleanup when sound ends
      source.onended = () => {
        this.activeSources.delete(sourceId);
      };

      return source;
    } catch {
      return null;
    }
  }

  /**
   * Play background music (looping)
   */
  playMusic() {
    if (!this.initialized || !settingsManager.get("musicEnabled")) {
      return;
    }

    // Stop current music if playing
    if (this.musicSource) {
      this.stopMusic();
    }

    const buffer = this.buffers.get("music");
    if (!buffer) {
      return;
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      // Create source node
      this.musicSource = this.audioContext.createBufferSource();
      this.musicSource.buffer = buffer;
      this.musicSource.loop = true;

      // Create gain node for volume control
      this.musicGainNode = this.audioContext.createGain();
      this.musicGainNode.gain.value = this.musicVolume;

      // Connect nodes
      this.musicSource.connect(this.musicGainNode);
      this.musicGainNode.connect(this.audioContext.destination);

      // Start playback from paused position or beginning
      const offset = this.musicPausedAt || 0;
      this.musicSource.start(0, offset);
      this.musicStartTime = this.audioContext.currentTime - offset;

      this.musicSource.onended = () => {
        this.musicSource = null;
        this.musicGainNode = null;
      };
    } catch {
      // Some
    }
  }

  /**
   * Stop background music
   */
  stopMusic() {
    if (this.musicSource) {
      try {
        // Save playback position for resume
        const elapsed = this.audioContext.currentTime - this.musicStartTime;
        const buffer = this.buffers.get("music");
        if (buffer) {
          this.musicPausedAt = elapsed % buffer.duration;
        }

        this.musicSource.stop();
        this.musicSource = null;
        this.musicGainNode = null;
      } catch {
        // Some
      }
    }
  }

  /**
   * Stop all active sounds
   */
  stopAllSounds() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Ignore errors from already stopped sources
      }
    });
    this.activeSources.clear();
  }

  /**
   * Game event handlers (called from game code)
   */
  onJump() {
    this.playSFX("jump", 0.8);
  }

  onButtonClick() {
    this.playSFX("buttonClick", 0.6);
  }

  onCashout() {
    this.playSFX("cashout", 1.0);
  }

  onCrash() {
    this.playSFX("crash", 0.9);
  }

  onLose() {
    this.playSFX("lose", 1.0);
  }

  onWin() {
    this.playSFX("win", 1.0);
  }

  /**
   * Duck music volume for modals (reduce to 20%)
   */
  duckMusic() {
    if (this.musicGainNode && this.initialized) {
      this.musicGainNode.gain.setValueAtTime(
        this.musicVolume * 0.2,
        this.audioContext.currentTime,
      );
    }
  }

  /**
   * Restore music volume after modal (restore to 100%)
   */
  restoreMusic() {
    if (this.musicGainNode && this.initialized) {
      this.musicGainNode.gain.setValueAtTime(
        this.musicVolume,
        this.audioContext.currentTime,
      );
    }
  }

  /**
   * Load a sound dynamically from a data URI (for ConfettiManager)
   * @param {string} soundKey - Unique key for the sound
   * @param {string} dataUri - Data URI (data:audio/mp3;base64,...)
   */
  async loadSound(soundKey, dataUri) {
    if (!this.initialized) {
      return;
    }

    try {
      const response = await fetch(dataUri);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.buffers.set(soundKey, audioBuffer);
    } catch {
      // Some
    }
  }

  /**
   * Play a sound by key (alias for playSFX for ConfettiManager compatibility)
   * @param {string} soundKey - Key of the sound to play
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  playSound(soundKey, volume = 1.0) {
    return this.playSFX(soundKey, volume, false);
  }

  /**
   * Cleanup (call on unmount)
   */
  destroy() {
    this.stopAllSounds();
    this.stopMusic();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.initialized = false;
    AudioEngine.instance = null;
  }
}

// Export singleton instance
export const audioEngine = new AudioEngine();
