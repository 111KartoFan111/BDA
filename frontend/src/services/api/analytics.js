import { apiRequest } from './base'

export const analyticsAPI = {
  // Общая статистика платформы
  getPlatformStats: (period = '30d') => {
    return apiRequest.get('/analytics/platform', {
      params: { period }
    })
  },

  // Статистика пользователей
  getUserStats: (period = '30d') => {
    return apiRequest.get('/analytics/users', {
      params: { period }
    })
  },

  // Статистика товаров
  getItemStats: (period = '30d') => {
    return apiRequest.get('/analytics/items', {
      params: { period }
    })
  },

  // Статистика контрактов
  getContractStats: (period = '30d') => {
    return apiRequest.get('/analytics/contracts', {
      params: { period }
    })
  },

  // Финансовая статистика
  getFinancialStats: (period = '30d') => {
    return apiRequest.get('/analytics/financial', {
      params: { period }
    })
  },

  // Статистика по категориям
  getCategoryStats: (period = '30d') => {
    return apiRequest.get('/analytics/categories', {
      params: { period }
    })
  },

  // Географическая статистика
  getGeoStats: (period = '30d') => {
    return apiRequest.get('/analytics/geography', {
      params: { period }
    })
  },

  // Статистика активности пользователей
  getUserActivityStats: (period = '30d') => {
    return apiRequest.get('/analytics/user-activity', {
      params: { period }
    })
  },

  // Конверсионная воронка
  getConversionFunnel: (period = '30d') => {
    return apiRequest.get('/analytics/conversion-funnel', {
      params: { period }
    })
  },

  // Анализ трендов
  getTrends: (metric, period = '30d') => {
    return apiRequest.get('/analytics/trends', {
      params: { metric, period }
    })
  },

  // Сравнительная аналитика
  getComparativeStats: (periods) => {
    return apiRequest.post('/analytics/comparative', { periods })
  },

  // Прогнозирование
  getForecast: (metric, horizon = '30d') => {
    return apiRequest.get('/analytics/forecast', {
      params: { metric, horizon }
    })
  },

  // Когортный анализ
  getCohortAnalysis: (period = '30d') => {
    return apiRequest.get('/analytics/cohort', {
      params: { period }
    })
  },

  // Анализ удержания пользователей
  getRetentionAnalysis: (period = '30d') => {
    return apiRequest.get('/analytics/retention', {
      params: { period }
    })
  },

  // Популярные товары
  getPopularItems: (period = '30d', limit = 10) => {
    return apiRequest.get('/analytics/popular-items', {
      params: { period, limit }
    })
  },

  // Топ пользователи
  getTopUsers: (period = '30d', limit = 10) => {
    return apiRequest.get('/analytics/top-users', {
      params: { period, limit }
    })
  },

  // Анализ поведения пользователей
  getUserBehaviorAnalysis: (period = '30d') => {
    return apiRequest.get('/analytics/user-behavior', {
      params: { period }
    })
  },

  // Анализ ценообразования
  getPriceAnalysis: (category = '', period = '30d') => {
    return apiRequest.get('/analytics/pricing', {
      params: { category, period }
    })
  },

  // Сезонный анализ
  getSeasonalAnalysis: (metric) => {
    return apiRequest.get('/analytics/seasonal', {
      params: { metric }
    })
  },

  // Анализ эффективности
  getEfficiencyMetrics: (period = '30d') => {
    return apiRequest.get('/analytics/efficiency', {
      params: { period }
    })
  },

  // Метрики качества сервиса
  getQualityMetrics: (period = '30d') => {
    return apiRequest.get('/analytics/quality', {
      params: { period }
    })
  },

  // Анализ рисков
  getRiskAnalysis: (period = '30d') => {
    return apiRequest.get('/analytics/risk', {
      params: { period }
    })
  },

  // Экспорт данных аналитики
  exportAnalytics: (type, params = {}) => {
    return apiRequest.get(`/analytics/export/${type}`, {
      params,
      responseType: 'blob'
    })
  },

  // Создание пользовательского отчета
  createCustomReport: (reportConfig) => {
    return apiRequest.post('/analytics/custom-report', {
      name: reportConfig.name,
      description: reportConfig.description,
      metrics: reportConfig.metrics,
      filters: reportConfig.filters,
      period: reportConfig.period,
      visualization: reportConfig.visualization,
    })
  },

  // Получение пользовательских отчетов
  getCustomReports: () => {
    return apiRequest.get('/analytics/custom-reports')
  },

  // Получение конкретного пользовательского отчета
  getCustomReport: (id) => {
    return apiRequest.get(`/analytics/custom-reports/${id}`)
  },

  // Обновление пользовательского отчета
  updateCustomReport: (id, reportConfig) => {
    return apiRequest.patch(`/analytics/custom-reports/${id}`, reportConfig)
  },

  // Удаление пользовательского отчета
  deleteCustomReport: (id) => {
    return apiRequest.delete(`/analytics/custom-reports/${id}`)
  },

  // Планирование отчетов
  scheduleReport: (reportId, schedule) => {
    return apiRequest.post(`/analytics/custom-reports/${reportId}/schedule`, {
      frequency: schedule.frequency,
      recipients: schedule.recipients,
      format: schedule.format,
      enabled: schedule.enabled,
    })
  },

  // Отправка отчета
  sendReport: (reportId, recipients) => {
    return apiRequest.post(`/analytics/custom-reports/${reportId}/send`, {
      recipients
    })
  },

  // Получение алертов аналитики
  getAnalyticsAlerts: () => {
    return apiRequest.get('/analytics/alerts')
  },

  // Создание алерта
  createAlert: (alertConfig) => {
    return apiRequest.post('/analytics/alerts', {
      name: alertConfig.name,
      metric: alertConfig.metric,
      condition: alertConfig.condition,
      threshold: alertConfig.threshold,
      recipients: alertConfig.recipients,
      enabled: alertConfig.enabled,
    })
  },

  // Обновление алерта
  updateAlert: (id, alertConfig) => {
    return apiRequest.patch(`/analytics/alerts/${id}`, alertConfig)
  },

  // Удаление алерта
  deleteAlert: (id) => {
    return apiRequest.delete(`/analytics/alerts/${id}`)
  },

  // Получение метрик в реальном времени
  getRealTimeMetrics: () => {
    return apiRequest.get('/analytics/realtime')
  },

  // Анализ A/B тестирования
  getABTestResults: (testId) => {
    return apiRequest.get(`/analytics/ab-tests/${testId}`)
  },

  // Получение всех A/B тестов
  getABTests: () => {
    return apiRequest.get('/analytics/ab-tests')
  },

  // Создание A/B теста
  createABTest: (testConfig) => {
    return apiRequest.post('/analytics/ab-tests', {
      name: testConfig.name,
      description: testConfig.description,
      variants: testConfig.variants,
      metrics: testConfig.metrics,
      targetAudience: testConfig.targetAudience,
      duration: testConfig.duration,
    })
  },

  // Завершение A/B теста
  finishABTest: (testId, winnerVariant) => {
    return apiRequest.patch(`/analytics/ab-tests/${testId}/finish`, {
      winner: winnerVariant
    })
  },
}