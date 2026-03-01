import { useState, useEffect } from "react";
import { DollarIcon } from "../DollarIcon";
import "./bet-history.css";
import { betHistoryManager } from "../../services/BetHistoryManager.js";

export function BetHistoryModal({ ref }) {
  const [history, setHistory] = useState(() => betHistoryManager.getHistory());
  const [visibleCount, setVisibleCount] = useState(12);

  // Subscribe to history changes
  useEffect(() => {
    const unsubscribe = betHistoryManager.subscribe((newHistory) => {
      setHistory(newHistory);
    });

    return () => unsubscribe();
  }, []);

  const closeModal = () => {
    if (ref.current) {
      ref.current.close();
    }
  };

  const loadMore = () => {
    setVisibleCount((prev) => prev + 12);
  };

  const visibleHistory = history.slice(0, visibleCount);

  return (
    <dialog
      ref={ref}
      className="generic-dialog bet-history-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="generic-dialog-header">
        <h2 className="generic-dialog-header-text">My bet history</h2>
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
      <div data-testid="modal-bet-history-entry" className="HistoryTable">
        <div className="HistoryTableHeader">
          <div>Date</div>
          <div>Bet</div>
          <div>Mult.</div>
          <div>Win</div>
        </div>
        <div className="CustomScrollStylesParent">
          <div className="CustomScrollStyles">
            <div className="HistoryBody">
              {visibleHistory.length === 0 ? (
                <div className="HistoryEmptyState">
                  <p>No bet history yet. Play your first game!</p>
                </div>
              ) : (
                visibleHistory.map((bet) => {
                  const { time, date } =
                    betHistoryManager.constructor.formatDate(bet.date);

                  // Check if bet is from today
                  const betDate = new Date(bet.date);
                  const today = new Date();
                  const isToday =
                    betDate.getDate() === today.getDate() &&
                    betDate.getMonth() === today.getMonth() &&
                    betDate.getFullYear() === today.getFullYear();

                  return (
                    <div key={bet.id} className="Row HistoryTableBodyRow">
                      <div className="HistoryTableBodyCellDate">
                        <span
                          className={isToday ? "time-today" : "time-not-today"}
                        >
                          {time}&nbsp;
                        </span>
                        <span
                          className={isToday ? "date-today" : "date-not-today"}
                        >
                          {date}
                        </span>
                      </div>
                      <div className="HistoryTableBodyCellBet">
                        <div className="CellAmountContainer">
                          <DollarIcon />
                          {bet.betAmount}
                        </div>
                      </div>
                      <div className="CoefContainer">
                        x{bet.multiplier.toFixed(2)}
                      </div>
                      <div className="HistoryTableBodyRowWin">
                        {bet.winAmount > 0 ? (
                          <div className="CellAmountContainer">
                            <DollarIcon />
                            {bet.winAmount.toFixed(2)}
                          </div>
                        ) : (
                          <span className="DashStyles">–</span>
                        )}
                      </div>
                      <div
                        data-testid="fairness-icon"
                        className="HistoryTableBodyCellIcon"
                      >
                        <span>
                          <span className="IconWrapper">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="iconDiver pointer fillHover"
                            >
                              <path
                                d="M7 8.295L5.705 7L5 7.705L7 9.705L11 5.705L10.295 5L7 8.295Z"
                                fill="white"
                              ></path>
                              <path
                                d="M8 15L4.912 13.3535C4.03167 12.8852 3.29549 12.1859 2.78246 11.3309C2.26944 10.4758 1.99894 9.49716 2 8.5V2C2.00027 1.73486 2.10571 1.48066 2.29319 1.29319C2.48067 1.10571 2.73487 1.00026 3 1H13C13.2651 1.00026 13.5193 1.10571 13.7068 1.29319C13.8943 1.48066 13.9997 1.73486 14 2V8.5C14.0011 9.49716 13.7306 10.4758 13.2175 11.3309C12.7045 12.1859 11.9683 12.8852 11.088 13.3535L8 15ZM3 2V8.5C2.99917 9.3159 3.22055 10.1166 3.64038 10.8162C4.06021 11.5158 4.66264 12.0879 5.383 12.471L8 13.8665L10.617 12.4715C11.3374 12.0883 11.9399 11.5162 12.3597 10.8165C12.7796 10.1168 13.0009 9.31599 13 8.5V2H3Z"
                                fill="white"
                              ></path>
                            </svg>
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      <button className="Button" onClick={loadMore}>
        Load more
      </button>
    </dialog>
  );
}
