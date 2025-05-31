import axios from 'axios'
import toast from 'react-hot-toast'

// Базовый URL API - ИСПРАВЛЕНО: используем базовый URL без /v1
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Создание экземпляра axios
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`, // Добавляем только /api
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 50000, // 30 секунд
})

// Интерцептор запросов - добавляем токен авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Логирование для отладки
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
      params: config.params
    })
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Интерцептор ответов - обработка ошибок
api.interceptors.response.use(
  (response) => {
    // Логирование успешных ответов
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    })
    return response
  },
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message
    })

    const { response } = error

    // Если нет ответа от сервера
    if (!response) {
      const message = error.code === 'ECONNABORTED' 
        ? 'Превышено время ожидания ответа от сервера'
        : 'Ошибка подключения к серверу. Проверьте, что бэкенд запущен на http://localhost:8000'
      
      // Показываем toast только для серьезных ошибок подключения
      if (error.code !== 'ERR_CANCELED') {
        toast.error(message)
      }
      return Promise.reject(error)
    }

    // Обработка различных статусов ошибок
    switch (response.status) {
      case 401:
        // Неавторизован - удаляем токен и перенаправляем на логин
        localStorage.removeItem('token')
        if (window.location.pathname !== '/login' && 
            window.location.pathname !== '/register' && 
            window.location.pathname !== '/') {
          toast.error('Сессия истекла. Необходимо авторизоваться заново.')
          setTimeout(() => {
            window.location.href = '/login'
          }, 1000)
        }
        break
      
      case 403:
        toast.error('Недостаточно прав для выполнения операции')
        break
      
      case 404:
        // Для 404 не показываем общий toast, пусть компоненты сами решают
        console.log('Resource not found:', response.config.url)
        break
      
      case 422:
        // Ошибки валидации - не показываем toast, обрабатываем в компонентах
        console.log('Validation errors:', response.data)
        break
      
      case 429:
        toast.error('Слишком много запросов. Попробуйте позже')
        break
      
      case 500:
        toast.error('Внутренняя ошибка сервера')
        break
      
      case 502:
      case 503:
      case 504:
        toast.error('Сервер временно недоступен. Попробуйте позже')
        break
      
      default:
        if (response.status >= 500) {
          toast.error('Ошибка сервера. Попробуйте позже')
        } else if (response.data?.message) {
          // Показываем toast только для неожиданных ошибок
          if (response.status !== 422 && response.status !== 400 && response.status !== 404) {
            toast.error(response.data.message)
          }
        } else if (response.data?.detail) {
          if (response.status !== 422 && response.status !== 400 && response.status !== 404) {
            toast.error(response.data.detail)
          }
        }
    }

    return Promise.reject(error)
  }
)

// Вспомогательные функции для различных типов запросов
export const apiRequest = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
}

// Функция для загрузки файлов
export const uploadFile = (url, formData, onUploadProgress) => {
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  })
}

// Функция для скачивания файлов
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    })
    
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('Download error:', error)
    toast.error('Ошибка при скачивании файла')
  }
}

// Проверка статуса API
export const checkApiHealth = async () => {
  try {
    const response = await api.get('/health')
    return response.data
  } catch (error) {
    console.error('API health check failed:', error)
    return null
  }
}

// Функция для тестирования подключения к API
export const testApiConnection = async () => {
  try {
    console.log('Testing API connection to:', `${API_BASE_URL}/api`)
    
    // Пробуем простой запрос
    const response = await api.get('/v1/categories', { 
      timeout: 5000,
      // Не показываем ошибки для тестового запроса
      validateStatus: () => true 
    })
    
    console.log('API connection test result:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    })
    
    return {
      success: response.status < 500,
      status: response.status,
      message: response.status < 500 ? 'API доступен' : 'API недоступен'
    }
  } catch (error) {
    console.error('API connection test failed:', error)
    return {
      success: false,
      error: error.message,
      message: 'Не удается подключиться к API'
    }
  }
}

export default api