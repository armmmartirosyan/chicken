import "./index.css";
import { DollarIcon } from "../DollarIcon";
import { useRef } from "react";
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

  return (
    <div className="header">
      <div className="logo-container">
        <img src={logoImg} alt="Chicken Road" className="logo" />
      </div>

      <div className="header-actions">
        <div className="balance">
          {formatBalance(balance)}
          <DollarIcon />
        </div>

        <Menu openHowToPlayModal={openHowToPlayModal} />
      </div>

      <LiveWinsTicker maxItems={8} />
    </div>
  );
}
