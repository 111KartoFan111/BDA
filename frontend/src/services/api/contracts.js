// frontend/src/services/api/contracts.js - ОБНОВЛЕННАЯ ВЕРСИЯ
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

  // НОВЫЙ МЕТОД: Создание нового контракта (предложения аренды)
  createContract: (contractData) => {
    return apiRequest.post('/v1/contracts', {
      item_id: contractData.item_id,
      tenant_email: contractData.tenant_email,
      start_date: contractData.start_date,
      end_date: contractData.end_date,
      total_price: contractData.total_price,
      message: contractData.message,
      special_terms: contractData.special_terms,
      // Дополнительные поля
      total_days: contractData.total_days,
      item_title: contractData.item_title
    })
  },

  // НОВЫЙ МЕТОД: Создание предложения аренды (альтернативное название)
  createRentalProposal: (proposalData) => {
    return apiRequest.post('/v1/contracts/proposals', {
      itemId: proposalData.itemId,
      tenantEmail: proposalData.tenantEmail,
      startDate: proposalData.startDate,
      endDate: proposalData.endDate,
      totalPrice: proposalData.totalPrice,
      message: proposalData.message,
      terms: proposalData.terms,
    })
  },

  // Подписание контракта арендатором
  signContract: (id, signature) => {
    return apiRequest.patch(`/v1/contracts/${id}/sign`, { signature })
  },

  // НОВЫЙ МЕТОД: Принятие предложения аренды
  acceptProposal: (id, acceptanceData = {}) => {
    return apiRequest.patch(`/v1/contracts/${id}/accept`, {
      wallet_address: acceptanceData.walletAddress,
      notes: acceptanceData.notes
    })
  },

  // НОВЫЙ МЕТОД: Отклонение предложения аренды
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

  // НОВЫЙ МЕТОД: Получение входящих предложений (для арендатора)
  getIncomingProposals: (params = {}) => {
    return apiRequest.get('/v1/contracts/incoming', { params })
  },

  // НОВЫЙ МЕТОД: Получение исходящих предложений (для владельца)
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

  // НОВЫЕ МЕТОДЫ ДЛЯ РАБОТЫ С ПРЕДЛОЖЕНИЯМИ

  // Получение доступных товаров для создания предложения
  getAvailableItems: (params = {}) => {
    return apiRequest.get('/v1/contracts/available-items', { params })
  },

  // Проверка доступности товара на указанные даты
  checkItemAvailability: (itemId, startDate, endDate) => {
    return apiRequest.post(`/v1/contracts/check-availability`, {
      item_id: itemId,
      start_date: startDate,
      end_date: endDate
    })
  },

  // Расчет стоимости аренды
  calculateRentalCost: (itemId, startDate, endDate) => {
    return apiRequest.post(`/v1/contracts/calculate-cost`, {
      item_id: itemId,
      start_date: startDate,
      end_date: endDate
    })
  },

  // Получение предложенных условий
  getProposalTerms: (itemId) => {
    return apiRequest.get(`/v1/contracts/proposal-terms/${itemId}`)
  },

  // МЕТОДЫ ДЛЯ УВЕДОМЛЕНИЙ

  // Отправка уведомления о новом предложении
  notifyNewProposal: (contractId) => {
    return apiRequest.post(`/v1/contracts/${contractId}/notify/proposal`)
  },

  // Отправка уведомления о принятии предложения
  notifyProposalAccepted: (contractId) => {
    return apiRequest.post(`/v1/contracts/${contractId}/notify/accepted`)
  },

  // Отправка уведомления об отклонении предложения
  notifyProposalRejected: (contractId) => {
    return apiRequest.post(`/v1/contracts/${contractId}/notify/rejected`)
  }
}

export default contractsAPI