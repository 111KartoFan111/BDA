// Смарт-контракты и их ABI

// ABI для контракта аренды
export const RENTAL_CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_tenant", "type": "address"},
      {"internalType": "address", "name": "_owner", "type": "address"},
      {"internalType": "uint256", "name": "_itemId", "type": "uint256"},
      {"internalType": "uint256", "name": "_amount", "type": "uint256"},
      {"internalType": "uint256", "name": "_duration", "type": "uint256"},
      {"internalType": "uint256", "name": "_deposit", "type": "uint256"}
    ],
    "stateMutability": "payable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "tenant", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "RentalCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "initiator", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "reason", "type": "string"}
    ],
    "name": "RentalCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "tenant", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "DepositPaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "recipient", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "DepositRefunded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getRentalInfo",
    "outputs": [
      {"internalType": "address", "name": "tenant", "type": "address"},
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "uint256", "name": "itemId", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"},
      {"internalType": "uint256", "name": "deposit", "type": "uint256"},
      {"internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "payDeposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "completeRental",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "_reason", "type": "string"}
    ],
    "name": "cancelRental",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_newDuration", "type": "uint256"}
    ],
    "name": "extendRental",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawPayment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "refundDeposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tenant",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "itemId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "amount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "duration",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "startTime",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "status",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
]

