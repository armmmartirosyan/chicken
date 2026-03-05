import { useRef, useEffect, useMemo } from "react";
import { useGame, useResponsiveCanvas } from "../../hooks";
import { getDefaultConfig } from "../../config/gameConfig";
import "./CanvasGameArea.css";

/**
 * CanvasGameArea - Main game canvas component
 * Uses the new game architecture with separated game loop
 */
export function CanvasGameArea({
  onJumpReady,
  scrollContainerRef,
  difficulty,
  onLoadingChange,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  // Pass containerRef to parent for scroll control
  useEffect(() => {
    if (containerRef.current && scrollContainerRef) {
      scrollContainerRef.current = containerRef.current;
    }
  }, [scrollContainerRef]);

  // Prevent all scrolling on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventScroll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent all scroll events
    container.addEventListener("wheel", preventScroll, { passive: false });
    container.addEventListener("touchmove", preventScroll, { passive: false });
    container.addEventListener("scroll", preventScroll, { passive: false });

    return () => {
      container.removeEventListener("wheel", preventScroll);
      container.removeEventListener("touchmove", preventScroll);
      container.removeEventListener("scroll", preventScroll);
    };
  }, []);

  // Initialize game with default configuration and difficulty
  // Memoize config to only change when difficulty changes
  const config = useMemo(
    () => ({
      ...getDefaultConfig(difficulty), // Pass difficulty to get correct lane count
      difficulty,
    }),
    [difficulty],
  );

  const {
    isLoading,
    loadingError,
    jumpChicken,
    getCurrentMultiplier,
    finishCurrentLane,
    resetGame,
    registerCollisionCallback,
  } = useGame(canvasRef, config, containerRef);

  // Store game reference for responsive canvas hook
  useEffect(() => {
    if (window.__GAME_INSTANCE__) {
      gameRef.current = window.__GAME_INSTANCE__;
    }
  }, [isLoading]);

  // CRITICAL: Connect real-time resize handler for instant viewport updates
  // This enables live scaling without page refresh
  useResponsiveCanvas(canvasRef, containerRef, gameRef);

  // Notify parent when jump function is ready
  useEffect(() => {
    if (!isLoading && jumpChicken && onJumpReady && registerCollisionCallback) {
      onJumpReady(
        jumpChicken,
        getCurrentMultiplier,
        finishCurrentLane,
        resetGame,
        registerCollisionCallback,
      );
    }
  }, [
    isLoading,
    jumpChicken,
    getCurrentMultiplier,
    finishCurrentLane,
    resetGame,
    registerCollisionCallback,
    onJumpReady,
  ]);

  // Notify parent of loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange({ isLoading, loadingError });
    }
  }, [isLoading, loadingError, onLoadingChange]);

  return (
    <div ref={containerRef} className="canvas-game-container">
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
