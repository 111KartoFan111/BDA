// frontend/src/services/utils/dateUtils.js
// Утилиты для работы с датами при отправке на бэкенд

/**
 * Преобразует дату из формата input[type="date"] (YYYY-MM-DD) в ISO формат для бэкенда
 * @param {string} dateString - Дата в формате YYYY-MM-DD
 * @param {string} timeString - Время в формате HH:mm (опционально)
 * @param {boolean} endOfDay - Установить время на конец дня (23:59:59)
 * @returns {string} - Дата в ISO формате
 */
export const formatDateForAPI = (dateString, timeString = '00:00', endOfDay = false) => {
  if (!dateString) return null
  
  try {
    // Если уже в ISO формате, возвращаем как есть
    if (dateString.includes('T') && dateString.includes('Z')) {
      return dateString
    }
    
    // Если только дата без времени
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const time = endOfDay ? '23:59:59' : timeString + ':00'
      const dateTime = `${dateString}T${time}Z`
      return dateTime
    }
    
    // Если дата с временем (datetime-local формат)
    if (dateString.includes('T')) {
      // Добавляем секунды если их нет
      const [datePart, timePart] = dateString.split('T')
      const fullTime = timePart.includes(':') && timePart.split(':').length === 2 
        ? `${timePart}:00` 
        : timePart
      return `${datePart}T${fullTime}Z`
    }
    
    // Создаем Date объект и возвращаем ISO строку
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }
    
    return date.toISOString()
  } catch (error) {
    console.error('Error formatting date:', error)
    return null
  }
}

/**
 * Преобразует дату из API (ISO формат) в формат для input[type="date"]
 * @param {string} isoString - Дата в ISO формате
 * @returns {string} - Дата в формате YYYY-MM-DD
 */
export const formatDateFromAPI = (isoString) => {
  if (!isoString) return ''
  
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }
    
    return date.toISOString().split('T')[0]
  } catch (error) {
    console.error('Error parsing date from API:', error)
    return ''
  }
}

/**
 * Преобразует дату из API в формат для input[type="datetime-local"]
 * @param {string} isoString - Дата в ISO формате
 * @returns {string} - Дата в формате YYYY-MM-DDTHH:mm
 */
export const formatDateTimeFromAPI = (isoString) => {
  if (!isoString) return ''
  
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }
    
    // Получаем локальное время в формате YYYY-MM-DDTHH:mm
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch (error) {
    console.error('Error parsing datetime from API:', error)
    return ''
  }
}

/**
 * Проверяет валидность даты
 * @param {string} dateString - Дата для проверки
 * @returns {boolean} - true если дата валидна
 */
export const isValidDate = (dateString) => {
  if (!dateString) return false
  
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Получает сегодняшнюю дату в формате YYYY-MM-DD
 * @returns {string} - Сегодняшняя дата
 */
export const getTodayString = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

/**
 * Получает завтрашнюю дату в формате YYYY-MM-DD
 * @returns {string} - Завтрашняя дата
 */
export const getTomorrowString = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

/**
 * Вычисляет количество дней между двумя датами
 * @param {string} startDate - Дата начала
 * @param {string} endDate - Дата окончания
 * @returns {number} - Количество дней
 */
export const getDaysDifference = (startDate, endDate) => {
  if (!startDate || !endDate) return 0
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
  
  const diffTime = Math.abs(end - start)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Проверяет, что дата не в прошлом
 * @param {string} dateString - Дата для проверки
 * @returns {boolean} - true если дата в будущем или сегодня
 */
export const isDateNotInPast = (dateString) => {
  if (!dateString) return false
  
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return date >= today
}

/**
 * Форматирует дату для отображения пользователю
 * @param {string} dateString - Дата в любом формате
 * @param {object} options - Опции форматирования
 * @returns {string} - Отформатированная дата
 */
export const formatDateForDisplay = (dateString, options = {}) => {
  if (!dateString) return '—'
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  }
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '—'
    
    return date.toLocaleDateString('ru-RU', defaultOptions)
  } catch (error) {
    console.error('Error formatting date for display:', error)
    return '—'
  }
}

/**
 * Добавляет дни к дате
 * @param {string} dateString - Исходная дата
 * @param {number} days - Количество дней для добавления
 * @returns {string} - Новая дата в формате YYYY-MM-DD
 */
export const addDays = (dateString, days) => {
  if (!dateString || !days) return dateString
  
  try {
    const date = new Date(dateString)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  } catch (error) {
    console.error('Error adding days to date:', error)
    return dateString
  }
}

export default {
  formatDateForAPI,
  formatDateFromAPI,
  formatDateTimeFromAPI,
  isValidDate,
  getTodayString,
  getTomorrowString,
  getDaysDifference,
  isDateNotInPast,
  formatDateForDisplay,
  addDays
}