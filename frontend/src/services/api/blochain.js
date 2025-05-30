import { apiRequest } from './base'

export const blockchainAPI = {
  // Деплой контракта
  deployContract: (contractId, options = {}) => {
    return apiRequest.post('/v1/blockchain/deploy-contract', {
      contract_id: contractId,
      gas_limit: options.gasLimit,
      gas_price: options.gasPrice
    })
  },

  // Получение статуса контракта
  getContractStatus: (contractAddress) => {
    return apiRequest.get(`/v1/blockchain/contract/${contractAddress}/status`)
  },

  // Верификация транзакции
  verifyTransaction: (txHash) => {
    return apiRequest.get(`/v1/blockchain/transaction/${txHash}/verify`)
  },

  // Получение баланса кошелька
  getWalletBalance: (walletAddress) => {
    return apiRequest.get(`/v1/blockchain/wallet/${walletAddress}/balance`)
  },

  // Создание транзакции
  createTransaction: (transactionData) => {
    return apiRequest.post('/v1/blockchain/transaction/create', {
      from_address: transactionData.fromAddress,
      to_address: transactionData.toAddress,
      amount_eth: transactionData.amountEth
    })
  },

  // Получение истории транзакций
  getTransactionHistory: (walletAddress, params = {}) => {
    return apiRequest.get(`/v1/blockchain/wallet/${walletAddress}/history`, {
      params: {
        limit: params.limit || 10,
        ...params
      }
    })
  },

  // Получение оценок газа
  getGasEstimates: () => {
    return apiRequest.get('/v1/blockchain/gas/estimate')
  },

  // Получение информации о сети
  getNetworkInfo: () => {
    return apiRequest.get('/v1/blockchain/network/info')
  },

  // Валидация контракта
  validateContract: (contractAddress) => {
    return apiRequest.post('/v1/blockchain/contract/validate', {
      wallet_address: contractAddress
    })
  },

  // Выполнение функции контракта
  executeContractFunction: (functionData) => {
    return apiRequest.post('/v1/blockchain/contract/execute', {
      contract_address: functionData.contractAddress,
      function_name: functionData.functionName,
      args: functionData.args || [],
      value_eth: functionData.valueEth || '0'
    })
  },

  // Получение событий контракта
  getContractEvents: (contractAddress, fromBlock = 0) => {
    return apiRequest.get(`/v1/blockchain/contract/${contractAddress}/events`, {
      params: { from_block: fromBlock }
    })
  },

  // Утилиты
  validateAddress: (address) => {
    return apiRequest.get('/v1/blockchain/utils/address/validate', {
      params: { address }
    })
  },

  convertWeiToEth: (weiAmount) => {
    return apiRequest.get('/v1/blockchain/utils/wei/convert', {
      params: { wei_amount: weiAmount }
    })
  },

  convertEthToWei: (ethAmount) => {
    return apiRequest.get('/v1/blockchain/utils/eth/convert', {
      params: { eth_amount: ethAmount }
    })
  },

  // Проверка здоровья блокчейна
  healthCheck: () => {
    return apiRequest.get('/v1/blockchain/health')
  },

  // Админские функции
  admin: {
    // Статистика сети
    getNetworkStats: () => {
      return apiRequest.get('/v1/blockchain/admin/network/stats')
    },

    // Массовый деплой контрактов
    bulkDeployContracts: (contractIds) => {
      return apiRequest.post('/v1/blockchain/admin/contracts/bulk-deploy', contractIds)
    }
  },

  // Специфичные функции для контрактов аренды
  rental: {
    // Оплата залога
    payDeposit: (contractAddress, depositAmount) => {
      return apiRequest.post('/v1/blockchain/contract/execute', {
        contract_address: contractAddress,
        function_name: 'payDeposit',
        args: [],
        value_eth: depositAmount
      })
    },

    // Завершение аренды
    completeRental: (contractAddress) => {
      return apiRequest.post('/v1/blockchain/contract/execute', {
        contract_address: contractAddress,
        function_name: 'completeRental',
        args: []
      })
    },

    // Отмена аренды
    cancelRental: (contractAddress, reason = '') => {
      return apiRequest.post('/v1/blockchain/contract/execute', {
        contract_address: contractAddress,
        function_name: 'cancelRental',
        args: [reason]
      })
    },

    // Продление аренды
    extendRental: (contractAddress, newDuration, additionalPayment) => {
      return apiRequest.post('/v1/blockchain/contract/execute', {
        contract_address: contractAddress,
        function_name: 'extendRental',
        args: [newDuration],
        value_eth: additionalPayment
      })
    },

    // Получение информации об аренде
    getRentalInfo: async (contractAddress) => {
      const response = await apiRequest.get(`/v1/blockchain/contract/${contractAddress}/status`)
      return response.data.data
    }
  },

  // Мониторинг и уведомления
  monitoring: {
    // Подписка на события
    subscribeToEvents: (contractAddress, eventTypes = []) => {
      // В реальном приложении здесь может быть WebSocket подключение
      return apiRequest.post('/v1/blockchain/monitoring/subscribe', {
        contract_address: contractAddress,
        event_types: eventTypes
      })
    },

    // Отписка от событий
    unsubscribeFromEvents: (subscriptionId) => {
      return apiRequest.delete(`/v1/blockchain/monitoring/unsubscribe/${subscriptionId}`)
    },

    // Получение активных подписок
    getActiveSubscriptions: () => {
      return apiRequest.get('/v1/blockchain/monitoring/subscriptions')
    }
  },

  // Пакетные операции
  batch: {
    // Выполнение нескольких операций
    executeOperations: (operations) => {
      return apiRequest.post('/v1/blockchain/batch/execute', {
        operations
      })
    },

    // Получение статуса пакетной операции
    getBatchStatus: (batchId) => {
      return apiRequest.get(`/v1/blockchain/batch/${batchId}/status`)
    }
  },

  // Аналитика блокчейна
  analytics: {
    // Статистика транзакций
    getTransactionStats: (period = '30d') => {
      return apiRequest.get('/v1/blockchain/analytics/transactions', {
        params: { period }
      })
    },

    // Статистика контрактов
    getContractStats: (period = '30d') => {
      return apiRequest.get('/v1/blockchain/analytics/contracts', {
        params: { period }
      })
    },

    // Статистика газа
    getGasStats: (period = '30d') => {
      return apiRequest.get('/v1/blockchain/analytics/gas', {
        params: { period }
      })
    }
  },

  // Безопасность
  security: {
    // Проверка контракта на безопасность
    auditContract: (contractAddress) => {
      return apiRequest.post('/v1/blockchain/security/audit', {
        contract_address: contractAddress
      })
    },

    // Проверка транзакции на подозрительность
    checkTransaction: (txHash) => {
      return apiRequest.post('/v1/blockchain/security/check-transaction', {
        transaction_hash: txHash
      })
    }
  }
}

