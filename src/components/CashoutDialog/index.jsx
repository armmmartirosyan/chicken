import "./index.css";
import logo from "../../assets/cashout-logo.webp";
import playMarket from "../../assets/play-market.webp";
import appStore from "../../assets/app-store.webp";

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
const CashoutDialog = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="cashout-dialog-container">
      <img
        src={logo}
        alt="Cashout Celebration"
        className="cashout-dialog-logo"
      />

      <div className="cashout-dialog-content">
        <div className="cashout-dialog-box">
          <h1 className="cashout-dialog-title">TAKE</h1>
          <h1 className="cashout-dialog-text">1500 €</h1>
          <div className="cashout-dialog-lane">250 FS</div>
        </div>
        <button className="cashout-dialog-button">TAKE</button>
      </div>

      <div className="cashout-dialog-actions">
        <a href="" target="blank" className="cashout-dialog-btn">
          <img
            src={appStore}
            alt="App store"
            className="cashout-dialog-btn-image"
          />
        </a>
        <a href="" target="blank" className="cashout-dialog-btn">
          <img
            src={playMarket}
            alt="Play market"
            className="cashout-dialog-btn-image"
          />
        </a>
      </div>
    </div>
  );
};

export default CashoutDialog;
