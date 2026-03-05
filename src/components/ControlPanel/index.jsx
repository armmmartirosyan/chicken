import "./index.css";

/**
 * Helper function to format currency with thousand separators
 */
const formatCurrency = (amount) => {
  return amount.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export function ControlPanel({
  onPlay,
  onCashout,
  gameState = "idle",
  currentWinValue = 0,
  goButtonDisabled = false,
  cashoutButtonDisabled = true,
}) {
  const isPlaying = gameState === "playing";

  return (
    <div className="control-panel">
      <div className="control-panel-content">
        <div
          className={`buttons ${isPlaying || gameState === "atFinish" ? "playing" : ""}`}
        >
          <button
            className="cashout-button"
            onClick={onCashout}
            onKeyDown={(e) => {
              e.preventDefault();
            }}
            disabled={cashoutButtonDisabled}
            style={{
              opacity: cashoutButtonDisabled ? 0.5 : 1,
              cursor: cashoutButtonDisabled ? "not-allowed" : "pointer",
            }}
          >
            CASH OUT
            <br />
            {formatCurrency(currentWinValue)} €
          </button>

          <button
            className={`play-button ${isPlaying ? "go-button" : ""}`}
            onClick={onPlay}
            onKeyDown={(e) => {
              e.preventDefault();
            }}
            disabled={goButtonDisabled}
            style={{
              opacity: goButtonDisabled ? 0.5 : 1,
              cursor: goButtonDisabled ? "not-allowed" : "pointer",
            }}
          >
            GO
          </button>
        </div>
      </div>
    </div>
  );
}