// Хелпер функции для работы с блокчейном
export const blockchainHelpers = {
  // Форматирование адреса
  formatAddress: (address, length = 6) => {
    if (!address) return ''
    if (address.length <= length * 2) return address
    return `${address.slice(0, length + 2)}...${address.slice(-length)}`
  },

  // Форматирование суммы
  formatAmount: (amount, decimals = 4) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return '0'
    return num.toFixed(decimals)
  },

  // Проверка валидности адреса
  isValidAddress: (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  },

  // Получение ссылки на эксплорер
  getExplorerUrl: (type, value, chainId = 11155111) => {
    const explorers = {
      1: 'https://etherscan.io',
      11155111: 'https://sepolia.etherscan.io',
      137: 'https://polygonscan.com'
    }

    const baseUrl = explorers[chainId]
    if (!baseUrl) return null

    switch (type) {
      case 'tx':
        return `${baseUrl}/tx/${value}`
      case 'address':
        return `${baseUrl}/address/${value}`
      case 'block':
        return `${baseUrl}/block/${value}`
      default:
        return baseUrl
    }
  },

  // Конвертация единиц
  weiToEth: (wei) => {
    return (parseInt(wei) / Math.pow(10, 18)).toString()
  },

  ethToWei: (eth) => {
    return (parseFloat(eth) * Math.pow(10, 18)).toString()
  },

  // Получение статуса в читаемом виде
  getStatusText: (statusCode) => {
    const statuses = {
      0: 'Создан',
      1: 'Активный', 
      2: 'Завершен',
      3: 'Отменен',
      4: 'Спор'
    }
    return statuses[statusCode] || 'Неизвестный'
  },

  // Цвета для статусов
  getStatusColor: (statusCode) => {
    const colors = {
      0: '#f59e0b', // amber
      1: '#10b981', // green
      2: '#3b82f6', // blue
      3: '#ef4444', // red
      4: '#8b5cf6'  // purple
    }
    return colors[statusCode] || '#6b7280'
  },

  // Форматирование времени блокчейна
  formatBlockTime: (timestamp) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('ru-RU')
  },

  // Расчет комиссии
  calculateFee: (gasUsed, gasPrice) => {
    const fee = (parseInt(gasUsed) * parseInt(gasPrice)) / Math.pow(10, 18)
    return fee.toFixed(6)
  }
}

export default blockchainAPI