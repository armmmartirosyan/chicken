import { memo } from "react";
import { audioEngine } from "../../services/AudioEngine.js";
import "./index.css";

/**
 * PayoutModal - Payout milestone modal for guided first game
 * Shows at lanes 2 and 4 to guide new players through their first win
 */
export const PayoutModal = memo(function PayoutModal({ visible, onNext }) {
  if (!visible) return null;

  const handleNext = () => {
    // Play button click sound
    audioEngine.onButtonClick();
    // Trigger next callback
    if (onNext) {
      onNext();
    }
  };

  return (
    <>
      {/* Full-screen overlay */}
      <div className="payout-modal-overlay" />

      {/* Modal dialog */}
      <div className="payout-modal-container">
        <div className="payout-modal-dialog">
          <div className="payout-modal-content">
            <div className="payout-modal-box">
              <h1 className="payout-modal-title">FIRST PAYOUTS</h1>
              <h1 className="payout-modal-text">DIRECTLY TO</h1>
              <div className="payout-modal-lane">YOUR CARD!</div>
            </div>
            <button className="payout-modal-button" onClick={handleNext}>
              NEXT
            </button>
          </div>
        </div>
      </div>
    </>
  );
});
