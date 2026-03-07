import "./index.css";

/**
 * CashoutDialog - Post-cashout celebration dialog
 *
 * Displays after cashout animation completes, showing the player
 * their winnings and providing options to continue or exit.
 *
 * Architecture:
 * - Semi-transparent overlay blocks all background interaction
 * - Centered using same pattern as WelcomeModal
 * - Content div left empty per MASTER DIRECTIVE (ready for customization)
 * - Responsive and maintains centering on window resize
 *
 * State Management:
 * - Controlled via showCashoutDialog in parent (App.jsx)
 * - Shown after cashoutAnimation.onComplete callback triggers
 */
const CashoutDialog = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent overlay - blocks all interaction */}
      <div className="cashout-dialog-overlay" onClick={onClose} />

      {/* Modal container - centers dialog */}
      <div className="cashout-dialog-container">
        <div className="cashout-dialog-box">
          {/* Empty content div per MASTER DIRECTIVE */}
          {/* Ready for customization - add win amount display, buttons, etc. */}
          <div className="cashout-dialog-content">
            {/* Temporary test content - shows dialog is working */}
            <div
              style={{ color: "white", fontSize: "24px", marginBottom: "20px" }}
            >
              🎉 Cashout Successful! 🎉
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "10px 30px",
                fontSize: "16px",
                cursor: "pointer",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CashoutDialog;
