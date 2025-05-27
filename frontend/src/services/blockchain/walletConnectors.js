// frontend/src/services/blockchain/walletConnectors.js
import Web3 from 'web3'

// Определяем доступные типы кошельков
export const WALLET_TYPES = {
  METAMASK: 'metamask',
  WALLET_CONNECT: 'walletconnect',
  COINBASE: 'coinbase',
  TRUST: 'trust',
  BINANCE: 'binance',
  INJECTED: 'injected',
  WEB3_MODAL: 'web3modal'
}

// Проверяем доступность различных кошельков
export const detectAvailableWallets = () => {
  const wallets = []

  // MetaMask (для браузеров)
  if (typeof window !== 'undefined' && window.ethereum?.isMetaMask) {
    wallets.push({
      type: WALLET_TYPES.METAMASK,
      name: 'MetaMask',
      icon: '🦊',
      available: true,
      description: 'Популярный браузерный кошелек'
    })
  }

  // Coinbase Wallet
  if (typeof window !== 'undefined' && window.ethereum?.isCoinbaseWallet) {
    wallets.push({
      type: WALLET_TYPES.COINBASE,
      name: 'Coinbase Wallet',
      icon: '🔵',
      available: true,
      description: 'Кошелек от биржи Coinbase'
    })
  }

  // Trust Wallet
  if (typeof window !== 'undefined' && window.ethereum?.isTrust) {
    wallets.push({
      type: WALLET_TYPES.TRUST,
      name: 'Trust Wallet',
      icon: '🛡️',
      available: true,
      description: 'Мобильный кошелек Trust Wallet'
    })
  }

  // Binance Chain Wallet
  if (typeof window !== 'undefined' && window.BinanceChain) {
    wallets.push({
      type: WALLET_TYPES.BINANCE,
      name: 'Binance Wallet',
      icon: '🟡',
      available: true,
      description: 'Кошелек от биржи Binance'
    })
  }

  // Любой другой injected кошелек
  if (typeof window !== 'undefined' && window.ethereum && wallets.length === 0) {
    wallets.push({
      type: WALLET_TYPES.INJECTED,
      name: 'Web3 Кошелек',
      icon: '🔗',
      available: true,
      description: 'Обнаружен Web3 кошелек'
    })
  }

  // WalletConnect (всегда доступен как опция)
  wallets.push({
    type: WALLET_TYPES.WALLET_CONNECT,
    name: 'WalletConnect',
    icon: '📱',
    available: true,
    description: 'Подключение через QR-код для мобильных кошельков'
  })

  return wallets
}

// Класс для управления подключениями кошельков
class WalletManager {
  constructor() {
    this.web3 = null
    this.account = null
    this.chainId = null
    this.walletType = null
    this.provider = null
  }

  // Подключение к MetaMask
  async connectMetaMask() {
    if (!window.ethereum?.isMetaMask) {
      throw new Error('MetaMask не обнаружен. Пожалуйста, установите расширение MetaMask для браузера.')
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      this.provider = window.ethereum
      this.web3 = new Web3(window.ethereum)
      this.account = accounts[0]
      this.chainId = await this.web3.eth.getChainId()
      this.walletType = WALLET_TYPES.METAMASK

      return this.getConnectionResult()
    } catch (error) {
      throw new Error(`Ошибка подключения MetaMask: ${error.message}`)
    }
  }

  // Подключение через WalletConnect
  async connectWalletConnect() {
    try {
      // Динамически импортируем WalletConnect только когда нужно
      const { default: WalletConnect } = await import('@walletconnect/client')
      
      const connector = new WalletConnect({
        bridge: 'https://bridge.walletconnect.org',
        qrcodeModal: {
          open: (uri, cb) => {
            console.log('QR Code URI:', uri)
            // Здесь можно показать QR код пользователю
            this.showQRModal(uri, cb)
          },
          close: () => {
            this.hideQRModal()
          }
        }
      })

      if (!connector.connected) {
        await connector.createSession()
      }

      const accounts = connector.accounts
      const chainId = connector.chainId

      this.provider = connector
      this.web3 = new Web3(connector)
      this.account = accounts[0]
      this.chainId = chainId
      this.walletType = WALLET_TYPES.WALLET_CONNECT

      return this.getConnectionResult()
    } catch (error) {
      throw new Error(`Ошибка подключения WalletConnect: ${error.message}`)
    }
  }

  // Подключение к Coinbase Wallet
  async connectCoinbase() {
    if (!window.ethereum?.isCoinbaseWallet) {
      throw new Error('Coinbase Wallet не обнаружен')
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      this.provider = window.ethereum
      this.web3 = new Web3(window.ethereum)
      this.account = accounts[0]
      this.chainId = await this.web3.eth.getChainId()
      this.walletType = WALLET_TYPES.COINBASE

      return this.getConnectionResult()
    } catch (error) {
      throw new Error(`Ошибка подключения Coinbase Wallet: ${error.message}`)
    }
  }

  // Подключение к любому injected кошельку
  async connectInjected() {
    if (!window.ethereum) {
      throw new Error('Web3 кошелек не обнаружен. Установите браузерное расширение кошелька или используйте мобильное приложение с встроенным браузером.')
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      this.provider = window.ethereum
      this.web3 = new Web3(window.ethereum)
      this.account = accounts[0]
      this.chainId = await this.web3.eth.getChainId()
      this.walletType = WALLET_TYPES.INJECTED

      return this.getConnectionResult()
    } catch (error) {
      throw new Error(`Ошибка подключения кошелька: ${error.message}`)
    }
  }

