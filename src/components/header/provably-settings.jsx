import "./provably.css";

const RANDOM_ON_EVERY_GAME = "700c3e3f3ff4f8bf";
const NEXT_SERVER_SEED_SHA256 =
  "ec13f382f8cf58ea011cbd2502b58b963623f60afe78dd6c703b73478592f5732965a48598815566d1989eb2419febbb57be0998d84fe0fc11f82e0f13b36c67";

export function ProvablySettings({ ref }) {
  const closeModal = () => {
    if (ref.current) {
      ref.current.close();
    }
  };

  const copyToClipboard = async (textToCopy) => {
    try {
      if ("clipboard" in navigator) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers (see Method 2)
        console.error("Clipboard API not supported");
      }
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <dialog
      ref={ref}
      className="generic-dialog provably-settings-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="generic-dialog-header">
        <h2 className="generic-dialog-header-text">Provably fair settings</h2>
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
        <p className="Text">
          This game uses Provably Fair technology to determine game result
        </p>
        <div>
          <h5 className="Title">Next client (Your) seed:</h5>
          <p className="Text">
            Round result is determined form combination of server seed and first
            3 bets of the round.
          </p>
          <h5 className="Title">Random on every game:</h5>
          <div className="InputCopyContainer">
            <div className="InputContainer">
              <div className="InputLabel">Current:</div>
              <input
                readOnly
                disabled
                className="InputStyled"
                value={RANDOM_ON_EVERY_GAME}
              />
              <div
                className="InputIcon"
                onClick={() => copyToClipboard(RANDOM_ON_EVERY_GAME)}
              >
                <svg
                  width="14"
                  height="16"
                  viewBox="0 0 14 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.33594 2.66683V10.6668C4.33594 11.0205 4.47641 11.3596 4.72646 11.6096C4.97651 11.8597 5.31565 12.0002 5.66927 12.0002H11.0026C11.3562 12.0002 11.6954 11.8597 11.9454 11.6096C12.1955 11.3596 12.3359 11.0205 12.3359 10.6668V4.82816C12.3359 4.65054 12.3004 4.4747 12.2315 4.31099C12.1626 4.14728 12.0616 3.99899 11.9346 3.87483L9.7246 1.7135C9.47551 1.46993 9.14099 1.33354 8.7926 1.3335H5.66927C5.31565 1.3335 4.97651 1.47397 4.72646 1.72402C4.47641 1.97407 4.33594 2.31321 4.33594 2.66683V2.66683Z"
                    stroke="#ffffff"
                  ></path>
                  <path
                    d="M9.66797 12.0003V13.3337C9.66797 13.6873 9.52749 14.0264 9.27744 14.2765C9.0274 14.5265 8.68826 14.667 8.33464 14.667H3.0013C2.64768 14.667 2.30854 14.5265 2.05849 14.2765C1.80844 14.0264 1.66797 13.6873 1.66797 13.3337V6.00033C1.66797 5.6467 1.80844 5.30756 2.05849 5.05752C2.30854 4.80747 2.64768 4.66699 3.0013 4.66699H4.33464"
                    stroke="#ffffff"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h5 className="Title">Next server seed SHA256:</h5>
          <div className="InputContainer">
            <input
              readOnly
              disabled
              className="InputStyled"
              value={NEXT_SERVER_SEED_SHA256}
            />
            <div
              className="InputIcon"
              onClick={() => copyToClipboard(NEXT_SERVER_SEED_SHA256)}
            >
              <svg
                width="14"
                height="16"
                viewBox="0 0 14 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.33594 2.66683V10.6668C4.33594 11.0205 4.47641 11.3596 4.72646 11.6096C4.97651 11.8597 5.31565 12.0002 5.66927 12.0002H11.0026C11.3562 12.0002 11.6954 11.8597 11.9454 11.6096C12.1955 11.3596 12.3359 11.0205 12.3359 10.6668V4.82816C12.3359 4.65054 12.3004 4.4747 12.2315 4.31099C12.1626 4.14728 12.0616 3.99899 11.9346 3.87483L9.7246 1.7135C9.47551 1.46993 9.14099 1.33354 8.7926 1.3335H5.66927C5.31565 1.3335 4.97651 1.47397 4.72646 1.72402C4.47641 1.97407 4.33594 2.31321 4.33594 2.66683V2.66683Z"
                  stroke="#ffffff"
                ></path>
                <path
                  d="M9.66797 12.0003V13.3337C9.66797 13.6873 9.52749 14.0264 9.27744 14.2765C9.0274 14.5265 8.68826 14.667 8.33464 14.667H3.0013C2.64768 14.667 2.30854 14.5265 2.05849 14.2765C1.80844 14.0264 1.66797 13.6873 1.66797 13.3337V6.00033C1.66797 5.6467 1.80844 5.30756 2.05849 5.05752C2.30854 4.80747 2.64768 4.66699 3.0013 4.66699H4.33464"
                  stroke="#ffffff"
                ></path>
              </svg>
            </div>
          </div>
        </div>
        <p className="SubText">
          You can check fairness of each bet from bets history
        </p>
      </div>
    </dialog>
  );
}
