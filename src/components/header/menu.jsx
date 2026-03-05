import { useRef, useState, useEffect } from "react";
import "./menu.css";
import { useOutsideClick } from "../../hooks";
import { Checkbox } from "../Checkbox";
import { ProvablySettings } from "./provably-settings";
import { GameRules } from "./game-rules";
import { settingsManager } from "../../services/SettingsManager.js";
import { ChangeAvatarModal } from "./change-avatar.jsx";
import { AVATARS } from "../../constants/gameConstants.js";
import { BetHistoryModal } from "./bet-history.jsx";

export function Menu() {
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const provablyRef = useRef(null);
  const gameRulesRef = useRef(null);
  const changeAvatarRef = useRef(null);
  const betHistoryRef = useRef(null);

  // Local state for settings (synced with SettingsManager)
  const [soundEnabled, setSoundEnabled] = useState(
    settingsManager.get("soundEnabled"),
  );
  const [musicEnabled, setMusicEnabled] = useState(
    settingsManager.get("musicEnabled"),
  );

  // Subscribe to settings changes
  useEffect(() => {
    const unsubscribeSound = settingsManager.subscribe(
      "soundEnabled",
      setSoundEnabled,
    );
    const unsubscribeMusic = settingsManager.subscribe(
      "musicEnabled",
      setMusicEnabled,
    );

    return () => {
      unsubscribeSound();
      unsubscribeMusic();
    };
  }, []);

  const handleOpenChangeAvatar = () => {
    if (changeAvatarRef.current) {
      dropdownRef.current.close();
      changeAvatarRef.current.showModal();
    }
  };

  const handleClick = () => {
    if (dropdownRef.current) {
      if (dropdownRef.current.open) {
        dropdownRef.current.close();
      } else {
        dropdownRef.current.show();
      }
    }
  };

  const handleClose = () => {
    if (dropdownRef.current.open) {
      dropdownRef.current.close();
    }
  };

  // Settings toggle handlers
  const handleToggleSound = (e) => {
    e.stopPropagation();
    settingsManager.toggle("soundEnabled");
  };

  const handleToggleMusic = (e) => {
    e.stopPropagation();
    settingsManager.toggle("musicEnabled");
  };

  useOutsideClick(dropdownRef, handleClose, menuRef);

  return (
    <div className="menu-button" onClick={handleClick} ref={menuRef}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          x1="2"
          y1="4.5"
          x2="16"
          y2="4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="2"
          y1="9"
          x2="16"
          y2="9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="2"
          y1="13.5"
          x2="16"
          y2="13.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <Dropdown
        ref={dropdownRef}
        openChangeAvatar={handleOpenChangeAvatar}
        soundEnabled={soundEnabled}
        musicEnabled={musicEnabled}
        onToggleSound={handleToggleSound}
        onToggleMusic={handleToggleMusic}
      />
      <ProvablySettings ref={provablyRef} />
      <GameRules ref={gameRulesRef} />
      <ChangeAvatarModal ref={changeAvatarRef} />
      <BetHistoryModal ref={betHistoryRef} />
    </div>
  );
}

function Dropdown({
  ref,
  openChangeAvatar,
  soundEnabled,
  musicEnabled,
  onToggleSound,
  onToggleMusic,
}) {
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(
    settingsManager.get("selectedAvatarIndex") || 0,
  );

  useEffect(() => {
    const unsubscribe = settingsManager.subscribe(
      "selectedAvatarIndex",
      setSelectedAvatarIndex,
    );
    return () => unsubscribe();
  }, []);

  return (
    <dialog
      ref={ref}
      className="MenuContainer"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="MenuHeader">
        <div className="MenuHeaderUserAvatar">
          <img src={AVATARS[selectedAvatarIndex]} alt="avatar" />
        </div>
        <div className="MenuHeaderUserName">Purple Visiting Koi</div>
        <div
          data-testid="menu-avatar-modal"
          className="MenuHeaderUserBtn"
          onClick={openChangeAvatar}
        >
          Change avatar
        </div>
      </div>
      <div className="MenuContent">
        <div className="MenuItemWithToggle">
          <div className="MenuItem">
            <span className="IconWrapper">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="iconDiver"
              >
                <path
                  d="M10.6663 5.66651C11.555 6.85185 11.555 9.14785 10.6663 10.3332M12.6663 3.33318C15.325 5.87185 15.341 10.1445 12.6663 12.6665M1.33301 9.97251V6.02651C1.33301 5.64385 1.63167 5.33318 1.99967 5.33318H4.39034C4.47856 5.33287 4.56581 5.31469 4.64681 5.27974C4.72782 5.2448 4.80091 5.19381 4.86167 5.12985L6.86167 2.87118C7.28167 2.43385 7.99967 2.74385 7.99967 3.36185V12.6378C7.99967 13.2605 7.27301 13.5678 6.85567 13.1218L4.86234 10.8758C4.8014 10.8101 4.72757 10.7575 4.64545 10.7215C4.56333 10.6855 4.47468 10.6668 4.38501 10.6665H1.99967C1.63167 10.6665 1.33301 10.3558 1.33301 9.97251Z"
                  stroke="white"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>Sound</span>
          </div>
          <Checkbox checked={soundEnabled} onChange={onToggleSound} />
        </div>
        <div className="MenuItemWithToggle">
          <div className="MenuItem">
            <span className="IconWrapper">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="iconDiver"
              >
                <path
                  d="M5.33301 11.9999V3.81054C5.33297 3.49201 5.44696 3.18399 5.65436 2.94223C5.86176 2.70048 6.14885 2.54095 6.46367 2.49254L12.4637 1.5692C12.6537 1.53998 12.8478 1.5522 13.0326 1.60501C13.2175 1.65782 13.3887 1.74998 13.5346 1.87517C13.6805 2.00036 13.7976 2.15562 13.8779 2.3303C13.9581 2.50498 13.9997 2.69496 13.9997 2.8872V10.6665"
                  stroke="white"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path d="M5.33301 5.99984L13.9997 4.6665" stroke="white"></path>
                <path
                  d="M5.33301 11.9997C5.33301 12.5301 5.12229 13.0388 4.74722 13.4139C4.37215 13.789 3.86344 13.9997 3.33301 13.9997C2.80257 13.9997 2.29387 13.789 1.91879 13.4139C1.54372 13.0388 1.33301 12.5301 1.33301 11.9997C1.33301 10.895 2.22834 10.6663 3.33301 10.6663C4.43767 10.6663 5.33301 10.895 5.33301 11.9997ZM13.9997 10.6663C13.9997 11.1968 13.789 11.7055 13.4139 12.0806C13.0388 12.4556 12.5301 12.6663 11.9997 12.6663C11.4692 12.6663 10.9605 12.4556 10.5855 12.0806C10.2104 11.7055 9.99967 11.1968 9.99967 10.6663C9.99967 9.56167 10.895 9.33301 11.9997 9.33301C13.1043 9.33301 13.9997 9.56167 13.9997 10.6663Z"
                  stroke="white"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </span>
            <span>Music</span>
          </div>
          <Checkbox checked={musicEnabled} onChange={onToggleMusic} />
        </div>
      </div>
    </dialog>
  );
}
