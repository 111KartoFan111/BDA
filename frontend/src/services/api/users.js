import { apiRequest } from './base'

export const usersAPI = {
  // Получение списка пользователей (только для админов)
  getUsers: (params = {}) => {
    return apiRequest.get('/users', { params })
  },

  // Получение пользователя по ID
  getUser: (id) => {
    return apiRequest.get(`/users/${id}`)
  },

  // Получение профиля текущего пользователя
  getCurrentUser: () => {
    return apiRequest.get('/users/me')
  },

  // Обновление профиля пользователя
  updateProfile: (userData) => {
    return apiRequest.patch('/users/me', userData)
  },

  // Загрузка аватара
  uploadAvatar: (formData) => {
    return apiRequest.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Удаление аватара
  deleteAvatar: () => {
    return apiRequest.delete('/users/me/avatar')
  },

  // Изменение пароля
  changePassword: (passwordData) => {
    return apiRequest.patch('/users/me/password', {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    })
  },

  // Получение товаров пользователя
  getUserItems: (userId, params = {}) => {
    return apiRequest.get(`/users/${userId}/items`, { params })
  },

  // Получение отзывов о пользователе
  getUserReviews: (userId, params = {}) => {
    return apiRequest.get(`/users/${userId}/reviews`, { params })
  },

  // Получение статистики пользователя
  getUserStats: (userId) => {
    return apiRequest.get(`/users/${userId}/stats`)
  },

  // Подписка на пользователя
  followUser: (userId) => {
    return apiRequest.post(`/users/${userId}/follow`)
  },

  // Отписка от пользователя
  unfollowUser: (userId) => {
    return apiRequest.delete(`/users/${userId}/follow`)
  },

  // Получение подписчиков пользователя
  getUserFollowers: (userId, params = {}) => {
    return apiRequest.get(`/users/${userId}/followers`, { params })
  },

  // Получение подписок пользователя
  getUserFollowing: (userId, params = {}) => {
    return apiRequest.get(`/users/${userId}/following`, { params })
  },

  // Блокировка пользователя
  blockUser: (userId, reason = '') => {
    return apiRequest.post(`/users/${userId}/block`, { reason })
  },

  // Разблокировка пользователя
  unblockUser: (userId) => {
    return apiRequest.delete(`/users/${userId}/block`)
  },

  // Получение заблокированных пользователей
  getBlockedUsers: (params = {}) => {
    return apiRequest.get('/users/me/blocked', { params })
  },

  // Жалоба на пользователя
  reportUser: (userId, reportData) => {
    return apiRequest.post(`/users/${userId}/report`, {
      reason: reportData.reason,
      description: reportData.description,
      evidence: reportData.evidence || [],
    })
  },

  // Верификация пользователя (только для админов)
  verifyUser: (userId) => {
    return apiRequest.patch(`/users/${userId}/verify`)
  },

  // Снятие верификации (только для админов)
  unverifyUser: (userId) => {
    return apiRequest.delete(`/users/${userId}/verify`)
  },

  // Получение уведомлений пользователя
  getNotifications: (params = {}) => {
    return apiRequest.get('/users/me/notifications', { params })
  },

  // Отметка уведомления как прочитанного
  markNotificationRead: (notificationId) => {
    return apiRequest.patch(`/users/me/notifications/${notificationId}/read`)
  },

  // Отметка всех уведомлений как прочитанных
  markAllNotificationsRead: () => {
    return apiRequest.patch('/users/me/notifications/read-all')
  },

  // Удаление уведомления
  deleteNotification: (notificationId) => {
    return apiRequest.delete(`/users/me/notifications/${notificationId}`)
  },

  // Получение настроек уведомлений
  getNotificationSettings: () => {
    return apiRequest.get('/users/me/notification-settings')
  },

  // Обновление настроек уведомлений
  updateNotificationSettings: (settings) => {
    return apiRequest.patch('/users/me/notification-settings', settings)
  },

  // Получение настроек приватности
  getPrivacySettings: () => {
    return apiRequest.get('/users/me/privacy-settings')
  },

  // Обновление настроек приватности
  updatePrivacySettings: (settings) => {
    return apiRequest.patch('/users/me/privacy-settings', settings)
  },

  // Получение истории активности
  getActivityHistory: (params = {}) => {
    return apiRequest.get('/users/me/activity', { params })
  },

  // Экспорт данных пользователя
  exportUserData: () => {
    return apiRequest.get('/users/me/export', {
      responseType: 'blob'
    })
  },

  // Деактивация аккаунта
  deactivateAccount: (reason = '') => {
    return apiRequest.patch('/users/me/deactivate', { reason })
  },

  // Реактивация аккаунта
  reactivateAccount: () => {
    return apiRequest.patch('/users/me/reactivate')
  },

  // Удаление аккаунта
  deleteAccount: (password) => {
    return apiRequest.delete('/users/me', {
      data: { password }
    })
  },

  // Получение активных сессий
  getActiveSessions: () => {
    return apiRequest.get('/users/me/sessions')
  },

  // Завершение сессии
  terminateSession: (sessionId) => {
    return apiRequest.delete(`/users/me/sessions/${sessionId}`)
  },

  // Завершение всех сессий кроме текущей
  terminateAllSessions: () => {
    return apiRequest.delete('/users/me/sessions/all')
  },

  // Получение двухфакторной аутентификации
  getTwoFactorAuth: () => {
    return apiRequest.get('/users/me/2fa')
  },

  // Включение двухфакторной аутентификации
  enableTwoFactorAuth: (code) => {
    return apiRequest.post('/users/me/2fa/enable', { code })
  },

  // Отключение двухфакторной аутентификации
  disableTwoFactorAuth: (password, code) => {
    return apiRequest.post('/users/me/2fa/disable', { password, code })
  },

  // Получение резервных кодов для 2FA
  getBackupCodes: () => {
    return apiRequest.get('/users/me/2fa/backup-codes')
  },

  // Регенерация резервных кодов
  regenerateBackupCodes: () => {
    return apiRequest.post('/users/me/2fa/backup-codes/regenerate')
  },

  // Поиск пользователей
  searchUsers: (query, params = {}) => {
    return apiRequest.get('/users/search', {
      params: { q: query, ...params }
    })
  },

  // Получение рекомендуемых пользователей
  getRecommendedUsers: (limit = 10) => {
    return apiRequest.get('/users/recommended', {
      params: { limit }
    })
  },

  // Получение топ пользователей
  getTopUsers: (period = '30d', limit = 10) => {
    return apiRequest.get('/users/top', {
      params: { period, limit }
    })
  },

  // Получение пользователей поблизости
  getNearbyUsers: (latitude, longitude, radius = 10) => {
    return apiRequest.get('/users/nearby', {
      params: { lat: latitude, lng: longitude, radius }
    })
  },

  // Обновление местоположения пользователя
  updateLocation: (latitude, longitude) => {
    return apiRequest.patch('/users/me/location', {
      latitude,
      longitude
    })
  },

  // Очистка местоположения пользователя
  clearLocation: () => {
    return apiRequest.delete('/users/me/location')
  },
}