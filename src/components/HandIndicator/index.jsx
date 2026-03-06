import { memo, useLayoutEffect, useRef, useState, useEffect } from "react";
import "./index.css";

// New high-quality finger asset
const FINGER_IMAGE =
  "data:image/png;base64,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";

/**
 * HandIndicator - Animated hand pointer for UI guidance
 * Points to target button with GPU-accelerated animations
 */
export const HandIndicator = memo(function HandIndicator({
  targetButton, // "GO", "CASHOUT", "CLAIM", or "NEXT"
  visible = false,
}) {
  const handRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle visibility transitions smoothly
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTransitioning(!visible);
  }, [visible]);

  useLayoutEffect(() => {
    if (!handRef.current) return;

    const updatePosition = () => {
      const button = document.querySelector(
        targetButton === "GO"
          ? ".play-button"
          : targetButton === "CLAIM"
            ? ".claim-bonus-button"
            : targetButton === "NEXT"
              ? ".payout-modal-button"
              : ".cashout-button",
      );

      if (button && handRef.current) {
        const rect = button.getBoundingClientRect();

        // Padding compensation constants - accounting for transparent space in PNG
        const PADDING_COMPENSATION_X = -35; // Offset to align finger tip with button edge
        const PADDING_COMPENSATION_Y = -10; // Vertical centering adjustment

        // Calculate right-center position for all buttons
        const targetX = rect.right + PADDING_COMPENSATION_X;
        const targetY = rect.top + rect.height / 2 + PADDING_COMPENSATION_Y;

        // Position finger at right-center of button (no rotation, same orientation for all)
        handRef.current.style.left = `${targetX}px`;
        handRef.current.style.top = `${targetY}px`;
      }
    };

    // Initial position update with delay to ensure DOM is loaded
    const timeoutId = setTimeout(updatePosition, 100);

    window.addEventListener("resize", updatePosition);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updatePosition);
    };
  }, [targetButton]);

  return (
    <div
      ref={handRef}
      className={`hand-indicator ${visible && !isTransitioning ? "visible" : "hidden"}`}
      style={{
        transition: "opacity 0.3s ease, left 0.4s ease, top 0.4s ease",
      }}
    >
      <img src={FINGER_IMAGE} alt="Tutorial finger" className="hand-image" />
    </div>
  );
});
