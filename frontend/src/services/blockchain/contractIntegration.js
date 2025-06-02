// frontend/src/services/blockchain/contractIntegration.js
import { blockchainAPI } from '../api/blockchain'
import { contractsAPI } from '../api/contracts'
import toast from 'react-hot-toast'

export class ContractIntegration {
  constructor(web3Context) {
    this.web3 = web3Context
  }

  // Создание и деплой контракта (полный цикл)
  async createAndDeployContract(contractData) {
    try {
      // 1. Создаем контракт в базе данных
      console.log('Создаем контракт в БД...', contractData)
      const dbContract = await contractsAPI.createContract(contractData)
      const contractId = dbContract.data.id

      toast.success('Контракт создан в базе данных')

      // 2. Ждем подписания обеими сторонами
      // (это происходит через UI)
      
      return {
        success: true,
        contractId,
        dbContract: dbContract.data,
        message: 'Контракт создан. Ожидается подписание сторонами.'
      }
    } catch (error) {
      console.error('Ошибка создания контракта:', error)
      throw error
    }
  }

  // Деплой подписанного контракта в блокчейн
  async deployToBlockchain(contractId) {
    try {
      // Проверяем подключение кошелька
      if (!this.web3.isConnected || !this.web3.account) {
        throw new Error('Кошелек не подключен')
      }

      toast.loading('Деплой контракта в блокчейн...', { id: 'deploy' })

      // Деплоим через бэкенд
      const deployResult = await blockchainAPI.deployContract(contractId)
      
      if (deployResult.data.success) {
        const { contract_address, transaction_hash } = deployResult.data.data

        toast.success('Контракт успешно развернут в блокчейне!', { id: 'deploy' })

        return {
          success: true,
          contractAddress: contract_address,
          transactionHash: transaction_hash,
          explorerUrl: blockchainHelpers.getExplorerUrl('tx', transaction_hash, this.web3.chainId)
        }
      } else {
        throw new Error(deployResult.data.message || 'Ошибка деплоя')
      }
    } catch (error) {
      toast.error(`Ошибка деплоя: ${error.message}`, { id: 'deploy' })
      throw error
    }
  }

  // Оплата депозита
  async payDeposit(contractId, contractAddress) {
    try {
      if (!this.web3.isConnected) {
        throw new Error('Кошелек не подключен')
      }

      toast.loading('Оплата депозита...', { id: 'deposit' })

      // Получаем информацию о контракте
      const contractInfo = await blockchainAPI.getContractStatus(contractAddress)
      const depositAmount = contractInfo.data.data.deposit

      // Выполняем оплату через бэкенд
      const payResult = await contractsAPI.payDeposit(contractId)

      if (payResult.data.success) {
        toast.success('Депозит успешно оплачен!', { id: 'deposit' })
        return payResult.data.data
      } else {
        throw new Error(payResult.data.message || 'Ошибка оплаты депозита')
      }
    } catch (error) {
      toast.error(`Ошибка оплаты депозита: ${error.message}`, { id: 'deposit' })
      throw error
    }
  }

  // Завершение аренды
  async completeRental(contractId, contractAddress) {
    try {
      if (!this.web3.isConnected) {
        throw new Error('Кошелек не подключен')
      }

      toast.loading('Завершение аренды...', { id: 'complete' })

      // Завершаем через бэкенд
      const completeResult = await contractsAPI.completeContract(contractId)

      if (completeResult.data.success) {
        toast.success('Аренда успешно завершена!', { id: 'complete' })
        return completeResult.data.data
      } else {
        throw new Error(completeResult.data.message || 'Ошибка завершения аренды')
      }
    } catch (error) {
      toast.error(`Ошибка завершения аренды: ${error.message}`, { id: 'complete' })
      throw error
    }
  }

  // Отмена аренды
  async cancelRental(contractId, contractAddress, reason = '') {
    try {
      if (!this.web3.isConnected) {
        throw new Error('Кошелек не подключен')
      }

      toast.loading('Отмена аренды...', { id: 'cancel' })

      // Отменяем через бэкенд
      const cancelResult = await contractsAPI.cancelContract(contractId, reason)

      if (cancelResult.data.success) {
        toast.success('Аренда отменена', { id: 'cancel' })
        return cancelResult.data.data
      } else {
        throw new Error(cancelResult.data.message || 'Ошибка отмены аренды')
      }
    } catch (error) {
      toast.error(`Ошибка отмены аренды: ${error.message}`, { id: 'cancel' })
      throw error
    }
  }

