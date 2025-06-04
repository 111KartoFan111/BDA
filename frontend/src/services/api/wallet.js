// frontend/src/services/api/wallet.js
import { apiRequest } from './base'

export const walletAPI = {
  // Подключить кошелек
  connectWallet: (walletAddress) => {
    return apiRequest.patch('/v1/wallet/connect', {
      wallet_address: walletAddress
    })
  },

  // Отключить кошелек
  disconnectWallet: () => {
    return apiRequest.delete('/v1/wallet/disconnect')
  },

  // Получить информацию о кошельке
  getWalletInfo: () => {
    return apiRequest.get('/v1/wallet/info')
  },

  // Верифицировать владение кошельком
  verifyWalletOwnership: (signature) => {
    return apiRequest.post('/v1/wallet/verify', { signature })
  },

  // Валидация адреса кошелька (клиентская)
  validateAddress: (address) => {
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/
    return ethAddressRegex.test(address)
  },

  // Форматирование адреса для отображения
  formatAddress: (address, length = 6) => {
    if (!address) return ''
    if (address.length <= length * 2) return address
    return `${address.slice(0, length + 2)}...${address.slice(-length)}`
  }
}