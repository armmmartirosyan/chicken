import { useState, useEffect } from "react";
import "./index.css";

export function AnimatedChicken({ animation = "idle" }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    // Idle animation loop
    if (animation === "idle") {
      const interval = setInterval(() => {
        setFrame((prev) => (prev + 1) % 3); // 3 frame idle animation
      }, 400); // Change frame every 400ms

      return () => clearInterval(interval);
    }
  }, [animation]);

  return (
    <div className={`animated-chicken ${animation}`}>
      <div className="chicken-sprite-container">
        {/* Shadow */}
        <div className="chicken-shadow"></div>

        {/* Chicken body composition */}
        <div className="chicken-body">
          {/* Body */}
          <div className={`chicken-part body frame-${frame}`}>
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
              <ellipse
                cx="50"
                cy="55"
                rx="32"
                ry="28"
                fill="#FEFEFE"
                stroke="#2a2a2a"
                strokeWidth="2.5"
              />
            </svg>
          </div>

          {/* Head with bob animation */}
          <div className={`chicken-part head frame-${frame}`}>
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <circle
                cx="30"
                cy="30"
                r="20"
                fill="#FEFEFE"
                stroke="#2a2a2a"
                strokeWidth="2.5"
              />

              {/* Comb */}
              <path
                d="M18 18 Q20 10 22 18 Q24 10 26 18 Q28 8 30 18 Q32 10 34 18 Q36 10 38 18 Q40 10 42 18"
                fill="#E74C3C"
                stroke="#C0392B"
                strokeWidth="1.8"
              />

              {/* Beak */}
              <path
                d="M45 30 L55 31 L45 32 Z"
                fill="#F39C12"
                stroke="#D68910"
                strokeWidth="1.2"
              />

              {/* Eye with blink */}
              <circle
                cx="38"
                cy="26"
                r="4"
                fill="#2C3E50"
                className="chicken-eye"
              />
              <circle
                cx="40"
                cy="24"
                r="1.5"
                fill="#ECF0F1"
                className="eye-shine"
              />

              {/* Wattle */}
              <ellipse
                cx="40"
                cy="40"
                rx="4"
                ry="6"
                fill="#E74C3C"
                stroke="#C0392B"
                strokeWidth="1.2"
              />
            </svg>
          </div>

          {/* Wing with flap animation */}
          <div className={`chicken-part wing frame-${frame}`}>
            <svg width="50" height="60" viewBox="0 0 50 60" fill="none">
              <ellipse
                cx="25"
                cy="30"
                rx="15"
                ry="22"
                fill="#F8F8F8"
                stroke="#2a2a2a"
                strokeWidth="2"
                transform="rotate(15 25 30)"
              />
            </svg>
          </div>

          {/* Tail feathers */}
          <div className={`chicken-part tail frame-${frame}`}>
            <svg width="40" height="50" viewBox="0 0 40 50" fill="none">
              <path
                d="M5 25 Q0 15 3 10 Q1 20 5 25"
                fill="#F8F8F8"
                stroke="#2a2a2a"
                strokeWidth="1.5"
              />
              <path
                d="M3 30 Q-2 22 0 16 Q-1 26 3 30"
                fill="#F8F8F8"
                stroke="#2a2a2a"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Feet */}
          <div className={`chicken-part feet frame-${frame}`}>
            <svg width="80" height="30" viewBox="0 0 80 30" fill="none">
              <path
                d="M25 5 L23 20 M25 5 L27 20 M25 5 L25 20"
                stroke="#F39C12"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M55 5 L53 20 M55 5 L57 20 M55 5 L55 20"
                stroke="#F39C12"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
