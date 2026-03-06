import { memo } from "react";
import { audioEngine } from "../../services/AudioEngine.js";
import "./index.css";

// Truncated Base64 dialog background - full string provided by user
const DIALOG_BG = "data:image/webp;base64,UklGRjrSAAB..."; // Using user's base64
// Truncated Base64 button background - full string provided by user
const BUTTON_BG = "data:image/webp;base64,UklGRsR1AAB..."; // Using user's base64

/**
 * WelcomeModal - Welcome bonus onboarding modal
 * Shows immediately after loading, blocks all game interactions
 */
export const WelcomeModal = memo(function WelcomeModal({ visible, onClaim }) {
  if (!visible) return null;

  const handleClaim = () => {
    // Play button click sound
    audioEngine.onButtonClick();
    // Trigger claim callback
    if (onClaim) {
      onClaim();
    }
  };

  return (
    <>
      {/* Full-screen overlay */}
      <div className="welcome-modal-overlay" />

      {/* Modal dialog */}
      <div className="welcome-modal-container">
        <div className="welcome-modal-dialog">
          <div className="welcome-modal-content">
            <div className="welcome-modal-box">
              <h1 className="welcome-modal-title">WELCOME BONUS</h1>
              <h1 className="welcome-modal-text">CLAIM BONUS</h1>
              <div className="welcome-modal-amount">1500€</div>
            </div>
            <button
              className="welcome-modal-button claim-bonus-button"
              onClick={handleClaim}
            >
              CLAIM BONUS
            </button>
          </div>
        </div>
      </div>
    </>
  );
});
