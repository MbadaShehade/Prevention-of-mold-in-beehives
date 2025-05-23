import React from 'react';
import Image from 'next/image';
import './TelegramModals.css';

const TelegramModals = ({
  showTelegramSetupModal,
  showTelegramErrorModal,
  showChatIdInputModal,
  telegramErrorMessage,
  inputChatId,
  setInputChatId,
  handleModalOverlayClick,
  setShowTelegramSetupModal,
  setShowTelegramErrorModal,
  setShowChatIdInputModal,
  handleSetupTelegram,
  handleChatIdSubmit
}) => {
  return (
    <>
      {/* Custom Telegram Setup Modal */}
      {showTelegramSetupModal && (
        <div className="telegram-modal-overlay" onClick={handleModalOverlayClick}>
          <div className="telegram-modal">
            <div className="telegram-modal-content">
              <h3 className="telegram-modal-title">Telegram Setup Required</h3>
              <p>You need to set up your Telegram bot first. Would you like to do that now?</p>
              <div className="telegram-modal-buttons">
                <button 
                  onClick={() => setShowTelegramSetupModal(false)} 
                  className="telegram-modal-button cancel-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowTelegramSetupModal(false);
                    handleSetupTelegram();
                  }} 
                  className="telegram-modal-button confirm-button"
                >
                  <Image 
                    src={"/telegramIcon.png"} 
                    alt="Telegram"
                    width={16}
                    height={16}
                    style={{marginRight: '5px', borderRadius: '100%'}}
                  />
                  Setup Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Telegram Error Modal */}
      {showTelegramErrorModal && (
        <div className="telegram-modal-overlay" onClick={handleModalOverlayClick}>
          <div className="telegram-modal">
            <div className="telegram-modal-content">
              <h3 className="telegram-modal-title">Telegram Notification</h3>
              <p>{telegramErrorMessage}</p>
              <div className="telegram-modal-buttons">
                <button 
                  onClick={() => setShowTelegramErrorModal(false)} 
                  className="telegram-modal-button confirm-button"
                  style={{width: '100%'}}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Custom Chat ID Input Modal */}
      {showChatIdInputModal && (
        <div className="telegram-modal-overlay" onClick={handleModalOverlayClick}>
          <div className="telegram-modal">
            <div className="telegram-modal-content">
              <h3 className="telegram-modal-title">Telegram Chat ID</h3>
              <p>Contact our bot &quot;DailyBeeHiveReportbot&quot; and write /start. After that, please enter your Telegram chat ID. To get your ID, contact @userinfobot on Telegram.</p>
              <input
                type="text"
                className="telegram-input"
                value={inputChatId}
                onChange={(e) => setInputChatId(e.target.value)}
                placeholder="Enter your chat ID"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleChatIdSubmit();
                  }
                }}
              />
              <div className="telegram-modal-buttons" style={{marginTop: '20px'}}>
                <button 
                  onClick={() => setShowChatIdInputModal(false)} 
                  className="telegram-modal-button cancel-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleChatIdSubmit} 
                  className="telegram-modal-button confirm-button"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TelegramModals; 