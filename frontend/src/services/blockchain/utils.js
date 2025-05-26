import Web3 from 'web3'

// Утилиты для работы с блокчейном

// Проверка подключения к MetaMask
export const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
}

// Проверка подключения кошелька
export const isWalletConnected = async () => {
  if (!isMetaMaskInstalled()) return false
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' })
    return accounts.length > 0
  } catch (error) {
    console.error('Error checking wallet connection:', error)
    return false
  }
}

// Подключение к кошельку
export const connectWallet = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed')
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })
    return accounts[0]
  } catch (error) {
    console.error('Error connecting wallet:', error)
    throw error
  }
}

// Получение текущего аккаунта
export const getCurrentAccount = async () => {
  if (!isMetaMaskInstalled()) return null

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' })
    return accounts[0] || null
  } catch (error) {
    console.error('Error getting current account:', error)
    return null
  }
}

// Получение ID сети
export const getChainId = async () => {
  if (!isMetaMaskInstalled()) return null

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' })
    return parseInt(chainId, 16)
  } catch (error) {
    console.error('Error getting chain ID:', error)
    return null
  }
}

// Переключение сети
export const switchNetwork = async (chainId) => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + chainId.toString(16) }]
    })
  } catch (error) {
    // Если сеть не добавлена, добавляем её
    if (error.code === 4902) {
      await addNetwork(chainId)
    } else {
      throw error
    }
  }
}

// Добавление новой сети
export const addNetwork = async (chainId) => {
  const networkConfigs = {
    11155111: { // Sepolia
      chainId: '0xaa36a7',
      chainName: 'Sepolia Test Network',
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrls: ['https://sepolia.infura.io/v3/'],
      blockExplorerUrls: ['https://sepolia.etherscan.io/']
    },
    137: { // Polygon
      chainId: '0x89',
      chainName: 'Polygon Mainnet',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
      },
      rpcUrls: ['https://polygon-rpc.com/'],
      blockExplorerUrls: ['https://polygonscan.com/']
    }
  }

  const config = networkConfigs[chainId]
  if (!config) {
    throw new Error(`Network configuration not found for chain ID: ${chainId}`)
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [config]
    })
  } catch (error) {
    console.error('Error adding network:', error)
    throw error
  }
}

// Получение баланса аккаунта
export const getBalance = async (web3, account) => {
  try {
    const balance = await web3.eth.getBalance(account)
    return web3.utils.fromWei(balance, 'ether')
  } catch (error) {
    console.error('Error getting balance:', error)
    throw error
  }
}

// Конвертация в Wei
export const toWei = (amount, unit = 'ether') => {
  return Web3.utils.toWei(amount.toString(), unit)
}

// Конвертация из Wei
export const fromWei = (amount, unit = 'ether') => {
  return Web3.utils.fromWei(amount.toString(), unit)
}

// Проверка валидности адреса Ethereum
export const isValidAddress = (address) => {
  return Web3.utils.isAddress(address)
}