// ABI для фабрики контрактов аренды
export const RENTAL_FACTORY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "contractAddress", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "tenant", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "itemId", "type": "uint256"}
    ],
    "name": "RentalContractCreated",
    "type": "event"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_tenant", "type": "address"},
      {"internalType": "uint256", "name": "_itemId", "type": "uint256"},
      {"internalType": "uint256", "name": "_duration", "type": "uint256"},
      {"internalType": "uint256", "name": "_deposit", "type": "uint256"}
    ],
    "name": "createRentalContract",
    "outputs": [
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_user", "type": "address"}
    ],
    "name": "getUserContracts",
    "outputs": [
      {"internalType": "address[]", "name": "", "type": "address[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllContracts",
    "outputs": [
      {"internalType": "address[]", "name": "", "type": "address[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getContractCount",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// ABI для токена платформы (если используется)
export const PLATFORM_TOKEN_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

// Статусы контрактов (соответствуют enum в Solidity)
export const CONTRACT_STATUS = {
  CREATED: 0,
  ACTIVE: 1,
  COMPLETED: 2,
  CANCELLED: 3,
  DISPUTED: 4
}

// Статусы контрактов в читаемом виде
export const CONTRACT_STATUS_LABELS = {
  [CONTRACT_STATUS.CREATED]: 'Создан',
  [CONTRACT_STATUS.ACTIVE]: 'Активный',
  [CONTRACT_STATUS.COMPLETED]: 'Завершен',
  [CONTRACT_STATUS.CANCELLED]: 'Отменен',
  [CONTRACT_STATUS.DISPUTED]: 'Спор'
}

// Адреса контрактов для разных сетей
export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet
  11155111: {
    RENTAL_FACTORY: import.meta.env.VITE_RENTAL_FACTORY_ADDRESS || '0x1234567890123456789012345678901234567890',
    PLATFORM_TOKEN: import.meta.env.VITE_PLATFORM_TOKEN_ADDRESS || '0x0987654321098765432109876543210987654321'
  },
  // Ethereum Mainnet
  1: {
    RENTAL_FACTORY: import.meta.env.VITE_MAINNET_RENTAL_FACTORY_ADDRESS || '',
    PLATFORM_TOKEN: import.meta.env.VITE_MAINNET_PLATFORM_TOKEN_ADDRESS || ''
  },
  // Polygon Mainnet
  137: {
    RENTAL_FACTORY: import.meta.env.VITE_POLYGON_RENTAL_FACTORY_ADDRESS || '',
    PLATFORM_TOKEN: import.meta.env.VITE_POLYGON_PLATFORM_TOKEN_ADDRESS || ''
  }
}

// Получение адреса контракта для текущей сети
export const getContractAddress = (contractName, chainId) => {
  const addresses = CONTRACT_ADDRESSES[chainId]
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  
  const address = addresses[contractName]
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on chain ${chainId}`)
  }
  
  return address
}

// Создание экземпляра контракта
export const createContract = (web3, abi, address) => {
  if (!web3) {
    throw new Error('Web3 instance is required')
  }
  
  if (!abi || !address) {
    throw new Error('ABI and address are required')
  }
  
  return new web3.eth.Contract(abi, address)
}

// Получение экземпляра фабрики контрактов
export const getRentalFactory = (web3, chainId) => {
  const address = getContractAddress('RENTAL_FACTORY', chainId)
  return createContract(web3, RENTAL_FACTORY_ABI, address)
}

// Получение экземпляра контракта аренды
export const getRentalContract = (web3, contractAddress) => {
  return createContract(web3, RENTAL_CONTRACT_ABI, contractAddress)
}

// Получение экземпляра токена платформы
export const getPlatformToken = (web3, chainId) => {
  const address = getContractAddress('PLATFORM_TOKEN', chainId)
  return createContract(web3, PLATFORM_TOKEN_ABI, address)
}

// Утилиты для работы с событиями
export const getContractEvents = async (contract, eventName, fromBlock = 0, toBlock = 'latest') => {
  try {
    return await contract.getPastEvents(eventName, {
      fromBlock,
      toBlock
    })
  } catch (error) {
    console.error('Error fetching contract events:', error)
    throw error
  }
}

// Подписка на события контракта
export const subscribeToContractEvents = (contract, eventName, callback) => {
  const subscription = contract.events[eventName]()
    .on('data', callback)
    .on('error', console.error)
    
  return subscription
}

// Отмена подписки на события
export const unsubscribeFromContractEvents = (subscription) => {
  if (subscription) {
    subscription.unsubscribe()
  }
}

// Получение информации о газе для транзакции
export const estimateGas = async (contract, method, args, options = {}) => {
  try {
    return await contract.methods[method](...args).estimateGas(options)
  } catch (error) {
    console.error('Error estimating gas:', error)
    throw error
  }
}

// Выполнение транзакции с автоматической оценкой газа
export const executeTransaction = async (contract, method, args, options = {}) => {
  try {
    const gasEstimate = await estimateGas(contract, method, args, options)
    const gasWithBuffer = Math.floor(gasEstimate * 1.2) // Добавляем 20% к оценке
    
    return await contract.methods[method](...args).send({
      ...options,
      gas: gasWithBuffer
    })
  } catch (error) {
    console.error('Error executing transaction:', error)
    throw error
  }
}

// Получение текущей цены газа
export const getGasPrice = async (web3) => {
  try {
    return await web3.eth.getGasPrice()
  } catch (error) {
    console.error('Error fetching gas price:', error)
    throw error
  }
}

// Конвертация статуса из числа в строку
export const getStatusLabel = (statusNumber) => {
  return CONTRACT_STATUS_LABELS[statusNumber] || 'Неизвестный'
}

// Проверка поддержки сети
export const isSupportedNetwork = (chainId) => {
  return Object.keys(CONTRACT_ADDRESSES).includes(chainId.toString())
}

// Получение списка поддерживаемых сетей
export const getSupportedNetworks = () => {
  return Object.keys(CONTRACT_ADDRESSES).map(chainId => parseInt(chainId))
}

export default {
  RENTAL_CONTRACT_ABI,
  RENTAL_FACTORY_ABI,
  PLATFORM_TOKEN_ABI,
  CONTRACT_STATUS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_ADDRESSES,
  getContractAddress,
  createContract,
  getRentalFactory,
  getRentalContract,
  getPlatformToken,
  getContractEvents,
  subscribeToContractEvents,
  unsubscribeFromContractEvents,
  estimateGas,
  executeTransaction,
  getGasPrice,
  getStatusLabel,
  isSupportedNetwork,
  getSupportedNetworks
}