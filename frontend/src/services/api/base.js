import axios from 'axios'
import toast from 'react-hot-toast'

// Базовый URL API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Создание экземпляра axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 секунд
})

// Интерцептор запросов - добавляем токен авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Интерцептор ответов - обработка ошибок
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const { response } = error

    // Если нет ответа от сервера
    if (!response) {
      toast.error('Ошибка подключения к серверу')
      return Promise.reject(error)
    }

    // Обработка различных статусов ошибок
    switch (response.status) {
      case 401:
        // Неавторизован - удаляем токен и перенаправляем на логин
        localStorage.removeItem('token')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
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
          toast.error(response.data.message)
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

export default api