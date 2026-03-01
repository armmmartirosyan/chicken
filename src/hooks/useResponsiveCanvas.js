import { useEffect, useRef } from "react";

/**
 * useResponsiveCanvas - Real-time viewport scaling for fluid responsiveness
 * Implements instant resize updates using requestAnimationFrame
 * Optimized for vertical-anchor scaling system
 */
export function useResponsiveCanvas(
  canvasRef,
  containerRef,
  gameRef,
  options = {},
) {
  const rafIdRef = useRef(null);
  const {
    maintainAspectRatio = false,
    aspectRatio = 16 / 9,
    onResize = null,
  } = options;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const handleResize = () => {
      // Cancel any pending animation frame
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      // Use requestAnimationFrame for immediate, smooth updates
      rafIdRef.current = requestAnimationFrame(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;

        if (!container || !canvas) return;

        const containerRect = container.getBoundingClientRect();
        let width = containerRect.width;
        let height = containerRect.height;

        if (maintainAspectRatio) {
          const containerAspect = width / height;
          if (containerAspect > aspectRatio) {
            width = height * aspectRatio;
          } else {
            height = width / aspectRatio;
          }
        }

        // Update canvas display size (CSS)
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // IMMEDIATE viewport update for fluid responsiveness
        // Vertical-anchor system scales instantly based on viewport height
        const game = gameRef?.current;
        if (game && typeof game.updateViewport === "function") {
          game.updateViewport(width, height);
        }

        // Call custom resize callback
        if (onResize) {
          onResize(width, height);
        }
      });
    };

    // Initial resize
    handleResize();

    // Setup resize observer for more accurate detection
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Fallback to window resize event
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [
    canvasRef,
    containerRef,
    gameRef,
    maintainAspectRatio,
    aspectRatio,
    onResize,
  ]);
}
