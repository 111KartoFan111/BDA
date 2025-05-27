import axios from 'axios'
import toast from 'react-hot-toast'

// Базовый URL API - исправляем путь
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Создание экземпляра axios
const api = axios.create({
  baseURL: API_BASE_URL,
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
      headers: config.headers
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
        : 'Ошибка подключения к серверу'
      toast.error(message)
      return Promise.reject(error)
    }

    // Обработка различных статусов ошибок
    switch (response.status) {
      case 401:
        // Неавторизован - удаляем токен и перенаправляем на логин
        localStorage.removeItem('token')
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
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
        toast.error('Запрашиваемый ресурс не найден')
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
      
      default:
        if (response.status >= 500) {
          toast.error('Ошибка сервера. Попробуйте позже')
        } else if (response.data?.message) {
          // Не показываем toast для ошибок валидации и некоторых других
          if (response.status !== 422 && response.status !== 400) {
            toast.error(response.data.message)
          }
        } else if (response.data?.detail) {
          if (response.status !== 422 && response.status !== 400) {
            toast.error(response.data.detail)
          }
        } else {
          toast.error('Произошла неожиданная ошибка')
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
    console.log('Testing API connection...')
    const response = await checkApiHealth()
    console.log('API Health Response:', response)
    return response
  } catch (error) {
    console.error('API connection test failed:', error)
    throw error
  }
}

export default api