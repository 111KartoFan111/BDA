import { apiRequest } from './base'

export const authAPI = {
  // Регистрация
  register: (userData) => {
    return apiRequest.post('/auth/register', {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
    })
  },

  // Вход
  login: (credentials) => {
    return apiRequest.post('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    })
  },

  // Выход
  logout: () => {
    return apiRequest.post('/auth/logout')
  },

  // Получение текущего пользователя
  getCurrentUser: () => {
    return apiRequest.get('/auth/me')
  },

  // Обновление профиля
  updateProfile: (userData) => {
    return apiRequest.patch('/auth/profile', userData)
  },

  // Изменение пароля
  changePassword: (passwords) => {
    return apiRequest.patch('/auth/change-password', {
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    })
  },

  // Восстановление пароля
  forgotPassword: (email) => {
    return apiRequest.post('/auth/forgot-password', { email })
  },

  // Сброс пароля
  resetPassword: (data) => {
    return apiRequest.post('/auth/reset-password', {
      token: data.token,
      newPassword: data.newPassword,
    })
  },

  // Подтверждение email
  verifyEmail: (token) => {
    return apiRequest.post('/auth/verify-email', { token })
  },

  // Повторная отправка письма подтверждения
  resendVerification: () => {
    return apiRequest.post('/auth/resend-verification')
  },

  // Обновление аватара
  updateAvatar: (formData) => {
    return apiRequest.post('/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Удаление аватара
  deleteAvatar: () => {
    return apiRequest.delete('/auth/avatar')
  },

  // Получение настроек уведомлений
  getNotificationSettings: () => {
    return apiRequest.get('/auth/notification-settings')
  },

  // Обновление настроек уведомлений
  updateNotificationSettings: (settings) => {
    return apiRequest.patch('/auth/notification-settings', settings)
  },

  // Получение истории активности
  getActivityHistory: (params = {}) => {
    return apiRequest.get('/auth/activity', { params })
  },

  // Удаление аккаунта
  deleteAccount: (password) => {
    return apiRequest.delete('/auth/account', {
      data: { password }
    })
  },
}