  // Синхронизация статуса с блокчейном
  async syncContractStatus(contractId) {
    try {
      const syncResult = await contractsAPI.syncWithBlockchain(contractId)
      return syncResult.data.data
    } catch (error) {
      console.error('Ошибка синхронизации:', error)
      throw error
    }
  }

  // Получение полной информации о контракте
  async getContractFullInfo(contractId) {
    try {
      // Получаем данные из БД
      const dbContract = await contractsAPI.getContract(contractId)
      
      let blockchainInfo = null
      if (dbContract.data.data.contract_address) {
        // Получаем данные из блокчейна
        try {
          const blockchainResult = await blockchainAPI.getContractStatus(dbContract.data.data.contract_address)
          blockchainInfo = blockchainResult.data.data
        } catch (error) {
          console.warn('Не удалось получить данные из блокчейна:', error)
        }
      }

      return {
        database: dbContract.data.data,
        blockchain: blockchainInfo,
        isDeployed: !!dbContract.data.data.contract_address,
        explorerUrl: dbContract.data.data.contract_address 
          ? blockchainHelpers.getExplorerUrl('address', dbContract.data.data.contract_address, this.web3.chainId)
          : null
      }
    } catch (error) {
      console.error('Ошибка получения информации о контракте:', error)
      throw error
    }
  }

  // Мониторинг событий контракта
  async monitorContractEvents(contractAddress, fromBlock = 0) {
    try {
      const eventsResult = await blockchainAPI.getContractEvents(contractAddress, fromBlock)
      return eventsResult.data.data
    } catch (error) {
      console.error('Ошибка получения событий контракта:', error)
      throw error
    }
  }

  // Проверка возможности выполнения действий
  canPerformAction(contract, action, userRole) {
    const { status, tenant_signature, owner_signature, contract_address } = contract

    switch (action) {
      case 'sign':
        return status === 'pending' && (
          (userRole === 'tenant' && !tenant_signature) ||
          (userRole === 'owner' && !owner_signature)
        )
      
      case 'deploy':
        return status === 'signed' && !contract_address && userRole === 'owner'
      
      case 'payDeposit':
        return status === 'active' && contract_address && userRole === 'tenant'
      
      case 'complete':
        return status === 'active' && contract_address
      
      case 'cancel':
        return ['pending', 'signed', 'active'].includes(status)
      
      default:
        return false
    }
  }

  // Получение рекомендуемого действия для пользователя
  getRecommendedAction(contract, userRole) {
    if (this.canPerformAction(contract, 'sign', userRole)) {
      return {
        action: 'sign',
        title: 'Подписать контракт',
        description: 'Подпишите контракт для продолжения'
      }
    }

    if (this.canPerformAction(contract, 'deploy', userRole)) {
      return {
        action: 'deploy',
        title: 'Развернуть в блокчейн',
        description: 'Разверните контракт в блокчейне для активации'
      }
    }

    if (this.canPerformAction(contract, 'payDeposit', userRole)) {
      return {
        action: 'payDeposit',
        title: 'Оплатить депозит',
        description: 'Оплатите депозит для начала аренды'
      }
    }

    return null
  }

  // Валидация перед созданием контракта
  validateContractData(contractData, userWallet) {
    const errors = []

    // Проверяем кошелек
    if (!userWallet || !blockchainHelpers.isValidAddress(userWallet)) {
      errors.push('Подключите корректный Ethereum кошелек')
    }

    // Проверяем даты
    const now = new Date()
    const startDate = new Date(contractData.start_date)
    const endDate = new Date(contractData.end_date)

    if (startDate <= now) {
      errors.push('Дата начала должна быть в будущем')
    }

    if (endDate <= startDate) {
      errors.push('Дата окончания должна быть позже даты начала')
    }

    // Проверяем цену
    if (!contractData.total_price || parseFloat(contractData.total_price) <= 0) {
      errors.push('Укажите корректную цену')
    }

    // Проверяем email арендатора
    if (!contractData.tenant_email) {
      errors.push('Укажите email арендатора')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Хук для использования в компонентах
export const useContractIntegration = () => {
  const web3Context = useContext(Web3Context)
  
  return new ContractIntegration(web3Context)
}