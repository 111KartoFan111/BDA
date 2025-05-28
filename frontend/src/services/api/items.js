import { apiRequest } from './base'

export const itemsAPI = {
  // Получение списка товаров
  getItems: (params = {}) => {
    return apiRequest.get('/v1/items', { params })
  },

  // Получение товара по ID
  getItem: (id) => {
    return apiRequest.get(`/v1/items/${id}`)
  },

  // Создание нового товара
  createItem: (itemData) => {
    return apiRequest.post('/v1/items', itemData)
  },

  // Обновление товара
  updateItem: (id, itemData) => {
    return apiRequest.patch(`/v1/items/${id}`, itemData)
  },

  // Удаление товара
  deleteItem: (id) => {
    return apiRequest.delete(`/v1/items/${id}`)
  },

  // Загрузка изображений товара
  uploadImages: (id, formData) => {
    return apiRequest.post(`/v1/items/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Удаление изображения товара
  deleteImage: (id, imageId) => {
    return apiRequest.delete(`/v1/items/${id}/images/${imageId}`)
  },

  // Получение рекомендуемых товаров
  getFeaturedItems: (limit = 8) => {
    return apiRequest.get('/v1/items/featured', { params: { limit } })
  },

  // Получение похожих товаров
  getSimilarItems: (id, limit = 4) => {
    return apiRequest.get(`/v1/items/${id}/similar`, { params: { limit } })
  },

  // Поиск товаров
  searchItems: (query, params = {}) => {
    return apiRequest.get('/v1/items/search', { 
      params: { q: query, ...params } 
    })
  },

  // Получение товаров пользователя
  getUserItems: (userId, params = {}) => {
    return apiRequest.get(`/v1/users/${userId}/items`, { params })
  },

  // Получение моих товаров
  getMyItems: (params = {}) => {
    return apiRequest.get('/v1/items/my', { params })
  },

  // Получение категорий
  getCategories: () => {
    return apiRequest.get('/v1/categories')
  },

  // Получение статистики
  getStats: () => {
    return apiRequest.get('/v1/items/stats')
  },

  // Добавление в избранное
  addToFavorites: (id) => {
    return apiRequest.post(`/v1/items/${id}/favorite`)
  },

  // Удаление из избранного
  removeFromFavorites: (id) => {
    return apiRequest.delete(`/v1/items/${id}/favorite`)
  },

  // Получение избранных товаров
  getFavorites: (params = {}) => {
    return apiRequest.get('/v1/items/favorites', { params })
  },

  // Создание запроса на аренду
  createRentalRequest: (id, requestData) => {
    return apiRequest.post(`/v1/items/${id}/rental-request`, {
      startDate: requestData.startDate,
      endDate: requestData.endDate,
      message: requestData.message,
      totalPrice: requestData.totalPrice,
    })
  },

  // Получение запросов на аренду для товара
  getRentalRequests: (id) => {
    return apiRequest.get(`/v1/items/${id}/rental-requests`)
  },

  // Подтверждение запроса на аренду
  approveRentalRequest: (itemId, requestId) => {
    return apiRequest.patch(`/v1/items/${itemId}/rental-requests/${requestId}/approve`)
  },

  // Отклонение запроса на аренду
  rejectRentalRequest: (itemId, requestId, reason = '') => {
    return apiRequest.patch(`/v1/items/${itemId}/rental-requests/${requestId}/reject`, {
      reason
    })
  },

  // Получение календаря доступности
  getAvailabilityCalendar: (id, startDate, endDate) => {
    return apiRequest.get(`/v1/items/${id}/availability`, {
      params: { startDate, endDate }
    })
  },

  // Обновление календаря доступности
  updateAvailability: (id, availabilityData) => {
    return apiRequest.patch(`/v1/items/${id}/availability`, availabilityData)
  },

  // Добавление отзыва
  addReview: (id, reviewData) => {
    return apiRequest.post(`/v1/items/${id}/reviews`, {
      rating: reviewData.rating,
      comment: reviewData.comment,
      rentalId: reviewData.rentalId,
    })
  },

  // Получение отзывов
  getReviews: (id, params = {}) => {
    return apiRequest.get(`/v1/items/${id}/reviews`, { params })
  },

  // Получение средней оценки и количества отзывов
  getRatingStats: (id) => {
    return apiRequest.get(`/v1/items/${id}/rating-stats`)
  },

  // Жалоба на товар
  reportItem: (id, reportData) => {
    return apiRequest.post(`/v1/items/${id}/report`, {
      reason: reportData.reason,
      description: reportData.description,
    })
  },

  // Получение истории просмотров
  getViewHistory: (params = {}) => {
    return apiRequest.get('/v1/items/view-history', { params })
  },

  // Добавление просмотра
  addView: (id) => {
    return apiRequest.post(`/v1/items/${id}/view`)
  },

  // Получение предложений по цене
  getPriceSuggestions: (itemData) => {
    return apiRequest.post('/v1/items/price-suggestions', itemData)
  },

  // Получение аналитики по товару (для владельца)
  getItemAnalytics: (id, period = '30d') => {
    return apiRequest.get(`/v1/items/${id}/analytics`, {
      params: { period }
    })
  },
}