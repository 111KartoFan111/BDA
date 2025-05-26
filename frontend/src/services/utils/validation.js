// Валидация email
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) {
    return 'Email обязателен'
  }
  if (!emailRegex.test(email)) {
    return 'Некорректный формат email'
  }
  return null
}

// Валидация пароля
export const validatePassword = (password) => {
  if (!password) {
    return 'Пароль обязателен'
  }
  if (password.length < 8) {
    return 'Пароль должен содержать минимум 8 символов'
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return 'Пароль должен содержать строчные буквы'
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return 'Пароль должен содержать заглавные буквы'
  }
  if (!/(?=.*\d)/.test(password)) {
    return 'Пароль должен содержать цифры'
  }
  return null
}

// Валидация телефона
export const validatePhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  if (!phone) {
    return 'Телефон обязателен'
  }
  const cleanPhone = phone.replace(/\s/g, '')
  if (!phoneRegex.test(cleanPhone)) {
    return 'Некорректный формат телефона'
  }
  return null
}

// Валидация имени
export const validateName = (name, fieldName = 'Имя') => {
  if (!name || !name.trim()) {
    return `${fieldName} обязательно`
  }
  if (name.trim().length < 2) {
    return `${fieldName} должно содержать минимум 2 символа`
  }
  if (name.trim().length > 50) {
    return `${fieldName} не должно превышать 50 символов`
  }
  if (!/^[a-zA-Zа-яА-ЯёЁ\s-]+$/.test(name)) {
    return `${fieldName} должно содержать только буквы, пробелы и дефисы`
  }
  return null
}

// Валидация цены
export const validatePrice = (price, min = 0, max = 1000000) => {
  if (price === null || price === undefined || price === '') {
    return 'Цена обязательна'
  }
  const numPrice = parseFloat(price)
  if (isNaN(numPrice)) {
    return 'Цена должна быть числом'
  }
  if (numPrice < min) {
    return `Цена не может быть меньше ${min}`
  }
  if (numPrice > max) {
    return `Цена не может быть больше ${max}`
  }
  return null
}

// Валидация URL
export const validateUrl = (url, required = false) => {
  if (!url) {
    return required ? 'URL обязателен' : null
  }
  try {
    new URL(url)
    return null
  } catch {
    return 'Некорректный формат URL'
  }
}

// Валидация адреса кошелька
export const validateWalletAddress = (address) => {
  if (!address) {
    return 'Адрес кошелька обязателен'
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return 'Некорректный формат адреса Ethereum'
  }
  return null
}

// Валидация даты
export const validateDate = (date, fieldName = 'Дата') => {
  if (!date) {
    return `${fieldName} обязательна`
  }
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return `Некорректный формат ${fieldName.toLowerCase()}`
  }
  return null
}

// Валидация периода дат
export const validateDateRange = (startDate, endDate) => {
  const startError = validateDate(startDate, 'Дата начала')
  if (startError) return startError
  
  const endError = validateDate(endDate, 'Дата окончания')
  if (endError) return endError
  
  if (new Date(startDate) >= new Date(endDate)) {
    return 'Дата начала должна быть раньше даты окончания'
  }
  
  if (new Date(startDate) < new Date()) {
    return 'Дата начала не может быть в прошлом'
  }
  
  return null
}

// Валидация возраста
export const validateAge = (birthDate, minAge = 18) => {
  if (!birthDate) {
    return 'Дата рождения обязательна'
  }
  
  const today = new Date()
  const birth = new Date(birthDate)
  const age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  if (age < minAge) {
    return `Возраст должен быть не менее ${minAge} лет`
  }
  
  return null
}

// Валидация размера файла
export const validateFileSize = (file, maxSizeMB = 5) => {
  if (!file) {
    return 'Файл обязателен'
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return `Размер файла не должен превышать ${maxSizeMB}MB`
  }
  
  return null
}

// Валидация типа файла
export const validateFileType = (file, allowedTypes = []) => {
  if (!file) {
    return 'Файл обязателен'
  }
  
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return `Разрешены только файлы типов: ${allowedTypes.join(', ')}`
  }
  
  return null
}

