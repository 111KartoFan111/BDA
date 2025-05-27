import { apiRequest } from './base'

export const authAPI = {
  // Регистрация - исправляем поля в соответствии с бэкендом
  register: (userData) => {
    return apiRequest.post('/v1/auth/register', {
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
      bio: userData.bio,
      location: userData.location,
      website: userData.website,
    })
  },

  // Вход
  login: (credentials) => {
    return apiRequest.post('/v1/auth/login', {
      email: credentials.email,
      password: credentials.password,
    })
  },

  // Выход
  logout: () => {
    return apiRequest.post('/v1/auth/logout')
  },

  // Получение текущего пользователя
  getCurrentUser: () => {
    return apiRequest.get('/v1/auth/me')
  },

  // Обновление профиля
  updateProfile: (userData) => {
    return apiRequest.patch('/v1/auth/profile', {
      first_name: userData.firstName,
      last_name: userData.lastName,
      phone: userData.phone,
      bio: userData.bio,
      location: userData.location,
      website: userData.website,
    })
  },

  // Изменение пароля
  changePassword: (passwords) => {
    return apiRequest.patch('/v1/auth/change-password', {
      current_password: passwords.currentPassword,
      new_password: passwords.newPassword,
    })
  },

  // Восстановление пароля
  forgotPassword: (email) => {
    return apiRequest.post('/v1/auth/forgot-password', { email })
  },

  // Сброс пароля
  resetPassword: (data) => {
    return apiRequest.post('/v1/auth/reset-password', {
      token: data.token,
      new_password: data.newPassword,
    })
  },

  // Подтверждение email
  verifyEmail: (token) => {
    return apiRequest.post('/v1/auth/verify-email', { token })
  },

  // Повторная отправка письма подтверждения
  resendVerification: () => {
    return apiRequest.post('/v1/auth/resend-verification')
  },

  // Обновление аватара
  updateAvatar: (formData) => {
    return apiRequest.post('/v1/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Удаление аватара
  deleteAvatar: () => {
    return apiRequest.delete('/v1/auth/avatar')
  },

  // Получение настроек уведомлений
  getNotificationSettings: () => {
    return apiRequest.get('/v1/auth/notification-settings')
  },

  // Обновление настроек уведомлений
  updateNotificationSettings: (settings) => {
    return apiRequest.patch('/v1/auth/notification-settings', settings)
  },

  // Получение истории активности
  getActivityHistory: (params = {}) => {
    return apiRequest.get('/v1/auth/activity', { params })
  },

  // Удаление аккаунта
  deleteAccount: (password) => {
    return apiRequest.delete('/v1/auth/account', {
      data: { password }
    })
  },
}