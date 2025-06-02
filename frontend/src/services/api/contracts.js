// frontend/src/services/api/contracts.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { apiRequest } from './base'

export const contractsAPI = {
  // Получение списка контрактов пользователя
  getUserContracts: (params = {}) => {
    return apiRequest.get('/v1/contracts', { params })
  },

  // Получение контракта по ID
  getContract: (id) => {
    return apiRequest.get(`/v1/contracts/${id}`)
  },

  // Создание нового контракта
  createContract: (contractData) => {
    // Функция для преобразования datetime-local в ISO формат
    const formatDateTimeForAPI = (dateTimeLocal) => {
      if (!dateTimeLocal) return null
      
      // Если уже в ISO формате, возвращаем как есть
      if (dateTimeLocal.includes('T') && dateTimeLocal.includes('Z')) {
        return dateTimeLocal
      }
      
      // Если в формате datetime-local (YYYY-MM-DDTHH:mm)
      if (dateTimeLocal.includes('T')) {
        return `${dateTimeLocal}:00Z`
      }
      
      // Если в формате даты без времени
      const date = new Date(dateTimeLocal)
      return date.toISOString()
    }

    // Преобразуем данные фронтенда в формат бэкенда
    const backendData = {
      item_id: contractData.item_id || contractData.itemId,
      start_date: formatDateTimeForAPI(contractData.start_date || contractData.startDate),
      end_date: formatDateTimeForAPI(contractData.end_date || contractData.endDate),
      total_price: parseFloat(contractData.total_price || contractData.totalPrice || 0),
      deposit: parseFloat(contractData.deposit || 0),
      terms: contractData.terms || contractData.message || '',
      special_conditions: contractData.special_conditions || contractData.special_terms || contractData.specialTerms || '',
      tenant_email: contractData.tenant_email || contractData.tenantEmail
    }

    console.log('Sending contract data to backend:', backendData)
    
    return apiRequest.post('/v1/contracts', backendData)
  },

  // ИСПРАВЛЕННЫЙ МЕТОД: Подписание контракта
  signContract: (id, signatureData = {}) => {
    // ИСПРАВЛЕНИЕ: Правильное формирование тела запроса
    const requestBody = signatureData.signature 
      ? { signature: signatureData.signature }
      : { signature: `digital_signature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }
    
    console.log('Signing contract with data:', requestBody)
    return apiRequest.post(`/v1/contracts/${id}/sign`, requestBody)
  },

  // Принятие предложения аренды
  acceptProposal: (id, acceptanceData = {}) => {
    return apiRequest.patch(`/v1/contracts/${id}/accept`, {
      wallet_address: acceptanceData.walletAddress,
      notes: acceptanceData.notes
    })
  },

  // Отклонение предложения аренды
  rejectProposal: (id, rejectionData) => {
    return apiRequest.patch(`/v1/contracts/${id}/reject`, {
      reason: rejectionData.reason,
      message: rejectionData.message
    })
  },

  // Активация контракта (после деплоя в блокчейн)
  activateContract: (id, contractAddress, txHash) => {
    return apiRequest.patch(`/v1/contracts/${id}/activate`, {
      contractAddress,
      transactionHash: txHash,
    })
  },

  // Завершение контракта
  completeContract: (id) => {
    return apiRequest.post(`/v1/contracts/${id}/complete`)
  },

  // Отмена контракта
  cancelContract: (id, reason = '') => {
    return apiRequest.post(`/v1/contracts/${id}/cancel`, { reason })
  },

  // Продление контракта
  extendContract: (id, extensionData) => {
    return apiRequest.patch(`/v1/contracts/${id}/extend`, {
      newEndDate: extensionData.newEndDate,
      additionalPrice: extensionData.additionalPrice,
    })
  },

  // Обновление статуса контракта
  updateStatus: (id, status, details = {}) => {
    return apiRequest.patch(`/v1/contracts/${id}/status`, {
      status,
      ...details
    })
  },

  // Получение истории контракта
  getContractHistory: (id) => {
    return apiRequest.get(`/v1/contracts/${id}/history`)
  },

  // Добавление сообщения в чат контракта
  addMessage: (id, messageData) => {
    return apiRequest.post(`/v1/contracts/${id}/messages`, {
      message: messageData.message,
      type: messageData.type || 'text',
      attachments: messageData.attachments || [],
    })
  },

  // Получение сообщений контракта
  getMessages: (id, params = {}) => {
    return apiRequest.get(`/v1/contracts/${id}/messages`, { params })
  },

  // Загрузка документов к контракту
  uploadDocument: (id, formData) => {
    return apiRequest.post(`/v1/contracts/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Получение документов контракта
  getDocuments: (id) => {
    return apiRequest.get(`/v1/contracts/${id}/documents`)
  },

  // Удаление документа
  deleteDocument: (id, documentId) => {
    return apiRequest.delete(`/v1/contracts/${id}/documents/${documentId}`)
  },

  // Создание спора
  createDispute: (id, disputeData) => {
    return apiRequest.post(`/v1/contracts/${id}/dispute`, {
      reason: disputeData.reason,
      description: disputeData.description,
      evidence: disputeData.evidence || [],
    })
  },

  // Получение информации о споре
  getDispute: (id) => {
    return apiRequest.get(`/v1/contracts/${id}/dispute`)
  },

  // Обновление спора
  updateDispute: (id, disputeData) => {
    return apiRequest.patch(`/v1/contracts/${id}/dispute`, disputeData)
  },

  // Резолюция спора (только для админов)
  resolveDispute: (id, resolution) => {
    return apiRequest.patch(`/v1/contracts/${id}/dispute/resolve`, {
      decision: resolution.decision,
      reasoning: resolution.reasoning,
      compensations: resolution.compensations || {},
    })
  },

  // Получение платежей по контракту
  getPayments: (id) => {
    return apiRequest.get(`/v1/contracts/${id}/payments`)
  },

  // Инициация платежа
  initiatePayment: (id, paymentData) => {
    return apiRequest.post(`/v1/contracts/${id}/payments`, {
      amount: paymentData.amount,
      type: paymentData.type,
      description: paymentData.description,
    })
  },

  // Подтверждение платежа
  confirmPayment: (id, paymentId, txHash) => {
    return apiRequest.patch(`/v1/contracts/${id}/payments/${paymentId}/confirm`, {
      transactionHash: txHash,
    })
  },

  // Возврат платежа
  refundPayment: (id, paymentId, reason = '') => {
    return apiRequest.patch(`/v1/contracts/${id}/payments/${paymentId}/refund`, {
      reason
    })
  },

  // Получение статистики контрактов
  getContractsStats: (params = {}) => {
    return apiRequest.get('/v1/contracts/stats', { params })
  },

  // Экспорт контракта в PDF
  exportToPdf: (id) => {
    return apiRequest.get(`/v1/contracts/${id}/export/pdf`, {
      responseType: 'blob'
    })
  },

  // Получение шаблонов контрактов
  getTemplates: () => {
    return apiRequest.get('/v1/contracts/templates')
  },

  // Создание контракта из шаблона
  createFromTemplate: (templateId, contractData) => {
    return apiRequest.post(`/v1/contracts/templates/${templateId}`, contractData)
  },

  // Получение активных контрактов пользователя
  getActiveContracts: () => {
    return apiRequest.get('/v1/contracts/active')
  },

  // Получение завершенных контрактов
  getCompletedContracts: (params = {}) => {
    return apiRequest.get('/v1/contracts/completed', { params })
  },

  // Получение контрактов в ожидании
  getPendingContracts: () => {
    return apiRequest.get('/v1/contracts/pending')
  },

  // Получение входящих предложений (для арендатора)
  getIncomingProposals: (params = {}) => {
    return apiRequest.get('/v1/contracts/incoming', { params })
  },

  // Получение исходящих предложений (для владельца)
  getOutgoingProposals: (params = {}) => {
    return apiRequest.get('/v1/contracts/outgoing', { params })
  },

  // Отправка напоминания о контракте
  sendReminder: (id, reminderType) => {
    return apiRequest.post(`/v1/contracts/${id}/reminder`, {
      type: reminderType
    })
  },

  // Оценка контракта после завершения
  rateContract: (id, ratingData) => {
    return apiRequest.post(`/v1/contracts/${id}/rating`, {
      rating: ratingData.rating,
      comment: ratingData.comment,
      categories: ratingData.categories || {},
    })
  },

  // Получение оценок контракта
  getContractRatings: (id) => {
    return apiRequest.get(`/v1/contracts/${id}/ratings`)
  },

  // Синхронизация с блокчейном
  syncWithBlockchain: (id) => {
    return apiRequest.post(`/v1/contracts/${id}/sync-blockchain`)
  },

  // Деплой в блокчейн
  deployToBlockchain: (id) => {
    return apiRequest.post(`/v1/contracts/${id}/deploy-to-blockchain`)
  },

  // Оплата депозита
  payDeposit: (id) => {
    return apiRequest.post(`/v1/contracts/${id}/pay-deposit`)
  },

  // Получение статуса в блокчейне
  getBlockchainStatus: (id) => {
    return apiRequest.get(`/v1/contracts/${id}/blockchain-status`)
  }
}

export default contractsAPI