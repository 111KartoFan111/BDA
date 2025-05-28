import { apiRequest } from './base'

export const contractsAPI = {
  // Получение списка контрактов пользователя
  getUserContracts: (params = {}) => {
    return apiRequest.get('/v1/contracts')
  },

  // Получение контракта по ID
  getContract: (id) => {
    return apiRequest.get(`/v1/contracts/${id}`)
  },

  // Создание нового контракта
  createContract: (contractData) => {
    return apiRequest.post('/v1/contracts', {
      itemId: contractData.itemId,
      tenantAddress: contractData.tenantAddress,
      startDate: contractData.startDate,
      endDate: contractData.endDate,
      totalPrice: contractData.totalPrice,
      deposit: contractData.deposit,
      terms: contractData.terms,
    })
  },

  // Подписание контракта арендатором
  signContract: (id, signature) => {
    return apiRequest.patch(`/v1/contracts/${id}/sign`, { signature })
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
    return apiRequest.patch(`/v1/contracts/${id}/complete`)
  },

  // Отмена контракта
  cancelContract: (id, reason = '') => {
    return apiRequest.patch(`/v1/contracts/${id}/cancel`, { reason })
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

  // Создание автоматического продления
  setAutoRenewal: (id, renewalSettings) => {
    return apiRequest.patch(`/v1/contracts/${id}/auto-renewal`, {
      enabled: renewalSettings.enabled,
      period: renewalSettings.period,
      maxRenewals: renewalSettings.maxRenewals,
      priceAdjustment: renewalSettings.priceAdjustment || 0,
    })
  },

  // Получение настроек автопродления
  getAutoRenewalSettings: (id) => {
    return apiRequest.get(`/v1/contracts/${id}/auto-renewal`)
  },

  // Отключение автопродления
  disableAutoRenewal: (id) => {
    return apiRequest.delete(`/v1/contracts/${id}/auto-renewal`)
  },
}