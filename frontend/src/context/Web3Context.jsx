import React, { createContext, useContext, useReducer, useEffect } from 'react'
import Web3 from 'web3'
import { web3Service } from '../services/blockchain/web3'
import toast from 'react-hot-toast'

const Web3Context = createContext()

// Начальное состояние
const initialState = {
  web3: null,
  account: null,
  chainId: null,
  isConnected: false,
  isLoading: false,
  contracts: {},
  error: null,
  balance: '0'
}

// Действия
const web3Actions = {
  SET_LOADING: 'SET_LOADING',
  SET_WEB3: 'SET_WEB3',
  SET_ACCOUNT: 'SET_ACCOUNT',
  SET_CHAIN_ID: 'SET_CHAIN_ID',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_CONTRACTS: 'SET_CONTRACTS',
  SET_BALANCE: 'SET_BALANCE',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  DISCONNECT: 'DISCONNECT'
}

// Редьюсер
function web3Reducer(state, action) {
  switch (action.type) {
    case web3Actions.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      }
    
    case web3Actions.SET_WEB3:
      return {
        ...state,
        web3: action.payload
      }
    
    case web3Actions.SET_ACCOUNT:
      return {
        ...state,
        account: action.payload
      }
    
    case web3Actions.SET_CHAIN_ID:
      return {
        ...state,
        chainId: action.payload
      }
    
    case web3Actions.SET_CONNECTED:
      return {
        ...state,
        isConnected: action.payload,
        isLoading: false
      }
    
    case web3Actions.SET_CONTRACTS:
      return {
        ...state,
        contracts: { ...state.contracts, ...action.payload }
      }
    
    case web3Actions.SET_BALANCE:
      return {
        ...state,
        balance: action.payload
      }
    
    case web3Actions.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      }
    
    case web3Actions.CLEAR_ERROR:
      return {
        ...state,
        error: null
      }
    
    case web3Actions.DISCONNECT:
      return {
        ...initialState
      }
    
    default:
      return state
  }
}

export function Web3Provider({ children }) {
  const [state, dispatch] = useReducer(web3Reducer, initialState)

  // Проверка подключения к MetaMask при загрузке
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            await connectWallet()
          }
        } catch (error) {
          console.error('Error checking connection:', error)
        }
      }
    }

    checkConnection()
  }, [])

  // Слушатели событий MetaMask
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnect()
        } else {
          dispatch({ type: web3Actions.SET_ACCOUNT, payload: accounts[0] })
          updateBalance(accounts[0])
        }
      }

      const handleChainChanged = (chainId) => {
        dispatch({ type: web3Actions.SET_CHAIN_ID, payload: parseInt(chainId, 16) })
        window.location.reload()
      }

      const handleDisconnect = () => {
        disconnect()
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
      window.ethereum.on('disconnect', handleDisconnect)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('disconnect', handleDisconnect)
      }
    }
  }, [])

  // Подключение кошелька
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      const error = 'MetaMask не установлен. Пожалуйста, установите MetaMask для работы с блокчейном.'
      dispatch({ type: web3Actions.SET_ERROR, payload: error })
      toast.error(error)
      return { success: false, error }
    }

    dispatch({ type: web3Actions.SET_LOADING, payload: true })
    dispatch({ type: web3Actions.CLEAR_ERROR })

    try {
      // Запрос доступа к аккаунтам
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('Нет доступных аккаунтов')
      }

      // Создание экземпляра Web3
      const web3Instance = new Web3(window.ethereum)
      
      // Получение ID сети
      const chainId = await web3Instance.eth.getChainId()
      
      // Проверка правильной сети (Sepolia testnet)
      const expectedChainId = 11155111 // Sepolia
      if (chainId !== expectedChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + expectedChainId.toString(16) }]
          })
        } catch (switchError) {
          if (switchError.code === 4902) {
            // Сеть не добавлена, добавляем её
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x' + expectedChainId.toString(16),
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/']
              }]
            })
          }
        }
      }

      dispatch({ type: web3Actions.SET_WEB3, payload: web3Instance })
      dispatch({ type: web3Actions.SET_ACCOUNT, payload: accounts[0] })
      dispatch({ type: web3Actions.SET_CHAIN_ID, payload: chainId })
      dispatch({ type: web3Actions.SET_CONNECTED, payload: true })

      // Получение баланса
      await updateBalance(accounts[0])

      // Инициализация контрактов
      await initializeContracts(web3Instance)

      toast.success('Кошелёк подключен успешно!')
      return { success: true }
    } catch (error) {
      const errorMessage = error.message || 'Ошибка подключения кошелька'
      dispatch({ type: web3Actions.SET_ERROR, payload: errorMessage })
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Отключение кошелька
  const disconnect = () => {
    dispatch({ type: web3Actions.DISCONNECT })
    toast.info('Кошелёк отключен')
  }

  // Обновление баланса
  const updateBalance = async (account) => {
    if (!state.web3 || !account) return

    try {
      const balance = await state.web3.eth.getBalance(account)
      const balanceInEth = state.web3.utils.fromWei(balance, 'ether')
      dispatch({ type: web3Actions.SET_BALANCE, payload: balanceInEth })
    } catch (error) {
      console.error('Error updating balance:', error)
    }
  }

  // Инициализация смарт-контрактов
  const initializeContracts = async (web3Instance) => {
    try {
      const contracts = await web3Service.initializeContracts(web3Instance)
      dispatch({ type: web3Actions.SET_CONTRACTS, payload: contracts })
    } catch (error) {
      console.error('Error initializing contracts:', error)
      toast.error('Ошибка инициализации смарт-контрактов')
    }
  }

  // Создание контракта аренды
  const createRentalContract = async (contractData) => {
    if (!state.isConnected || !state.contracts.rentalFactory) {
      toast.error('Кошелёк не подключен или контракты не инициализированы')
      return { success: false, error: 'Not connected' }
    }

    dispatch({ type: web3Actions.SET_LOADING, payload: true })

    try {
      const result = await web3Service.createRentalContract(
        state.contracts.rentalFactory,
        state.account,
        contractData
      )

      toast.success('Контракт аренды создан успешно!')
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error.message || 'Ошибка создания контракта'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      dispatch({ type: web3Actions.SET_LOADING, payload: false })
    }
  }

  // Получение информации о контракте
  const getContractInfo = async (contractAddress) => {
    if (!state.web3) {
      return { success: false, error: 'Web3 not initialized' }
    }

    try {
      const contractInfo = await web3Service.getContractInfo(state.web3, contractAddress)
      return { success: true, data: contractInfo }
    } catch (error) {
      console.error('Error getting contract info:', error)
      return { success: false, error: error.message }
    }
  }

  // Очистка ошибок
  const clearError = () => {
    dispatch({ type: web3Actions.CLEAR_ERROR })
  }

  const value = {
    ...state,
    connectWallet,
    disconnect,
    createRentalContract,
    getContractInfo,
    updateBalance,
    clearError
  }

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  return context
}