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
 * Difficulty settings for game modes with coin multipliers and car spawn configuration
 */
export const DIFFICULTY_SETTINGS = {
  Easy: {
    obstacleSpawnChance: 0.3,
    obstacleSpeed: 2,
    rewardChance: 0.8,
    coinMultipliers: [
      1.01, 1.03, 1.06, 1.1, 1.15, 1.19, 1.24, 1.3, 1.35, 1.42, 1.48, 1.56,
      1.65, 1.75, 1.85, 1.98, 2.12, 2.28, 2.47, 2.7, 2.96, 3.28, 3.7, 4.11,
      4.64, 5.39, 6.5, 8.36, 12.08, 23.24,
    ],
    // Car spawn settings
    carSpawn: {
      speedMultiplier: 1.0,
      minSpawnDelay: 350, // ms - reduced by 50% for more frequent spawns
      maxSpawnDelay: 600, // ms - reduced by 50% for more frequent spawns
    },
  },
  Medium: {
    obstacleSpawnChance: 0.5,
    obstacleSpeed: 3,
    rewardChance: 0.6,
    coinMultipliers: [
      1.08, 1.21, 1.37, 1.56, 1.78, 2.05, 2.37, 2.77, 3.24, 3.85, 4.62, 5.61,
      6.91, 8.64, 10.99, 14.29, 18.96, 26.07, 37.24, 52.82, 82.36, 137.59,
      265.55, 638.82, 2457.0,
    ],
    // Car spawn settings
    carSpawn: {
      speedMultiplier: 1.1,
      minSpawnDelay: 300, // ms - reduced by 50% for more frequent spawns
      maxSpawnDelay: 550, // ms - reduced by 50% for more frequent spawns
    },
  },
  Hard: {
    obstacleSpawnChance: 0.7,
    obstacleSpeed: 4,
    rewardChance: 0.4,
    coinMultipliers: [
      1.18, 1.46, 1.83, 2.31, 2.95, 3.82, 5.02, 6.66, 9.04, 12.52, 17.74, 25.8,
      38.71, 60.21, 97.34, 166.87, 305.94, 595.86, 1383.03, 3267.64, 10898.54,
      62162.09,
    ],
    // Car spawn settings
    carSpawn: {
      speedMultiplier: 1.2,
      minSpawnDelay: 250, // ms - reduced by 50% for more frequent spawns
      maxSpawnDelay: 400, // ms - reduced by 50% for more frequent spawns
    },
  },
  Hardcore: {
    obstacleSpawnChance: 0.9,
    obstacleSpeed: 5,
    rewardChance: 0.2,
    coinMultipliers: [
      1.44, 2.21, 3.45, 5.53, 9.09, 15.3, 26.78, 48.7, 92.54, 185.08, 391.25,
      894.28, 2235.72, 6096.15, 18960.33, 72432.75, 379632.82, 3608855.25,
    ],
    // Car spawn settings
    carSpawn: {
      speedMultiplier: 1.5,
      minSpawnDelay: 150, // ms - reduced by 50% for more frequent spawns
      maxSpawnDelay: 300, // ms - reduced by 50% for more frequent spawns
    },
  },
};

/**
 * Get default game configuration with dynamic lane count based on difficulty
 */
export function getDefaultConfig(difficulty = "Easy") {
  // Get lane count from difficulty coin multipliers
  const difficultySettings =
    DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.Easy;
  const laneCount = difficultySettings.coinMultipliers.length;

  return {
    ...GAME_CONFIG,
    laneCount, // Override with dynamic lane count
  };
}