// Форматирование адреса (сокращение)
export const formatAddress = (address, length = 6) => {
  if (!address) return ''
  if (address.length <= length * 2) return address
  
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`
}

// Получение информации о транзакции
export const getTransactionReceipt = async (web3, txHash) => {
  try {
    return await web3.eth.getTransactionReceipt(txHash)
  } catch (error) {
    console.error('Error getting transaction receipt:', error)
    throw error
  }
}

// Ожидание подтверждения транзакции
export const waitForTransaction = async (web3, txHash, confirmations = 1) => {
  return new Promise((resolve, reject) => {
    const checkConfirmations = async () => {
      try {
        const receipt = await web3.eth.getTransactionReceipt(txHash)
        
        if (!receipt) {
          setTimeout(checkConfirmations, 1000)
          return
        }

        const currentBlock = await web3.eth.getBlockNumber()
        const confirmationCount = currentBlock - receipt.blockNumber

        if (confirmationCount >= confirmations) {
          resolve(receipt)
        } else {
          setTimeout(checkConfirmations, 1000)
        }
      } catch (error) {
        reject(error)
      }
    }

    checkConfirmations()
  })
}

// Получение текущей цены газа
export const getGasPrice = async (web3) => {
  try {
    return await web3.eth.getGasPrice()
  } catch (error) {
    console.error('Error getting gas price:', error)
    throw error
  }
}

// Оценка стоимости газа для транзакции
export const estimateGasCost = async (web3, gasLimit) => {
  try {
    const gasPrice = await getGasPrice(web3)
    const gasCost = gasPrice * gasLimit
    return fromWei(gasCost.toString(), 'wei')
  } catch (error) {
    console.error('Error estimating gas cost:', error)
    throw error
  }
}

// Получение nonce для аккаунта
export const getNonce = async (web3, account) => {
  try {
    return await web3.eth.getTransactionCount(account, 'pending')
  } catch (error) {
    console.error('Error getting nonce:', error)
    throw error
  }
}

// Подпись сообщения
export const signMessage = async (web3, account, message) => {
  try {
    return await web3.eth.personal.sign(message, account)
  } catch (error) {
    console.error('Error signing message:', error)
    throw error
  }
}

// Проверка подписи сообщения
export const verifyMessage = async (web3, message, signature, expectedAddress) => {
  try {
    const recoveredAddress = await web3.eth.personal.ecRecover(message, signature)
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()
  } catch (error) {
    console.error('Error verifying message:', error)
    return false
  }
}

// Создание хеша данных
export const hashData = (data) => {
  return Web3.utils.keccak256(data)
}

// Создание случайного приватного ключа
export const generatePrivateKey = () => {
  return Web3.utils.randomHex(32)
}

// Создание аккаунта из приватного ключа
export const createAccountFromPrivateKey = (privateKey) => {
  const web3 = new Web3()
  return web3.eth.accounts.privateKeyToAccount(privateKey)
}

// Получение блока по номеру
export const getBlock = async (web3, blockNumber) => {
  try {
    return await web3.eth.getBlock(blockNumber)
  } catch (error) {
    console.error('Error getting block:', error)
    throw error
  }
}

// Получение последнего блока
export const getLatestBlock = async (web3) => {
  try {
    return await web3.eth.getBlock('latest')
  } catch (error) {
    console.error('Error getting latest block:', error)
    throw error
  }
}

// Конвертация timestamp в дату
export const timestampToDate = (timestamp) => {
  return new Date(timestamp * 1000)
}

// Конвертация даты в timestamp
export const dateToTimestamp = (date) => {
  return Math.floor(date.getTime() / 1000)
}

// Проверка истечения срока
export const isExpired = (expirationTimestamp) => {
  const now = Math.floor(Date.now() / 1000)
  return now > expirationTimestamp
}

// Получение времени до истечения срока
export const getTimeUntilExpiration = (expirationTimestamp) => {
  const now = Math.floor(Date.now() / 1000)
  const timeLeft = expirationTimestamp - now
  
  if (timeLeft <= 0) return 0
  
  return timeLeft
}

// Форматирование времени в читаемый вид
export const formatDuration = (seconds) => {
  const days = Math.floor(seconds / (24 * 3600))
  const hours = Math.floor((seconds % (24 * 3600)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days} дн. ${hours} ч.`
  } else if (hours > 0) {
    return `${hours} ч. ${minutes} мин.`
  } else {
    return `${minutes} мин.`
  }
}

// Обработка ошибок Web3
export const handleWeb3Error = (error) => {
  if (error.code === 4001) {
    return 'Транзакция отклонена пользователем'
  }
  
  if (error.message?.includes('insufficient funds')) {
    return 'Недостаточно средств для выполнения транзакции'
  }
  
  if (error.message?.includes('gas required exceeds allowance')) {
    return 'Недостаточно газа для выполнения транзакции'
  }
  
  if (error.message?.includes('nonce too low')) {
    return 'Ошибка nonce. Попробуйте еще раз'
  }
  
  if (error.message?.includes('network')) {
    return 'Ошибка подключения к сети'
  }
  
  return error.message || 'Произошла неизвестная ошибка'
}

// Получение URL блок-эксплорера для сети
export const getExplorerUrl = (chainId) => {
  const explorers = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    137: 'https://polygonscan.com'
  }
  
  return explorers[chainId] || null
}

// Создание ссылки на транзакцию в блок-эксплорере
export const getTransactionUrl = (chainId, txHash) => {
  const explorerUrl = getExplorerUrl(chainId)
  if (!explorerUrl) return null
  
  return `${explorerUrl}/tx/${txHash}`
}

// Создание ссылки на адрес в блок-эксплорере
export const getAddressUrl = (chainId, address) => {
  const explorerUrl = getExplorerUrl(chainId)
  if (!explorerUrl) return null
  
  return `${explorerUrl}/address/${address}`
}

// Создание ссылки на блок в блок-эксплорере
export const getBlockUrl = (chainId, blockNumber) => {
  const explorerUrl = getExplorerUrl(chainId)
  if (!explorerUrl) return null
  
  return `${explorerUrl}/block/${blockNumber}`
}

export default {
  isMetaMaskInstalled,
  isWalletConnected,
  connectWallet,
  getCurrentAccount,
  getChainId,
  switchNetwork,
  addNetwork,
  getBalance,
  toWei,
  fromWei,
  isValidAddress,
  formatAddress,
  getTransactionReceipt,
  waitForTransaction,
  getGasPrice,
  estimateGasCost,
  getNonce,
  signMessage,
  verifyMessage,
  hashData,
  generatePrivateKey,
  createAccountFromPrivateKey,
  getBlock,
  getLatestBlock,
  timestampToDate,
  dateToTimestamp,
  isExpired,
  getTimeUntilExpiration,
  formatDuration,
  handleWeb3Error,
  getExplorerUrl,
  getTransactionUrl,
  getAddressUrl,
  getBlockUrl
}