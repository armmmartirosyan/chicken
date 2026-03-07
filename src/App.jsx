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
  PayoutModal,
} from "./components";
import CashoutDialog from "./components/CashoutDialog";
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

  // Payout modal state (persistent across all games)
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [currentPayoutLane, setCurrentPayoutLane] = useState(null);

  // Cashout dialog state
  const [showCashoutDialog, setShowCashoutDialog] = useState(false);

  // Predictive Safety-Lock state
  const [isNextLaneSafe, setIsNextLaneSafe] = useState(true);

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
  // const handleWinComplete = useCallback(() => {
  //   if (resetGameFn) {
  //     resetGameFn();
  //   }

  //   setGameState("idle");
  //   setCurrentWinValue(0);
  //   winValueRef.current = 0;
  // }, [resetGameFn]);

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
      // Duck music when modal appears
      audioEngine.duckMusic();
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

    // MASTER DIRECTIVE: Set chicken_game_played in sessionStorage
    // This enables persistent modals for all future games
    try {
      sessionStorage.setItem("chicken_game_played", "true");
    } catch (e) {
      console.warn("Failed to set chicken_game_played:", e);
    }

    // Fade out finger, then move to GO button
    setTutorialFingerVisible(false);
    setTimeout(() => {
      setShowWelcomeModal(false);
      // Restore music volume after modal closes
      audioEngine.restoreMusic();
      setTutorialTarget(null); // Clear tutorial target to let game state control it
      setTutorialFingerVisible(true);
    }, 300);
  }, []);

  // Handle payout modal next button
  const handlePayoutNext = useCallback(() => {
    // Hide modal and finger
    setShowPayoutModal(false);
    setTutorialFingerVisible(false);
    // Restore music volume after modal closes
    audioEngine.restoreMusic();

    setTimeout(() => {
      // Clear tutorial target and resume game
      setTutorialTarget(null);
      setTutorialFingerVisible(true);

      // Resume game after 500ms invincibility buffer
      setTimeout(() => {
        const game = window.__GAME_INSTANCE__;
        if (game) {
          game.setGameState("playing");
        }
      }, 500);
    }, 300);
  }, []);

  // Listen for lane changes to detect finish line
  useEffect(() => {
    if (gameState !== "playing") return;

    const handleLaneChange = ({ laneIndex }) => {
      const game = window.__GAME_INSTANCE__;
      const totalLanes = game?.coinManager?.coins?.length || 0;

      currentLaneRef.current = laneIndex;

      // MASTER DIRECTIVE: Show payout modals at lanes 2 and 4 on EVERY game
      // Condition: chicken_game_played must be true (set when bonus claimed)
      const hasStartedPlaying =
        sessionStorage.getItem("chicken_game_played") === "true";

      if (hasStartedPlaying && (laneIndex === 2 || laneIndex === 4)) {
        // Wait for coin flip animation to complete before showing modal
        // Coin flip takes 400ms, we wait 500ms to ensure it's fully visible
        setTimeout(() => {
          // Immediately pause game to prevent further input during animation
          const game = window.__GAME_INSTANCE__;
          if (game) {
            game.setGameState("paused");
          }
          setCurrentPayoutLane(laneIndex);
          setShowPayoutModal(true);
          // Duck music when modal appears
          audioEngine.duckMusic();
          setTutorialTarget("NEXT");
          setTutorialFingerVisible(true);
        }, 200); // Wait for gate/coin animation to complete

        return;
      }

      // Check if reached finish line (beyond all coins)
      if (laneIndex >= totalLanes) {
        // Play win sound when chicken reaches finish
        audioEngine.onWin();

        // Show win notification animation
        const winnings = roundCurrency(winValueRef.current);
        const game = window.__GAME_INSTANCE__;
        if (game && game.showWinNotification) {
          game.showWinNotification(winnings, 3000);
        }

        // Play cashout sound
        audioEngine.onCashout();

        setGameState("atFinish");
        gameEvents.emit("game:finished", {
          laneIndex,
          winValue: winValueRef.current,
        });
      }
    };

    const unsubscribe = gameEvents.on("lane:changed", handleLaneChange);
    return () => unsubscribe();
  }, [gameState, winValueRef]);

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

    // Turn current lane's coin to gold
    if (finishCurrentLaneFn) {
      finishCurrentLaneFn();
    }

    // Calculate winnings using ref for instant value
    const winnings = roundCurrency(winValueRef.current);

    // Trigger cashout animation with sequential handoff to React dialog
    const game = window.__GAME_INSTANCE__;
    if (game && game.vfxManager) {
      // Play cashout animation at chicken position, then show dialog
      game.vfxManager.playCashoutAnimation(() => {
        // Animation complete - update balance and show dialog
        setBalance((prev) => roundCurrency(prev + winnings));
        setGameState("won");
        setShowCashoutDialog(true);
        setTutorialTarget("TAKE");
      });
    } else {
      // Fallback if VFX manager unavailable
      setBalance((prev) => roundCurrency(prev + winnings));
      setGameState("won");
      setShowCashoutDialog(true);
    }
  }, [gameState, finishCurrentLaneFn]);

  // MASTER DIRECTIVE: Frame-by-frame Predictive Safety-Lock
  // Check if next lane is safe every frame during gameplay
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "idle") {
      setIsNextLaneSafe(true); // Default to safe when not playing
      return;
    }

    let animationFrameId;

    const checkSafety = () => {
      const game = window.__GAME_INSTANCE__;
      if (game && game.isNextLaneSafe) {
        const currentLane = currentLaneRef.current;
        const safe = game.isNextLaneSafe(currentLane);
        setIsNextLaneSafe(safe);
      }
      animationFrameId = requestAnimationFrame(checkSafety);
    };

    animationFrameId = requestAnimationFrame(checkSafety);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameState]);

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
          !isNextLaneSafe || // MASTER DIRECTIVE: Safety-Lock prevents jumping when unsafe
          showWelcomeModal ||
          showPayoutModal ||
          gameState === "won" ||
          gameState === "lost" ||
          gameState === "atFinish"
        }
        cashoutButtonDisabled={gameState !== "atFinish"}
      />

      {/* Welcome Modal - shown after loading */}
      <WelcomeModal visible={showWelcomeModal} onClaim={handleClaimBonus} />

      {/* Payout Modal - shown at lanes 2 and 4 during first run */}
      <PayoutModal
        visible={showPayoutModal}
        lane={currentPayoutLane}
        onNext={handlePayoutNext}
      />

      {/* Cashout Dialog - shown after cashout animation completes */}
      <CashoutDialog
        isOpen={showCashoutDialog}
        // onClose={() => {
        //   setShowCashoutDialog(false);
        //   handleWinComplete();
        // }}
      />

      {/* Hand indicator - context-aware positioning with smooth transitions */}
      <HandIndicator
        targetButton={
          tutorialTarget || (gameState === "atFinish" ? "CASHOUT" : "GO")
        }
        visible={
          // Show finger for tutorial target (CLAIM or NEXT buttons)
          (tutorialFingerVisible && tutorialTarget) ||
          // Show finger for GO/CASHOUT buttons only when safe and not blocked by modals
          (hasClaimedBonus &&
            !showPayoutModal &&
            !showCashoutDialog &&
            !tutorialTarget &&
            isNextLaneSafe && // MASTER DIRECTIVE: Only show finger when lane is safe
            (gameState === "idle" ||
              gameState === "playing" ||
              gameState === "atFinish"))
        }
      />
    </div>
  );
}