// Валидация изображения
export const validateImage = (file, maxSizeMB = 5) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  
  const sizeError = validateFileSize(file, maxSizeMB)
  if (sizeError) return sizeError
  
  const typeError = validateFileType(file, allowedTypes)
  if (typeError) return typeError
  
  return null
}

// Валидация текста с ограничением длины
export const validateText = (text, minLength = 0, maxLength = 1000, fieldName = 'Текст') => {
  if (minLength > 0 && (!text || text.trim().length < minLength)) {
    return `${fieldName} должен содержать минимум ${minLength} символов`
  }
  
  if (text && text.length > maxLength) {
    return `${fieldName} не должен превышать ${maxLength} символов`
  }
  
  return null
}

// Валидация описания
export const validateDescription = (description, required = false) => {
  if (required && (!description || !description.trim())) {
    return 'Описание обязательно'
  }
  
  return validateText(description, 0, 2000, 'Описание')
}

// Валидация массива (например, категорий)
export const validateArray = (array, minItems = 0, maxItems = 10, fieldName = 'Список') => {
  if (!Array.isArray(array)) {
    return `${fieldName} должен быть массивом`
  }
  
  if (array.length < minItems) {
    return `${fieldName} должен содержать минимум ${minItems} элементов`
  }
  
  if (array.length > maxItems) {
    return `${fieldName} не должен содержать более ${maxItems} элементов`
  }
  
  return null
}

// Валидация номера карты
export const validateCardNumber = (cardNumber) => {
  if (!cardNumber) {
    return 'Номер карты обязателен'
  }
  
  const cleanNumber = cardNumber.replace(/\s/g, '')
  if (!/^\d{13,19}$/.test(cleanNumber)) {
    return 'Некорректный номер карты'
  }
  
  // Алгоритм Луна
  let sum = 0
  let isEven = false
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i])
    
    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }
    
    sum += digit
    isEven = !isEven
  }
  
  if (sum % 10 !== 0) {
    return 'Некорректный номер карты'
  }
  
  return null
}

// Валидация CVV
export const validateCVV = (cvv) => {
  if (!cvv) {
    return 'CVV обязателен'
  }
  
  if (!/^\d{3,4}$/.test(cvv)) {
    return 'CVV должен содержать 3-4 цифры'
  }
  
  return null
}

// Валидация срока действия карты
export const validateExpiryDate = (month, year) => {
  if (!month || !year) {
    return 'Срок действия обязателен'
  }
  
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  
  const expiryMonth = parseInt(month)
  const expiryYear = parseInt(year)
  
  if (expiryMonth < 1 || expiryMonth > 12) {
    return 'Некорректный месяц'
  }
  
  if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
    return 'Срок действия карты истек'
  }
  
  return null
}

// Комплексная валидация формы
export const validateForm = (data, rules) => {
  const errors = {}
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field]
    
    for (const rule of fieldRules) {
      let error = null
      
      if (typeof rule === 'function') {
        error = rule(value)
      } else if (typeof rule === 'object') {
        const { validator, message, ...params } = rule
        error = validator(value, ...Object.values(params))
        if (error && message) {
          error = message
        }
      }
      
      if (error) {
        errors[field] = error
        break // Останавливаемся на первой ошибке для поля
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Пример использования validateForm:
// const rules = {
//   email: [validateEmail],
//   password: [validatePassword],
//   firstName: [(value) => validateName(value, 'Имя')],
//   price: [{ validator: validatePrice, min: 0, max: 10000 }]
// }
// const { isValid, errors } = validateForm(formData, rules)

export default {
  validateEmail,
  validatePassword,
  validatePhone,
  validateName,
  validatePrice,
  validateUrl,
  validateWalletAddress,
  validateDate,
  validateDateRange,
  validateAge,
  validateFileSize,
  validateFileType,
  validateImage,
  validateText,
  validateDescription,
  validateArray,
  validateCardNumber,
  validateCVV,
  validateExpiryDate,
  validateForm
}