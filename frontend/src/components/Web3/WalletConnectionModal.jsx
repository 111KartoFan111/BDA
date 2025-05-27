// frontend/src/components/Web3/WalletConnectionModal.jsx
import React, { useState, useEffect } from 'react'
import { 
  X, 
  Smartphone, 
  Monitor, 
  Download, 
  ExternalLink,
  Wallet,
  QrCode,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import Modal from '../UI/Modal/Modal'
import Button from '../UI/Button/Button'
import Card from '../UI/Card/Card'
import { 
  detectAvailableWallets, 
  walletManager, 
  getWalletRecommendations,
  isMobileEnvironment,
  openWalletApp,
  WALLET_TYPES 
} from '../../services/blockchain/walletConnectors'
import styles from './WalletConnectionModal.module.css'

const WalletConnectionModal = ({ isOpen, onClose, onConnect }) => {
  const [availableWallets, setAvailableWallets] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [connecting, setConnecting] = useState(false)
  const [currentStep, setCurrentStep] = useState('select') // 'select', 'install', 'connecting'
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const wallets = detectAvailableWallets()
      const recs = getWalletRecommendations()
      
      setAvailableWallets(wallets)
      setRecommendations(recs)
      setCurrentStep('select')
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  const handleWalletSelect = async (wallet) => {
    setSelectedWallet(wallet)
    setError('')
    
    if (!wallet.available) {
      setCurrentStep('install')
      return
    }

    await connectWallet(wallet.type)
  }

  const connectWallet = async (walletType) => {
    setConnecting(true)
    setCurrentStep('connecting')
    setError('')

    try {
      const result = await walletManager.connect(walletType)
      
      setSuccess(true)
      setTimeout(() => {
        onConnect(result)
        onClose()
      }, 1500)
      
    } catch (error) {
      setError(error.message)
      setCurrentStep('select')
    } finally {
      setConnecting(false)
    }
  }

  const handleInstallWallet = (downloadUrl) => {
    window.open(downloadUrl, '_blank')
  }

  const handleTryAgain = () => {
    setCurrentStep('select')
    setError('')
    setSelectedWallet(null)
  }

  const renderWalletList = () => (
    <div className={styles.walletList}>
      <div className={styles.sectionTitle}>
        <Wallet size={20} />
        Выберите кошелек
      </div>
      
      {availableWallets.length > 0 ? (
        <div className={styles.walletGrid}>
          {availableWallets.map((wallet, index) => (
            <Card
              key={index}
              className={styles.walletCard}
              clickable
              onClick={() => handleWalletSelect(wallet)}
            >
              <div className={styles.walletIcon}>{wallet.icon}</div>
              <div className={styles.walletInfo}>
                <div className={styles.walletName}>{wallet.name}</div>
                <div className={styles.walletDescription}>{wallet.description}</div>
              </div>
              {wallet.available ? (
                <CheckCircle size={16} className={styles.availableIcon} />
              ) : (
                <Download size={16} className={styles.installIcon} />
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className={styles.noWallets}>
          <AlertCircle size={48} />
          <h3>Кошельки не найдены</h3>
          <p>Установите один из рекомендуемых кошельков для продолжения</p>
        </div>
      )}
    </div>
  )

  const renderInstallInstructions = () => (
    <div className={styles.installSection}>
      <div className={styles.backButton}>
        <Button
          variant="ghost"
          size="small"
          onClick={() => setCurrentStep('select')}
          icon={<X size={16} />}
        >
          Назад
        </Button>
      </div>

      <div className={styles.installHeader}>
        <div className={styles.walletIcon}>{selectedWallet?.icon}</div>
        <h3>Установить {selectedWallet?.name}</h3>
        <p>Для подключения к блокчейну необходимо установить кошелек</p>
      </div>

      <div className={styles.recommendations}>
        {recommendations.map((category, index) => (
          <div key={index} className={styles.recommendationCategory}>
            <h4 className={styles.categoryTitle}>
              {category.title === 'Для мобильных устройств' ? 
                <Smartphone size={16} /> : 
                <Monitor size={16} />
              }
              {category.title}
            </h4>
            
            <div className={styles.walletOptions}>
              {category.wallets.map((wallet, walletIndex) => (
                <Card
                  key={walletIndex}
                  className={styles.recommendationCard}
                >
                  <div className={styles.walletIcon}>{wallet.icon}</div>
                  <div className={styles.walletInfo}>
                    <div className={styles.walletName}>{wallet.name}</div>
                    <div className={styles.walletDescription}>{wallet.description}</div>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleInstallWallet(wallet.downloadUrl)}
                    icon={<ExternalLink size={14} />}
                  >
                    Установить
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.installFooter}>
        <p className={styles.installNote}>
          После установки кошелька вернитесь на эту страницу и попробуйте подключиться снова
        </p>
        <Button
          variant="outline"
          onClick={handleTryAgain}
        >
          Попробовать снова
        </Button>
      </div>
    </div>
  )

  const renderConnecting = () => (
    <div className={styles.connectingSection}>
      <div className={styles.connectingAnimation}>
        <div className={styles.spinner} />
        {selectedWallet?.type === WALLET_TYPES.WALLET_CONNECT && (
          <QrCode size={24} />
        )}
      </div>
      
      <h3>Подключение к {selectedWallet?.name}</h3>
      
      {selectedWallet?.type === WALLET_TYPES.WALLET_CONNECT ? (
        <p>Отсканируйте QR-код своим мобильным кошельком или используйте кнопку подключения в приложении</p>
      ) : (
        <p>Подтвердите подключение в расширении кошелька</p>
      )}

      {isMobileEnvironment() && selectedWallet?.type !== WALLET_TYPES.WALLET_CONNECT && (
        <div className={styles.mobileHelper}>
          <p>Или откройте приложение кошелька:</p>
          <Button
            variant="outline"
            onClick={() => openWalletApp(selectedWallet.type, window.location.origin)}
            icon={<Smartphone size={16} />}
          >
            Открыть {selectedWallet?.name}
          </Button>
        </div>
      )}
    </div>
  )

  const renderSuccess = () => (
    <div className={styles.successSection}>
      <CheckCircle size={48} className={styles.successIcon} />
      <h3>Кошелек подключен!</h3>
      <p>Вы успешно подключили {selectedWallet?.name}</p>
    </div>
  )

  const renderError = () => (
    <div className={styles.errorSection}>
      <AlertCircle size={48} className={styles.errorIcon} />
      <h3>Ошибка подключения</h3>
      <p>{error}</p>
      
      <div className={styles.errorActions}>
        <Button
          variant="primary"
          onClick={handleTryAgain}
        >
          Попробовать снова
        </Button>
      </div>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Подключить кошелек"
      size="medium"
      className={styles.walletModal}
    >
      <div className={styles.modalContent}>
        {error && currentStep === 'select' && renderError()}
        {success && renderSuccess()}
        {!error && !success && (
          <>
            {currentStep === 'select' && renderWalletList()}
            {currentStep === 'install' && renderInstallInstructions()}
            {currentStep === 'connecting' && renderConnecting()}
          </>
        )}
      </div>
    </Modal>
  )
}

export default WalletConnectionModal