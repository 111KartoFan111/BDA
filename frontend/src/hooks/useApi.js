import { useState, useEffect, useCallback } from 'react'

// Хук для упрощения работы с API запросами
export const useApi = (apiFunction, dependencies = [], options = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const {
    immediate = true,
    onSuccess,
    onError,
    defaultValue = null
  } = options

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiFunction(...args)
      const result = response.data
      
      setData(result)
      onSuccess?.(result)
      
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Произошла ошибка'
      setError(errorMessage)
      onError?.(err)
      
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, dependencies)

  const refresh = useCallback(() => {
    return execute()
  }, [execute])

  const reset = useCallback(() => {
    setData(defaultValue)
    setError(null)
    setLoading(false)
  }, [defaultValue])

  useEffect(() => {
    if (immediate) {
      execute()
    } else {
      setLoading(false)
    }
  }, dependencies)

  return {
    data,
    loading,
    error,
    execute,
    refresh,
    reset
  }
}

// ИСПРАВЛЕННЫЙ хук для пагинированных данных
export const usePaginatedApi = (apiFunction, options = {}) => {
  const [items, setItems] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { 
    itemsPerPage = 10,
    resetOnRefresh = false,
    params = {} // ИСПРАВЛЕНИЕ: Добавляем дефолтное значение
  } = options

  // ИСПРАВЛЕНИЕ: Функция для очистки пустых параметров
  const cleanParams = useCallback((params) => {
    const cleaned = {}
    for (const [key, value] of Object.entries(params)) {
      // Добавляем только непустые значения
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = value
      }
    }
    return cleaned
  }, [])

  const fetchPage = useCallback(async (page = 1, append = false) => {
    try {
      setLoading(true)
      setError(null)
      
      // ИСПРАВЛЕНИЕ: Очищаем параметры перед отправкой
      const cleanedParams = cleanParams({
        page,
        limit: itemsPerPage,
        ...params
      })
      
      console.log('Sending cleaned params:', cleanedParams) // Для отладки
      
      const response = await apiFunction(cleanedParams)
      
      // ИСПРАВЛЕНИЕ: Более гибкая обработка ответа
      let responseData = response.data
      
      // Если данные обернуты в data
      if (responseData.data) {
        responseData = responseData.data
      }
      
      const newItems = responseData.data || responseData.items || responseData || []
      const total = responseData.totalPages || responseData.total_pages || 1
      const count = responseData.totalItems || responseData.total_items || responseData.total || newItems.length
      
      if (append && page > 1) {
        setItems(prev => [...prev, ...newItems])
      } else {
        setItems(newItems)
      }
      
      setCurrentPage(page)
      setTotalPages(total)
      setTotalItems(count)
      
      return { success: true, data: newItems }
    } catch (err) {
      console.error('Paginated API error:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Произошла ошибка'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [apiFunction, itemsPerPage, params, cleanParams])

  const loadMore = useCallback(() => {
    if (currentPage < totalPages && !loading) {
      return fetchPage(currentPage + 1, true)
    }
  }, [currentPage, totalPages, loading, fetchPage])

  const refresh = useCallback(() => {
    if (resetOnRefresh) {
      setItems([])
      setCurrentPage(1)
    }
    return fetchPage(1, false)
  }, [fetchPage, resetOnRefresh])

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      return fetchPage(page, false)
    }
  }, [fetchPage, totalPages, currentPage])

  return {
    items,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    hasMore: currentPage < totalPages,
    fetchPage,
    loadMore,
    refresh,
    goToPage
  }
}

// Хук для работы с формами и API
export const useApiForm = (apiFunction, options = {}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  const { 
    onSuccess,
    onError,
    resetOnSuccess = true,
    successDuration = 3000
  } = options

  const submit = useCallback(async (formData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)
      
      const response = await apiFunction(formData)
      const result = response.data
      
      setSuccess(true)
      onSuccess?.(result)
      
      if (resetOnSuccess && successDuration > 0) {
        setTimeout(() => setSuccess(false), successDuration)
      }
      
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Произошла ошибка'
      setError(errorMessage)
      onError?.(err)
      
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [apiFunction, onSuccess, onError, resetOnSuccess, successDuration])

  const reset = useCallback(() => {
    setError(null)
    setSuccess(false)
    setLoading(false)
  }, [])

  return {
    loading,
    error,
    success,
    submit,
    reset
  }
}

export default useApi