/**
 * BetHistoryManager - Singleton class for managing bet history in localStorage
 * Stores bet data including date, bet amount, multiplier, and win amount
 */
class BetHistoryManager {
  static instance = null;
  static STORAGE_KEY = "chicken-game-bet-history";
  static MAX_HISTORY_SIZE = 100; // Keep last 100 bets

  constructor() {
    if (BetHistoryManager.instance) {
      return BetHistoryManager.instance;
    }

    this.history = this.loadHistory();
    this.listeners = new Set();
    this.currentBetId = null; // Track the active bet
    BetHistoryManager.instance = this;
  }

  /**
   * Load bet history from localStorage
   */
  loadHistory() {
    try {
      const stored = localStorage.getItem(BetHistoryManager.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {

    }
    return [];
  }

  /**
   * Save bet history to localStorage
   */
  saveHistory() {
    try {
      // Keep only the last MAX_HISTORY_SIZE bets
      if (this.history.length > BetHistoryManager.MAX_HISTORY_SIZE) {
        this.history = this.history.slice(-BetHistoryManager.MAX_HISTORY_SIZE);
      }

      localStorage.setItem(
        BetHistoryManager.STORAGE_KEY,
        JSON.stringify(this.history),
      );
      this.notifyListeners();
    } catch (error) {

    }
  }

  /**
   * Start a new bet (when game starts)
   * @param {number} betAmount - The amount bet
   * @returns {string} betId - Unique identifier for this bet
   */
  startBet(betAmount) {
    const betId = Date.now().toString();
    const bet = {
      id: betId,
      date: new Date().toISOString(),
      betAmount: betAmount,
      multiplier: 0,
      winAmount: 0,
      completed: false,
    };

    this.history.push(bet);
    this.currentBetId = betId;
    return betId;
  }

  /**
   * Complete a bet with the result
   * @param {string} betId - The bet identifier
   * @param {number} multiplier - The multiplier achieved
   * @param {number} winAmount - The amount won
   */
  completeBet(betId, multiplier, winAmount) {
    const bet = this.history.find((b) => b.id === betId);
    if (bet) {
      bet.multiplier = multiplier;
      bet.winAmount = winAmount;
      bet.completed = true;
      this.saveHistory();
    }
    if (this.currentBetId === betId) {
      this.currentBetId = null;
    }
  }

  /**
   * Get the current active bet ID
   */
  getCurrentBetId() {
    return this.currentBetId;
  }

  /**
   * Get all bet history (most recent first)
   */
  getHistory() {
    return [...this.history].reverse();
  }

  /**
   * Clear all bet history
   */
  clearHistory() {
    this.history = [];
    this.saveHistory();
  }

  /**
   * Subscribe to history changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of history changes
   */
  notifyListeners() {
    this.listeners.forEach((callback) => callback(this.getHistory()));
  }

  /**
   * Format date for display
   * @param {string} isoDate - ISO date string
   * @returns {object} - Formatted date parts
   */
  static formatDate(isoDate) {
    const date = new Date(isoDate);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);

    return {
      time: `${hours}:${minutes}`,
      date: `${day}-${month}-${year}`,
    };
  }
}

// Export singleton instance
export const betHistoryManager = new BetHistoryManager();
