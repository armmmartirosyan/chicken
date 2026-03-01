import "./game-rules.css";

export function GameRules({ ref }) {
  const closeModal = () => {
    if (ref.current) {
      ref.current.close();
    }
  };

  return (
    <dialog
      ref={ref}
      className="generic-dialog game-rules-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="generic-dialog-header">
        <h2 className="generic-dialog-header-text">Game rules</h2>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
          className="generic-dialog-x"
          onClick={closeModal}
        >
          <path d="M4.14979 3.20716C4.02405 3.08572 3.85565 3.01853 3.68085 3.02004C3.50606 3.02156 3.33885 3.09168 3.21524 3.21528C3.09164 3.33889 3.02152 3.5061 3.02001 3.68089C3.01849 3.85569 3.08568 4.02409 3.20712 4.14983L7.05712 7.99983L3.20645 11.8498C3.14278 11.9113 3.09199 11.9849 3.05705 12.0662C3.02211 12.1476 3.00372 12.235 3.00295 12.3236C3.00219 12.4121 3.01905 12.4999 3.05257 12.5818C3.08609 12.6637 3.1356 12.7382 3.19819 12.8008C3.26079 12.8634 3.33522 12.9129 3.41715 12.9464C3.49908 12.9799 3.58687 12.9968 3.67539 12.996C3.76391 12.9952 3.85139 12.9768 3.93272 12.9419C4.01406 12.907 4.08762 12.8562 4.14912 12.7925L7.99979 8.94249L11.8498 12.7925C11.9755 12.9139 12.1439 12.9811 12.3187 12.9796C12.4935 12.9781 12.6607 12.908 12.7843 12.7844C12.9079 12.6608 12.9781 12.4936 12.9796 12.3188C12.9811 12.144 12.9139 11.9756 12.7925 11.8498L8.94245 7.99983L12.7925 4.14983C12.9139 4.02409 12.9811 3.85569 12.9796 3.68089C12.9781 3.5061 12.9079 3.33889 12.7843 3.21528C12.6607 3.09168 12.4935 3.02156 12.3187 3.02004C12.1439 3.01853 11.9755 3.08572 11.8498 3.20716L7.99979 7.05716L4.14979 3.20649V3.20716Z"></path>
        </svg>
      </div>

      {/*  */}

      <div className="Content">
        <p className="Text">Bet limits are presented below</p>
        <div className="InputContainer">
          <div className="InputLabel">Min bet:</div>
          <input disabled className="InputStyled" value="0.01 USD" />
        </div>
        <div className="InputContainer">
          <div className="InputLabel">Max bet:</div>
          <input disabled className="InputStyled" value="200 USD" />
        </div>
        <div className="InputContainer">
          <div className="InputLabel">Max win:</div>
          <input disabled className="InputStyled" value="20&nbsp;000 USD" />
        </div>
        <p className="Text">Malfunction voids all pays and plays</p>
      </div>
    </dialog>
  );
}
