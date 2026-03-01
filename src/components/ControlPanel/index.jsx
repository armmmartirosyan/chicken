import { useState, useEffect, useRef } from "react";
import { DollarIcon } from "../DollarIcon";
import "./index.css";
import { useOutsideClick } from "../../hooks";
import { settingsManager } from "../../services/SettingsManager.js";

/**
 * Helper function to round currency to 2 decimal places
 * Prevents floating-point precision issues
 */
const roundCurrency = (amount) => {
  return Math.round(amount * 100) / 100;
};

const BET_OPTIONS = [0.5, 1, 2, 7];
const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard", "Hardcore"];

export function ControlPanel({
  betAmount,
  setBetAmount,
  difficulty,
  setDifficulty,
  onPlay,
  onCashout,
  gameState = "idle",
  disabled = false,
  currentMultiplier = 1.0,
  goButtonDisabled = false,
  cashoutButtonDisabled = true,
}) {
  const [sliderValue, setSliderValue] = useState(1);

  // Sync slider value with bet amount
  useEffect(() => {
    setSliderValue(betAmount);
  }, [betAmount]);

  const handleSliderChange = (value) => {
    const newValue = parseFloat(value);
    setSliderValue(newValue);
    setBetAmount(newValue);
  };

  const isPlaying = gameState === "playing";
  const buttonText = isPlaying ? "GO" : "Play";

  // Calculate cashout value with proper rounding
  const cashoutValue = roundCurrency(betAmount * currentMultiplier);

  return (
    <div className="control-panel">
      <div className="control-panel-content">
        {/* Bet Amount and Slider Section */}
        <div className={`bet-section ${disabled ? "disabled" : ""}`}>
          <div className="slider-container" disabled={disabled}>
            <button
              className="slider-label"
              onClick={() => !disabled && handleSliderChange(0.01)}
              disabled={disabled}
            >
              MIN
            </button>
            <div className="slider-value">{sliderValue}</div>
            <button
              className="slider-label"
              onClick={() => !disabled && handleSliderChange(200)}
              disabled={disabled}
            >
              MAX
            </button>
          </div>

          <div className="bet-buttons">
            {BET_OPTIONS.map((amount) => (
              <button
                key={amount}
                className={`bet-button ${betAmount === amount ? "active" : ""}`}
                onClick={() => !disabled && setBetAmount(amount)}
                disabled={disabled}
              >
                {amount} <DollarIcon size="large" />
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Section */}
        <div className="difficulty-section">
          <div className="section-header">
            <span>Difficulty</span>
            <span className="chance">Chance of being shot down</span>
          </div>
          <div className={`difficulty-buttons ${disabled ? "disabled" : ""}`}>
            {DIFFICULTY_LEVELS.map((level) => (
              <span
                key={level}
                className={`difficulty-button ${difficulty === level ? "active" : ""}`}
                onClick={() => !disabled && setDifficulty(level)}
                disabled={disabled}
              >
                {level}
              </span>
            ))}
          </div>
        </div>

        {!isPlaying && gameState !== "atFinish" ? (
          <DifficultyLevelSelect
            level={difficulty}
            setDifficulty={setDifficulty}
          />
        ) : null}

        <div
          className={`buttons ${isPlaying || gameState === "atFinish" ? "playing" : ""}`}
        >
          {(isPlaying || gameState === "atFinish") && (
            <button
              className="cashout-button"
              onClick={onCashout}
              onKeyDown={(e) => {
                // Prevent Space key default behavior when setting is disabled
                if (
                  e.code === "Space" &&
                  !settingsManager.get("spaceToPlayEnabled")
                ) {
                  e.preventDefault();
                }
              }}
              disabled={cashoutButtonDisabled}
              style={{
                opacity: cashoutButtonDisabled ? 0.5 : 1,
                cursor: cashoutButtonDisabled ? "not-allowed" : "pointer",
              }}
            >
              CASH OUT
              <br />
              {cashoutValue.toFixed(2)} USD
            </button>
          )}

          <button
            className={`play-button ${isPlaying ? "go-button" : ""}`}
            onClick={onPlay}
            onKeyDown={(e) => {
              // Prevent Space key default behavior when setting is disabled
              if (
                e.code === "Space" &&
                !settingsManager.get("spaceToPlayEnabled")
              ) {
                e.preventDefault();
              }
            }}
            disabled={goButtonDisabled}
            style={{
              opacity: goButtonDisabled ? 0.5 : 1,
              cursor: goButtonDisabled ? "not-allowed" : "pointer",
            }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

function DifficultyLevelSelect({ level, setDifficulty }) {
  const dialogRef = useRef(null);
  const parentRef = useRef(null);

  const handleClick = () => {
    if (dialogRef.current) {
      if (dialogRef.current.open) {
        dialogRef.current.close();
      } else {
        dialogRef.current.show();
      }
    }
  };

  const handleOptionClick = (e, diff) => {
    e.stopPropagation();
    if (diff === level) {
      return;
    }

    dialogRef.current.close();
    setDifficulty(diff);
  };

  const handleClose = () => {
    if (dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close();
    }
  };

  useOutsideClick(dialogRef, handleClose, parentRef);

  return (
    <div className="difficulty-level-select">
      <div
        className="difficulty-level-value"
        onClick={handleClick}
        ref={parentRef}
      >
        <dialog className="difficulty-level-content" ref={dialogRef}>
          {DIFFICULTY_LEVELS.map((diff) => (
            <div
              key={diff}
              className="difficulty-level-option"
              onClick={(e) => handleOptionClick(e, diff)}
            >
              {diff}
              {diff === level && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="difficulty-level-check"
                >
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              )}
            </div>
          ))}
        </dialog>
        <span className="difficulty-level-text">{level}</span>
        <svg
          height="20"
          width="20"
          viewBox="0 0 20 20"
          focusable="false"
          className="difficulty-level-angle"
        >
          <path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z"></path>
        </svg>
      </div>
    </div>
  );
}
