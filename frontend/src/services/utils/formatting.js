import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { ru } from 'date-fns/locale'

// Форматирование валюты
export const formatCurrency = (amount, currency = 'ETH', showSymbol = true) => {
  if (amount === null || amount === undefined) return '—'
  
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount)) return '—'

  const formatOptions = {
    minimumFractionDigits: currency === 'ETH' ? 4 : 0,
    maximumFractionDigits: currency === 'ETH' ? 6 : 0,
  }

  if (currency === 'RUB') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      ...formatOptions
    }).format(numAmount)
  }

  const formatted = new Intl.NumberFormat('ru-RU', formatOptions).format(numAmount)
  
  if (showSymbol && currency === 'ETH') {
    return `${formatted} ETH`
  }
  
  if (showSymbol && currency === 'USD') {
    return `$${formatted}`
  }

  return formatted
}

// Форматирование чисел
export const formatNumber = (number, options = {}) => {
  if (number === null || number === undefined) return '—'
  
  const numValue = parseFloat(number)
  if (isNaN(numValue)) return '—'

  const defaultOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }

  return new Intl.NumberFormat('ru-RU', {
    ...defaultOptions,
    ...options
  }).format(numValue)
}

// Форматирование процентов
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined) return '—'
  
  const numValue = parseFloat(value)
  if (isNaN(numValue)) return '—'

  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue / 100)
}

// Форматирование даты
export const formatDate = (date, formatString = 'dd.MM.yyyy') => {
  if (!date) return '—'
  
  let dateObj
  if (typeof date === 'string') {
    dateObj = parseISO(date)
  } else {
    dateObj = new Date(date)
  }
  
  if (!isValid(dateObj)) return '—'
  
  return format(dateObj, formatString, { locale: ru })
}

// Форматирование даты и времени
export const formatDateTime = (date, formatString = 'dd.MM.yyyy HH:mm') => {
  return formatDate(date, formatString)
}

// Относительное время (например, "2 часа назад")
export const formatRelativeTime = (date) => {
  if (!date) return '—'
  
  let dateObj
  if (typeof date === 'string') {
    dateObj = parseISO(date)
  } else {
    dateObj = new Date(date)
  }
  
  if (!isValid(dateObj)) return '—'
  
  return formatDistanceToNow(dateObj, { 
    addSuffix: true, 
    locale: ru 
  })
}

// Форматирование размера файла
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Б'
  if (!bytes) return '—'
  
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Форматирование времени аренды
export const formatRentalDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return '—'
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (!isValid(start) || !isValid(end)) return '—'
  
  const diffTime = Math.abs(end - start)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    return '1 день'
  } else if (diffDays < 5) {
    return `${diffDays} дня`
  } else if (diffDays < 21) {
    return `${diffDays} дней`
  } else if (diffDays < 25) {
    return `${diffDays} дня`
  } else {
    return `${diffDays} дней`
  }
}

// Форматирование адреса кошелька
export const formatWalletAddress = (address, length = 6) => {
  if (!address) return '—'
  
  if (address.length <= length * 2) return address
  
  return `${address.slice(0, length)}...${address.slice(-length)}`
}

// Форматирование хеша транзакции
export const formatTransactionHash = (hash, length = 8) => {
  return formatWalletAddress(hash, length)
}

// Форматирование номера телефона
export const formatPhoneNumber = (phone) => {
  if (!phone) return '—'
  
  // Удаляем все нецифровые символы
  const cleaned = phone.replace(/\D/g, '')
  
  // Форматируем российский номер
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`
  }
  
  // Форматируем номер с кодом страны
  if (cleaned.length >= 10) {
    const match = cleaned.match(/^(\d{1,3})(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`
    }
  }
  
  return phone
}

// Форматирование статуса
export const formatStatus = (status) => {
  const statusMap = {
    'active': 'Активный',
    'inactive': 'Неактивный',
    'pending': 'Ожидает',
    'approved': 'Одобрен',
    'rejected': 'Отклонен',
    'completed': 'Завершен',
    'cancelled': 'Отменен',
    'in_progress': 'В процессе',
    'draft': 'Черновик',
    'published': 'Опубликован',
    'archived': 'Архивирован'
  }
  
  return statusMap[status] || status
}

// Обрезка текста
export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  
  return text.slice(0, maxLength).trim() + suffix
}

// Форматирование имени пользователя
export const formatUserName = (user) => {
  if (!user) return 'Неизвестный пользователь'
  
  const { firstName, lastName, name, email } = user
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  
  if (name) {
    return name
  }
  
  if (firstName) {
    return firstName
  }
  
  if (email) {
    return email.split('@')[0]
  }
  
  return 'Пользователь'
}

// Форматирование рейтинга
export const formatRating = (rating, maxRating = 5) => {
  if (rating === null || rating === undefined) return '—'
  
  const numRating = parseFloat(rating)
  if (isNaN(numRating)) return '—'
  
  return `${numRating.toFixed(1)}/${maxRating}`
}

// Генерация инициалов пользователя
export const generateInitials = (user) => {
  if (!user) return '??'
  
  const { firstName, lastName, name, email } = user
  
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  
  if (name) {
    const nameParts = name.split(' ')
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase()
  }
  
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  
  return '??'
}

// Форматирование URL
export const formatUrl = (url) => {
  if (!url) return ''
  
  // Добавляем протокол если его нет
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  
  return url
}

// Валидация и форматирование email
export const formatEmail = (email) => {
  if (!email) return ''
  return email.toLowerCase().trim()
}