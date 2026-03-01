import "./index.css";
import { DollarIcon } from "../DollarIcon";
import { useRef } from "react";
import { HowToPlayModal } from "./how-to-play-modal";
import { LiveWinsTicker } from "../LiveWinsTicker";
import { Menu } from "./menu";
import logoImg from "../../assets/logo.png";

export function Header({ balance }) {
  const howToPlayModalRef = useRef(null);

  const formatBalance = (num) => {
    // Round to 2 decimal places for display
    const rounded = Math.round(num * 100) / 100;
    // Format with spaces for thousands and 2 decimal places
    return rounded.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const openHowToPlayModal = () => {
    if (howToPlayModalRef.current) {
      howToPlayModalRef.current.showModal();
    }
  };

  const handleFullScreen = () => {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } else {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        /* Firefox */
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        /* Chrome, Safari and Opera */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        /* IE/Edge */
        elem.msRequestFullscreen();
      }
    }
  };

  return (
    <div className="header">
      <div className="logo-container">
        <img src={logoImg} alt="Chicken Road" className="logo" />
      </div>

      <div className="header-actions">
        <div className="how-to-play" onClick={openHowToPlayModal}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="8"
              cy="8"
              r="7"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M8 11V8M8 5H8.01"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>How to play?</span>
        </div>

        <div className="balance">
          {formatBalance(balance)}
          <DollarIcon />
        </div>

        <div className="fullscreen-button" onClick={handleFullScreen}>
          <svg
            width="12"
            height="13"
            viewBox="0 0 12 13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.33268 5.1665L11.3327 1.1665M11.3327 1.1665H8.33268M11.3327 1.1665V4.1665M0.666016 1.1665L4.66602 5.1665M0.666016 1.1665V4.1665M0.666016 1.1665H3.66602M7.33268 7.83317L11.3327 11.8332M11.3327 11.8332V8.83317M11.3327 11.8332H8.33268M4.66602 7.83317L0.666016 11.8332M0.666016 11.8332H3.66602M0.666016 11.8332L0.666016 8.83317"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
          </svg>
        </div>

        <Menu openHowToPlayModal={openHowToPlayModal} />
      </div>

      <HowToPlayModal ref={howToPlayModalRef} />
      <LiveWinsTicker maxItems={8} />
    </div>
  );
}
