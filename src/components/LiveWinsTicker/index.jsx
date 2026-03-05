import { memo, useState, useEffect } from "react";
import { gameEvents } from "../../game/core/GameEventBus.js";
import "./index.css";

/**
 * WinItem - Memoized individual win display
 * Shows actual win data with animation
 */
const WinItem = memo(function WinItem({ win }) {
  if (!win) return null;

  return (
    <div className="UserLine win-item-animate">
      <div className="ElementRoot">
        <img src={win.avatar} alt="User avatar" className="UserAvatar" />
        <img
          alt="User flag"
          src={win.flag}
          loading="lazy"
          decoding="async"
          className="FlagImage"
        />
      </div>
      <span className="UserName">{win.name}</span>
      <span className="UserAmount">+{win.amount.toFixed(2)}€</span>
    </div>
  );
});

/**
 * LiveWinsTicker - Social Proof Component
 * Displays one win at a time with automatic cycling every 3 seconds
 */
export function LiveWinsTicker() {
  const [currentWin, setCurrentWin] = useState(null);
  const [onlineCount, setOnlineCount] = useState(11505);

  // Update online count randomly every 5-10 seconds
  useEffect(() => {
    const updateOnlineCount = () => {
      // Random change between -50 to +100
      const change = Math.floor(Math.random() * 150) - 50;
      setOnlineCount((prev) => Math.max(10000, Math.min(15000, prev + change)));
    };

    const interval = setInterval(
      updateOnlineCount,
      5000 + Math.random() * 5000,
    );
    return () => clearInterval(interval);
  }, []);

  // Handle incoming wins - show each win for 3 seconds
  useEffect(() => {
    let hideTimeout;

    const handleWin = (win) => {
      setCurrentWin(win);

      // Hide after 3 seconds
      hideTimeout = setTimeout(() => {
        setCurrentWin(null);
      }, 3000);
    };

    const unsubscribe = gameEvents.on("live:win", handleWin);

    return () => {
      unsubscribe();
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, []);

  return (
    <div className="live-wins-ticker">
      <div className="TitleLine">
        <span>Live wins</span>
        <div className="OnlineBlock">
          <div className="SignalWrapper">
            <div className="SignalPulse"></div>
            <div className="SignalBase"></div>
          </div>
          <span>Online: {onlineCount}</span>
        </div>
      </div>
      {currentWin && <WinItem win={currentWin} />}
    </div>
  );
}
