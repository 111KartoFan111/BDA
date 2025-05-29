import { apiRequest } from './base'

export const adminAPI = {
  // Дашборд и общая статистика
  getDashboard: () => {
    return apiRequest.get('/v1/admin/dashboard')
  },

  // Управление пользователями
  getUsers: (params = {}) => {
    return apiRequest.get('/v1/admin/users', { params })
  },

  updateUserRole: (userId, role) => {
    return apiRequest.patch(`/v1/admin/users/${userId}/role`, { role })
  },

  verifyUser: (userId) => {
    return apiRequest.patch(`/v1/admin/users/${userId}/verify`)
  },

  suspendUser: (userId, reason, duration_days = null) => {
    return apiRequest.patch(`/v1/admin/users/${userId}/suspend`, {
      reason,
      duration_days
    })
  },

  // Модерация товаров
  getPendingItems: (params = {}) => {
    return apiRequest.get('/v1/admin/items/pending', { params })
  },

  approveItem: (itemId) => {
    return apiRequest.patch(`/v1/admin/items/${itemId}/approve`)
  },

  rejectItem: (itemId, reason) => {
    return apiRequest.patch(`/v1/admin/items/${itemId}/reject`, { reason })
  },

  // Управление контрактами
  getAllContracts: (params = {}) => {
    return apiRequest.get('/v1/admin/contracts/all', { params })
  },

  getContractsStats: () => {
    return apiRequest.get('/v1/admin/contracts/stats')
  },

  getDisputes: (params = {}) => {
    return apiRequest.get('/v1/admin/contracts/disputes', { params })
  },

  resolveDispute: (disputeId, resolution, compensation_amount = null, compensation_recipient = null) => {
    return apiRequest.patch(`/v1/admin/contracts/disputes/${disputeId}/resolve`, {
      resolution,
      compensation_amount,
      compensation_recipient
    })
  },

  // Отчеты и аналитика
  getActivityReport: (startDate, endDate) => {
    return apiRequest.get('/v1/admin/reports/activity', {
      params: { start_date: startDate, end_date: endDate }
    })
  },

  getFinancialReport: (startDate, endDate) => {
    return apiRequest.get('/v1/admin/reports/financial', {
      params: { start_date: startDate, end_date: endDate }
    })
  },

  // Системные функции
  getSystemHealth: () => {
    return apiRequest.get('/v1/admin/system/health')
  },

  getSystemLogs: (level = 'ERROR', limit = 100) => {
    return apiRequest.get('/v1/admin/system/logs', {
      params: { level, limit }
    })
  },

  // Объявления
  createAnnouncement: (title, content, priority = 'normal', expires_at = null) => {
    return apiRequest.post('/v1/admin/announcements', {
      title,
      content,
      priority,
      expires_at
    })
  },

  // Настройки платформы
  getPlatformSettings: () => {
    return apiRequest.get('/v1/admin/settings')
  },

  updatePlatformSettings: (settings_data) => {
    return apiRequest.patch('/v1/admin/settings', settings_data)
  },

  // Резервное копирование
  createDatabaseBackup: () => {
    return apiRequest.post('/v1/admin/backup/database')
  },

  // Экспорт данных
  exportUsersData: (format = 'csv') => {
    return apiRequest.get('/v1/admin/export/users', {
      params: { format },
      responseType: 'blob'
    })
  },

  exportAnalyticsData: (startDate, endDate, format = 'csv') => {
    return apiRequest.get('/v1/admin/export/analytics', {
      params: {
        start_date: startDate,
        end_date: endDate,
        format
      },
      responseType: 'blob'
    })
  },

  // Массовые операции
  sendBulkEmail: (subject, content, user_filter = {}) => {
    return apiRequest.post('/v1/admin/bulk/email', {
      subject,
      content,
      user_filter
    })
  },

  // Режим обслуживания
  toggleMaintenanceMode: (enabled, message = null) => {
    return apiRequest.post('/v1/admin/maintenance/mode', {
      enabled,
      message
    })
  },

  // Очистка кеша
  clearCache: (cache_type = 'all') => {
    return apiRequest.delete('/v1/admin/cache/clear', {
      params: { cache_type }
    })
  }
}