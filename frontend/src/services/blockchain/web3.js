import Web3 from 'web3'
import { 
  getRentalFactory, 
  getRentalContract, 
  CONTRACT_STATUS,
  executeTransaction,
} from './contracts'
import { 
  isMetaMaskInstalled,
  getCurrentAccount as fetchCurrentAccount,
  getChainId,
  switchNetwork,
  getBalance,
  toWei,
  fromWei,
  waitForTransaction,handleWeb3Error
} from './utils'

class Web3Service {
  constructor() {
    this.web3 = null
    this.account = null
    this.chainId = null
    this.contracts = {}
  }

  // Инициализация Web3
  async initialize() {
    if (!isMetaMaskInstalled()) {
      throw new Error('MetaMask не установлен')
    }

    try {
      this.web3 = new Web3(window.ethereum)
      this.account = await fetchCurrentAccount()
      this.chainId = await getChainId()
      
      // Переключаемся на Sepolia testnet если нужно
      if (this.chainId !== 11155111) {
        await switchNetwork(11155111)
        this.chainId = 11155111
      }

      await this.initializeContracts()
      
      return {
        web3: this.web3,
        account: this.account,
        chainId: this.chainId,
        contracts: this.contracts
      }
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Инициализация контрактов
  async initializeContracts() {
    try {
      this.contracts.rentalFactory = getRentalFactory(this.web3, this.chainId)
      return this.contracts
    } catch (error) {
      console.error('Error initializing contracts:', error)
      throw error
    }
  }

  // Подключение кошелька
  async connectWallet() {
    if (!isMetaMaskInstalled()) {
      throw new Error('MetaMask не установлен. Пожалуйста, установите MetaMask.')
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('Нет доступных аккаунтов')
      }

      this.account = accounts[0]
      this.web3 = new Web3(window.ethereum)
      this.chainId = await getChainId()

      // Проверяем и переключаем сеть
      if (this.chainId !== 11155111) {
        await switchNetwork(11155111)
        this.chainId = 11155111
      }

      await this.initializeContracts()

      return {
        account: this.account,
        chainId: this.chainId,
        contracts: this.contracts
      }
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Получение баланса аккаунта
  async getAccountBalance(account = null) {
    const targetAccount = account || this.account
    if (!targetAccount) {
      throw new Error('Аккаунт не подключен')
    }

    try {
      return await getBalance(this.web3, targetAccount)
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Создание контракта аренды
  async createRentalContract(contractData) {
    if (!this.contracts.rentalFactory || !this.account) {
      throw new Error('Web3 не инициализирован или кошелек не подключен')
    }

    try {
      const { tenant, itemId, amount, duration, deposit } = contractData
      
      const amountWei = toWei(amount.toString())
      const depositWei = deposit ? toWei(deposit.toString()) : '0'

      // Выполняем транзакцию создания контракта
      const result = await executeTransaction(
        this.contracts.rentalFactory,
        'createRentalContract',
        [tenant, itemId, duration, depositWei],
        {
          from: this.account,
          value: amountWei
        }
      )

      // Ждем подтверждения транзакции
      const receipt = await waitForTransaction(this.web3, result.transactionHash)

      // Извлекаем адрес нового контракта из события
      const contractCreatedEvent = receipt.events.RentalContractCreated
      if (!contractCreatedEvent) {
        throw new Error('Событие создания контракта не найдено')
      }

      const contractAddress = contractCreatedEvent.returnValues.contractAddress

      return {
        contractAddress,
        transactionHash: result.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed
      }
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Получение информации о контракте аренды
  async getContractInfo(contractAddress) {
    if (!this.web3) {
      throw new Error('Web3 не инициализирован')
    }

    try {
      const contract = getRentalContract(this.web3, contractAddress)
      
      const [
        tenant,
        owner,
        itemId,
        amount,
        duration,
        deposit,
        startTime,
        status
      ] = await contract.methods.getRentalInfo().call()

      return {
        tenant,
        owner,
        itemId: parseInt(itemId),
        amount: fromWei(amount),
        duration: parseInt(duration),
        deposit: fromWei(deposit),
        startTime: parseInt(startTime),
        status: parseInt(status),
        statusText: this.getStatusText(parseInt(status))
      }
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Оплата залога
  async payDeposit(contractAddress, depositAmount) {
    if (!this.account) {
      throw new Error('Кошелек не подключен')
    }

    try {
      const contract = getRentalContract(this.web3, contractAddress)
      const depositWei = toWei(depositAmount.toString())

      const result = await executeTransaction(
        contract,
        'payDeposit',
        [],
        {
          from: this.account,
          value: depositWei
        }
      )

      return {
        transactionHash: result.transactionHash,
        success: true
      }
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Завершение аренды
  async completeRental(contractAddress) {
    if (!this.account) {
      throw new Error('Кошелек не подключен')
    }

    try {
      const contract = getRentalContract(this.web3, contractAddress)

      const result = await executeTransaction(
        contract,
        'completeRental',
        [],
        { from: this.account }
      )

      return {
        transactionHash: result.transactionHash,
        success: true
      }
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Отмена аренды
  async cancelRental(contractAddress, reason = '') {
    if (!this.account) {
      throw new Error('Кошелек не подключен')
    }

    try {
      const contract = getRentalContract(this.web3, contractAddress)

      const result = await executeTransaction(
        contract,
        'cancelRental',
        [reason],
        { from: this.account }
      )

      return {
        transactionHash: result.transactionHash,
        success: true
      }
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Продление аренды
  async extendRental(contractAddress, newDuration, additionalPayment) {
    if (!this.account) {
      throw new Error('Кошелек не подключен')
    }

    try {
      const contract = getRentalContract(this.web3, contractAddress)
      const paymentWei = toWei(additionalPayment.toString())

      const result = await executeTransaction(
        contract,
        'extendRental',
        [newDuration],
        {
          from: this.account,
          value: paymentWei
        }
      )

      return {
        transactionHash: result.transactionHash,
        success: true
      }
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Вывод платежа (для владельца)
  async withdrawPayment(contractAddress) {
    if (!this.account) {
      throw new Error('Кошелек не подключен')
    }

    try {
      const contract = getRentalContract(this.web3, contractAddress)

      const result = await executeTransaction(
        contract,
        'withdrawPayment',
        [],
        { from: this.account }
      )

      return {
        transactionHash: result.transactionHash,
        success: true
      }
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Возврат залога
  async refundDeposit(contractAddress) {
    if (!this.account) {
      throw new Error('Кошелек не подключен')
    }

    try {
      const contract = getRentalContract(this.web3, contractAddress)

      const result = await executeTransaction(
        contract,
        'refundDeposit',
        [],
        { from: this.account }
      )

      return {
        transactionHash: result.transactionHash,
        success: true
      }
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Получение контрактов пользователя
  async getUserContracts(userAddress = null) {
    const targetAddress = userAddress || this.account
    if (!targetAddress || !this.contracts.rentalFactory) {
      throw new Error('Адрес пользователя или контракт фабрики недоступны')
    }

    try {
      const contracts = await this.contracts.rentalFactory.methods
        .getUserContracts(targetAddress)
        .call()

      // Получаем информацию о каждом контракте
      const contractsInfo = await Promise.all(
        contracts.map(async (contractAddress) => {
          try {
            const info = await this.getContractInfo(contractAddress)
            return {
              address: contractAddress,
              ...info
            }
          } catch (error) {
            console.error(`Error getting info for contract ${contractAddress}:`, error)
            return {
              address: contractAddress,
              error: error.message
            }
          }
        })
      )

      return contractsInfo
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Получение всех контрактов
  async getAllContracts() {
    if (!this.contracts.rentalFactory) {
      throw new Error('Контракт фабрики недоступен')
    }

    try {
      const contracts = await this.contracts.rentalFactory.methods
        .getAllContracts()
        .call()

      return contracts
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Получение количества контрактов
  async getContractCount() {
    if (!this.contracts.rentalFactory) {
      throw new Error('Контракт фабрики недоступен')
    }

    try {
      const count = await this.contracts.rentalFactory.methods
        .getContractCount()
        .call()

      return parseInt(count)
    } catch (error) {
      throw new Error(handleWeb3Error(error))
    }
  }

  // Подписка на события контракта
  subscribeToContractEvents(contractAddress, eventName, callback) {
    try {
      const contract = getRentalContract(this.web3, contractAddress)
      
      const subscription = contract.events[eventName]()
        .on('data', callback)
        .on('error', console.error)
      
      return subscription
    } catch (error) {
      console.error('Error subscribing to events:', error)
      return null
    }
  }

  // Отписка от событий
  unsubscribeFromEvents(subscription) {
    if (subscription) {
      subscription.unsubscribe()
    }
  }

  // Получение текста статуса
  getStatusText(statusNumber) {
    const statusMap = {
      [CONTRACT_STATUS.CREATED]: 'Создан',
      [CONTRACT_STATUS.ACTIVE]: 'Активный',
      [CONTRACT_STATUS.COMPLETED]: 'Завершен',
      [CONTRACT_STATUS.CANCELLED]: 'Отменен',
      [CONTRACT_STATUS.DISPUTED]: 'Спор'
    }
    return statusMap[statusNumber] || 'Неизвестный'
  }

  // Проверка подключения
  isConnected() {
    return !!(this.web3 && this.account && this.chainId)
  }

  // Получение текущего аккаунта
  getCurrentAccount() {
    return this.account
  }

  // Получение текущей сети
  getCurrentChainId() {
    return this.chainId
  }

  // Получение экземпляра Web3
  getWeb3Instance() {
    return this.web3
  }
}

// Создаем единственный экземпляр сервиса
const web3Service = new Web3Service()

export default web3Service

// Экспортируем методы для прямого использования
export const {
  initialize,
  connectWallet,
  getAccountBalance,
  createRentalContract,
  getContractInfo,
  payDeposit,
  completeRental,
  cancelRental,
  extendRental,
  withdrawPayment,
  refundDeposit,
  getUserContracts,
  getAllContracts,
  getContractCount,
  subscribeToContractEvents,
  unsubscribeFromEvents,
  isConnected,
  getCurrentAccount,
  getCurrentChainId,
  getWeb3Instance
} = web3Service