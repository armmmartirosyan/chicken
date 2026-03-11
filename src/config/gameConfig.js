/**
 * Game Configuration
 * Central configuration for all game parameters and settings
 */

import startImg from "../assets/start.png";
import finishImg from "../assets/finish.png";
import lightImg from "../assets/light.png";
import carpetImg from "../assets/carpet.png";
import gateImg from "../assets/gate.png";
import coinImg from "../assets/coin.png";
import coinGoldImg from "../assets/coin-gold.png";
import truckOrangeImg from "../assets/truck-orange.png";
import truckBlueImg from "../assets/truck-blue.png";
import carYellowImg from "../assets/car-yellow.png";
import carPoliceImg from "../assets/car-police.png";

/**
 * Core game configuration
 */
export const GAME_CONFIG = {
  // Road settings
  laneWidth: 252, // Increased by 1.2x (210 * 1.2)
  laneCount: 30, // Default - will be overridden by difficulty settings
  roadColor: "#716c69",
  lineColor: "#ffffff",
  roadLineWidth: 4.2, // Increased by 1.2x (3.5 * 1.2)
  dashPattern: [28, 28],

  // Chicken settings
  chickenSize: 196,
  chickenScale: 0.84, // Increased by 1.2x (0.7 * 1.2)

  // Performance
  targetFPS: 60,

  // Asset paths
  assets: {
    start: startImg,
    finish: finishImg,
    light: lightImg,
    carpet: carpetImg,
    chicken: "./chicken.png",
    gate: gateImg,
    // Coin assets
    coin: coinImg,
    "coin-gold": coinGoldImg,
    // Car assets
    cars: {
      "truck-orange": truckOrangeImg,
      "truck-blue": truckBlueImg,
      "car-yellow": carYellowImg,
      "car-police": carPoliceImg,
    },
  },

  // Car spawner settings (vertical traffic) - optimized for performance
  carSpawner: {
    minSpawnInterval: 0.15, // Halved to compensate for 2x speed (0.3 / 2)
    maxSpawnInterval: 0.6, // Halved to compensate for 2x speed (1.2 / 2)
    minSpeed: 1500, // Increased by 4.0x from previous (400 * 4)
    maxSpeed: 2000, // Increased by 4.0x from previous (900 * 4)
    poolSize: 30, // Larger pool for more simultaneous cars
  },
};

/**
 * Fixed multipliers for 6-lane instant play mode
 * Displayed on coins in the road
 */
export const FIXED_MULTIPLIERS = [
  2.21, // Lane 1
  9.09, // Lane 2
  15.3, // Lane 3
  48.7, // Lane 4
  92.54, // Lane 5
  185.08, // Lane 6
];

/**
 * Fixed win values for 6-lane instant play mode
 * Static reward amounts in euros (no bet calculation)
 * Shown in cashout button and win notifications
 */
export const FIXED_WIN_VALUES = [
  110.5, // Lane 1 - 110.50€
  454.5, // Lane 2 - 454.50€
  765.0, // Lane 3 - 765.00€
  2435.0, // Lane 4 - 2,435.00€
  4627.0, // Lane 5 - 4,627.00€
  8162.0, // Lane 6 - 8,162.00€
];

/**
 * Get default game configuration with fixed 6 lanes
 */
export function getDefaultConfig() {
  return {
    ...GAME_CONFIG,
    laneCount: 6, // Fixed to 6 lanes for instant play mode
  };
}
