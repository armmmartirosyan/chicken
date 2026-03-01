import { memo, useLayoutEffect, useRef } from "react";
import "./index.css";

/**
 * HandIndicator - Animated hand pointer for UI guidance
 * Points to target button with GPU-accelerated animations
 */
export const HandIndicator = memo(function HandIndicator({
  targetButton, // "GO" or "CASHOUT"
  visible = false,
}) {
  const handRef = useRef(null);

  useLayoutEffect(() => {
    if (!visible || !targetButton || !handRef.current) return;

    const updatePosition = () => {
      const button = document.querySelector(
        targetButton === "GO" ? ".play-button" : ".cashout-button",
      );

      if (button && handRef.current) {
        const rect = button.getBoundingClientRect();

        // Position based on target button
        if (targetButton === "GO") {
          // GO button: hand points from left to right (80px left of button)
          handRef.current.style.left = `${rect.left - 80}px`;
          handRef.current.classList.remove("pointing-left");
        } else {
          // CASHOUT button: hand points from right to left (80px right of button)
          handRef.current.style.left = `${rect.right + 80}px`;
          handRef.current.classList.add("pointing-left");
        }

        handRef.current.style.top = `${rect.top + rect.height / 2 - 30}px`;
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [visible, targetButton]);

  if (!visible) return null;

  return (
    <div ref={handRef} className="hand-indicator">
      <div className="hand-emoji">👉</div>
    </div>
  );
});
