/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useCallback, useRef, useEffect } from "react";
import "./App.css";
import {
  Header,
  GameArea,
  ControlPanel,
  LoadingScreen,
  HandIndicator,
  WelcomeModal,
} from "./components";
import { gameEvents } from "./game/core/GameEventBus.js";
import { liveWinService } from "./services/LiveWinService.js";
import { audioEngine } from "./services/AudioEngine.js";

/**
 * Helper function to round currency to 2 decimal places
 * Prevents floating-point precision issues
 */
const roundCurrency = (amount) => {
  return Math.round(amount * 100) / 100;
};

export default function App() {
  // Financial state
  const [balance, setBalance] = useState(20);

  // Game state: idle, playing, atFinish, won, lost
  const [gameState, setGameState] = useState("idle");

  // UI state - current win value based on lane
  const [currentWinValue, setCurrentWinValue] = useState(0);

  // Game function references
  const [jumpChickenFn, setJumpChickenFn] = useState(null);
  const [getCurrentMultiplierFn, setGetCurrentMultiplierFn] = useState(null);
  const [finishCurrentLaneFn, setFinishCurrentLaneFn] = useState(null);
  const [resetGameFn, setResetGameFn] = useState(null);
  const [registerCollisionCallbackFn, setRegisterCollisionCallbackFn] =
    useState(null);
  const scrollContainerRef = useRef(null);

  // Loading state
  const [isGameLoading, setIsGameLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);

  // Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [hasClaimedBonus, setHasClaimedBonus] = useState(false);
  const [tutorialFingerVisible, setTutorialFingerVisible] = useState(false);
  const [tutorialTarget, setTutorialTarget] = useState(null);

  // Refs for instant access
  const winValueRef = useRef(0);
  const currentLaneRef = useRef(0);

  // Handle loading state from GameArea
  const handleLoadingChange = useCallback(({ isLoading, loadingError }) => {
    setIsGameLoading(isLoading);
    setLoadingError(loadingError || null);
  }, []);

  // Handle when jump function is ready from game
  const handleJumpReady = useCallback(
    (jumpFn, getMultiplierFn, finishLaneFn, resetFn, registerCollisionFn) => {
      setJumpChickenFn(() => jumpFn);
      setGetCurrentMultiplierFn(() => getMultiplierFn);
      setFinishCurrentLaneFn(() => finishLaneFn);
      setResetGameFn(() => resetFn);
      setRegisterCollisionCallbackFn(() => registerCollisionFn);
    },
    [],
  );

  // Handle play/go button click
  const handlePlay = useCallback(() => {
    // Block input during death sequence or at finish
    if (gameState === "lost" || gameState === "atFinish") {
      return;
    }

    // Initialize audio engine on first user interaction
    if (!audioEngine.initialized) {
      audioEngine.initialize();
    }

    // Play button click sound
    audioEngine.onButtonClick();

    if (gameState === "idle" || gameState === "won") {
      // Start new game - no bet deduction
      if (gameState === "won" && resetGameFn) {
        resetGameFn();
      }

      const game = window.__GAME_INSTANCE__;
      if (game && game.hideWinNotification) {
        game.hideWinNotification();
      }

      setGameState("playing");
      setCurrentWinValue(0);
      winValueRef.current = 0;

      if (game) {
        game.setGameState("playing"); // Enable collisions when game starts
      }

      // Auto-jump to first lane
      if (jumpChickenFn) {
        setTimeout(() => {
          jumpChickenFn();
          audioEngine.onJump(); // Play jump sound
        }, 100);
      }
    } else if (gameState === "playing") {
      // Normal jump during gameplay
      if (jumpChickenFn) {
        jumpChickenFn();
        audioEngine.onJump(); // Play jump sound
      }
    }
  }, [gameState, jumpChickenFn, resetGameFn]);

  // Handle collision with car
  const handleCollision = useCallback(() => {
    if (gameState !== "playing" && gameState !== "atFinish") return;

    // Play lose sound when chicken gets hit
    audioEngine.onLose();

    setGameState("lost");
  }, [gameState]);

  // Handle reset complete - restore game state after death sequence
  const handleResetComplete = useCallback(() => {
    setGameState("idle");
    setCurrentWinValue(0);
    winValueRef.current = 0;
  }, []);

  // Handle win complete - restore game state after win animation
  const handleWinComplete = useCallback(() => {
    if (resetGameFn) {
      resetGameFn();
    }

    setGameState("idle");
    setCurrentWinValue(0);
    winValueRef.current = 0;
  }, [resetGameFn]);

  // Register collision callback when game is ready
  useEffect(() => {
    if (registerCollisionCallbackFn) {
      registerCollisionCallbackFn(handleCollision, handleResetComplete);
    }
  }, [registerCollisionCallbackFn, handleCollision, handleResetComplete]);

  // Manage LiveWin service lifecycle
  useEffect(() => {
    // Start generating mock wins when component mounts
    liveWinService.start();

    // Cleanup: Stop service on unmount to prevent memory leaks
    return () => {
      liveWinService.stop();
      audioEngine.destroy(); // Cleanup audio engine
    };
  }, []);

  // Show welcome modal after loading completes
  useEffect(() => {
    if (!isGameLoading && !hasClaimedBonus) {
      setShowWelcomeModal(true);
      // Delay finger appearance to prevent flicker
      setTimeout(() => {
        setTutorialTarget("CLAIM");
        setTutorialFingerVisible(true);
      }, 300);
    }
  }, [isGameLoading, hasClaimedBonus]);

  // Handle welcome bonus claim
  const handleClaimBonus = useCallback(() => {
    setHasClaimedBonus(true);
    // Fade out finger, then move to GO button
    setTutorialFingerVisible(false);
    setTimeout(() => {
      setShowWelcomeModal(false);
      setTutorialTarget(null); // Clear tutorial target to let game state control it
      setTutorialFingerVisible(true);
    }, 300);
    // Add bonus to balance
    setBalance((prev) => roundCurrency(prev + 1500));
  }, []);

  // Listen for lane changes to detect finish line
  useEffect(() => {
    if (gameState !== "playing") return;

    const handleLaneChange = ({ laneIndex }) => {
      const game = window.__GAME_INSTANCE__;
      const totalLanes = game?.coinManager?.coins?.length || 0;

      currentLaneRef.current = laneIndex;

      // Check if reached finish line (beyond all coins)
      if (laneIndex >= totalLanes) {
        // Play win sound when chicken reaches finish
        audioEngine.onWin();

        setGameState("atFinish");
        gameEvents.emit("game:finished", {
          laneIndex,
          winValue: winValueRef.current,
        });
      }
    };

    const unsubscribe = gameEvents.on("lane:changed", handleLaneChange);
    return () => unsubscribe();
  }, [gameState]);

  // Update current win value in real-time while playing
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "atFinish") {
      return;
    }

    if (!getCurrentMultiplierFn) {
      return;
    }

    let animationFrameId;
    let lastUpdateTime = 0;
    const updateInterval = 100; // Update every 100ms

    const updateWinValue = (timestamp) => {
      if (timestamp - lastUpdateTime >= updateInterval) {
        const winValue = getCurrentMultiplierFn(); // This returns the win value now

        // Update both state (for UI) and ref (for instant access)
        setCurrentWinValue(winValue);
        winValueRef.current = winValue;

        lastUpdateTime = timestamp;
      }
      animationFrameId = requestAnimationFrame(updateWinValue);
    };

    animationFrameId = requestAnimationFrame(updateWinValue);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameState, getCurrentMultiplierFn]);

  // Handle cashout - trigger win animation and payout
  const handleCashout = useCallback(() => {
    if (gameState !== "atFinish") return;

    // Play cashout sound
    audioEngine.onCashout();

    // Turn current lane's coin to gold
    if (finishCurrentLaneFn) {
      finishCurrentLaneFn();
    }

    // Calculate winnings using ref for instant value
    const winnings = roundCurrency(winValueRef.current);

    // Update balance
    setBalance((prev) => roundCurrency(prev + winnings));

    // Show win notification animation
    const game = window.__GAME_INSTANCE__;
    if (game && game.showWinNotification) {
      game.showWinNotification(winnings, 3000);
    }

    // Transition to won state
    setGameState("won");

    // Reset to idle after win animation completes
    setTimeout(() => {
      handleWinComplete();
    }, 3100); // Slightly longer than notification duration
  }, [gameState, finishCurrentLaneFn, handleWinComplete]);

  // Space key listener for "Space to Play" feature
  useEffect(() => {
    const handleKeyDown = () => {
      return;
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="app-container">
      <LoadingScreen isLoading={isGameLoading} />
      {loadingError && (
        <div className="loading-error">
          <p>Error: {loadingError}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      )}
      <Header balance={balance} />
      <GameArea
        onJumpReady={handleJumpReady}
        scrollContainerRef={scrollContainerRef}
        difficulty="Hardcore"
        onLoadingChange={handleLoadingChange}
      />
      <ControlPanel
        onPlay={handlePlay}
        onCashout={handleCashout}
        gameState={gameState}
        disabled={gameState === "playing" || gameState === "atFinish"}
        currentWinValue={currentWinValue}
        goButtonDisabled={
          showWelcomeModal ||
          gameState === "won" ||
          gameState === "lost" ||
          gameState === "atFinish"
        }
        cashoutButtonDisabled={gameState !== "atFinish"}
      />

      {/* Welcome Modal - shown after loading */}
      <WelcomeModal visible={showWelcomeModal} onClaim={handleClaimBonus} />

      {/* Hand indicator - context-aware positioning with smooth transitions */}
      <HandIndicator
        targetButton={
          tutorialTarget || (gameState === "atFinish" ? "CASHOUT" : "GO")
        }
        visible={
          tutorialFingerVisible ||
          (hasClaimedBonus &&
            (gameState === "idle" ||
              gameState === "playing" ||
              gameState === "atFinish"))
        }
      />
    </div>
  );
}