  // Универсальный метод подключения
  async connect(walletType) {
    switch (walletType) {
      case WALLET_TYPES.METAMASK:
        return await this.connectMetaMask()
      case WALLET_TYPES.WALLET_CONNECT:
        return await this.connectWalletConnect()
      case WALLET_TYPES.COINBASE:
        return await this.connectCoinbase()
      case WALLET_TYPES.INJECTED:
        return await this.connectInjected()
      default:
        throw new Error(`Неподдерживаемый тип кошелька: ${walletType}`)
    }
  }

  // Отключение кошелька
  async disconnect() {
    if (this.walletType === WALLET_TYPES.WALLET_CONNECT && this.provider?.disconnect) {
      await this.provider.disconnect()
    }

    this.web3 = null
    this.account = null
    this.chainId = null
    this.walletType = null
    this.provider = null
  }

  // Получение результата подключения
  getConnectionResult() {
    return {
      web3: this.web3,
      account: this.account,
      chainId: this.chainId,
      walletType: this.walletType,
      provider: this.provider
    }
  }

  // Показать QR модалку для WalletConnect
  showQRModal(uri, callback) {
    // Создаем модальное окно с QR кодом
    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `
    
    const content = document.createElement('div')
    content.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      max-width: 400px;
    `
    
    content.innerHTML = `
      <h3>Подключение кошелька</h3>
      <p>Отсканируйте QR-код своим мобильным кошельком:</p>
      <div id="qr-code"></div>
      <p style="font-size: 0.9em; color: #666; margin-top: 1rem;">
        Или скопируйте ссылку:
      </p>
      <input type="text" value="${uri}" readonly style="width: 100%; padding: 0.5rem; margin: 0.5rem 0;">
      <button onclick="this.parentElement.parentElement.remove()">Отмена</button>
    `
    
    modal.appendChild(content)
    document.body.appendChild(modal)
    
    // Генерируем QR код (можно использовать библиотеку qrcode)
    this.generateQRCode(uri, content.querySelector('#qr-code'))
    
    this.currentModal = modal
  }

  // Скрыть QR модалку
  hideQRModal() {
    if (this.currentModal) {
      this.currentModal.remove()
      this.currentModal = null
    }
  }

  // Генерация QR кода (упрощенная версия)
  generateQRCode(text, container) {
    // В реальном приложении используйте библиотеку типа qrcode.js
    container.innerHTML = `
      <div style="
        width: 200px; 
        height: 200px; 
        background: #f0f0f0; 
        margin: 1rem auto; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        border: 1px solid #ddd;
      ">
        QR код
      </div>
    `
  }
}

// Создаем единственный экземпляр менеджера кошельков
export const walletManager = new WalletManager()

// Функция для получения рекомендаций по кошелькам
export const getWalletRecommendations = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  const recommendations = []

  if (isMobile) {
    recommendations.push({
      title: 'Для мобильных устройств',
      wallets: [
        {
          name: 'Trust Wallet',
          description: 'Популярный мобильный кошелек с поддержкой DApps',
          downloadUrl: isIOS 
            ? 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
            : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
          icon: '🛡️'
        },
        {
          name: 'Coinbase Wallet',
          description: 'Кошелек от популярной биржи',
          downloadUrl: isIOS
            ? 'https://apps.apple.com/app/coinbase-wallet/id1278383455'
            : 'https://play.google.com/store/apps/details?id=org.toshi',
          icon: '🔵'
        },
        {
          name: 'MetaMask Mobile',
          description: 'Мобильная версия популярного кошелька',
          downloadUrl: isIOS
            ? 'https://apps.apple.com/app/metamask/id1438144202'
            : 'https://play.google.com/store/apps/details?id=io.metamask',
          icon: '🦊'
        }
      ]
    })
  } else {
    recommendations.push({
      title: 'Для браузера',
      wallets: [
        {
          name: 'MetaMask',
          description: 'Самый популярный браузерный кошелек',
          downloadUrl: 'https://metamask.io/',
          icon: '🦊'
        },
        {
          name: 'Coinbase Wallet Extension',
          description: 'Расширение для браузера от Coinbase',
          downloadUrl: 'https://www.coinbase.com/wallet',
          icon: '🔵'
        }
      ]
    })
  }

  return recommendations
}

// Функция для проверки мобильного окружения
export const isMobileEnvironment = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Функция для открытия кошелька через deep link
export const openWalletApp = (walletType, dappUrl) => {
  const deepLinks = {
    [WALLET_TYPES.TRUST]: `trust://open_url?coin_id=60&url=${encodeURIComponent(dappUrl)}`,
    [WALLET_TYPES.METAMASK]: `metamask://open?url=${encodeURIComponent(dappUrl)}`,
    [WALLET_TYPES.COINBASE]: `cbwallet://open?url=${encodeURIComponent(dappUrl)}`
  }

  const deepLink = deepLinks[walletType]
  if (deepLink) {
    window.location.href = deepLink
  }
}

export default walletManager