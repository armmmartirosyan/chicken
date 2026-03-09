import { gameEvents } from "../game/core/GameEventBus.js";
import avatar1 from "../assets/avatar1.png";
import avatar2 from "../assets/avatar2.png";
import avatar3 from "../assets/avatar3.png";
import nlFlag from "../assets/nl.svg";
import inFlag from "../assets/in.svg";
import tjFlag from "../assets/tj.svg";
import tgFlag from "../assets/tg.svg";
import uzFlag from "../assets/uz.svg";
import siFlag from "../assets/si.svg";
import kzFlag from "../assets/kz.svg";

/**
 * LiveWinService - Social Proof Engine
 * Generates realistic "live wins" to create engagement without impacting game performance
 * Uses variable intervals and weighted multiplier distribution for authenticity
 */
class LiveWinService {
  constructor() {
    this.isRunning = false;
    this.timeoutId = null;
    this.winCounter = 0;

    // Avatar pool (3 provided PNG images)
    this.avatars = [avatar1, avatar2, avatar3];

    // Flag pool (provided flags)
    this.flags = [nlFlag, inFlag, tjFlag, tgFlag, uzFlag, siFlag, kzFlag];

    // User name pool
    this.names = [
      "Alexander",
      "Isabella",
      "Christopher",
      "Anastasia",
      "Benjamin",
      "Valentina",
      "Nicholas",
      "Gabriella",
      "Sebastian",
      "Francesca",
      "Maximilian",
      "Alessandra",
      "Theodore",
      "Penelope",
      "Dominic",
      "Seraphina",
      "Jonathan",
      "Evangeline",
      "Santiago",
      "Katerina",
      "Leonardo",
      "Arabella",
      "Frederick",
      "Josephine",
    ];

    // Base bet amounts for realistic calculations
    this.baseBets = [0.5, 1, 2, 5, 7, 10, 15, 20];
  }

  /**
   * Generate a realistic multiplier with weighted distribution
   * 80% - 1.2x to 5.0x
   * 15% - 5.0x to 20.0x
   * 5% - 20.0x+
   */
  generateMultiplier() {
    const roll = Math.random();

    if (roll < 0.8) {
      // 80% - Small to medium wins
      return parseFloat((1.2 + Math.random() * 3.8).toFixed(2));
    } else if (roll < 0.95) {
      // 15% - Big wins
      return parseFloat((5.0 + Math.random() * 15.0).toFixed(2));
    } else {
      // 5% - Huge wins
      return parseFloat((20.0 + Math.random() * 80.0).toFixed(2));
    }
  }

  /**
   * Generate a mock win event
   */
  generateMockWin() {
    const name = this.names[Math.floor(Math.random() * this.names.length)];
    const avatar =
      this.avatars[Math.floor(Math.random() * this.avatars.length)];
    const flag = this.flags[Math.floor(Math.random() * this.flags.length)];
    const multiplier = this.generateMultiplier();

    // Generate amount in range [465, 5879]
    const amount = parseFloat((465 + Math.random() * (5879 - 465)).toFixed(2));

    this.winCounter++;

    return {
      id: `win-${Date.now()}-${this.winCounter}`,
      name,
      avatar,
      flag,
      multiplier,
      amount,
      timestamp: Date.now(),
    };
  }

  /**
   * Recursive generation with variable intervals
   */
  scheduleNextWin() {
    if (!this.isRunning) return;

    const interval = 4000;

    this.timeoutId = setTimeout(() => {
      // Generate and emit win event
      const win = this.generateMockWin();
      gameEvents.emit("live:win", win);

      // Schedule next win
      this.scheduleNextWin();
    }, interval);
  }

  /**
   * Start generating wins
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.scheduleNextWin();
  }

  /**
   * Stop generating wins and cleanup
   */
  stop() {
    this.isRunning = false;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Reset counter
   */
  reset() {
    this.stop();
    this.winCounter = 0;
  }
}

// Export singleton instance
export const liveWinService = new LiveWinService();
