// API константы
export const API_ENDPOINTS = {
  AUTH: '/auth',
  ITEMS: '/items',
  CONTRACTS: '/contracts',
  USERS: '/users',
  ANALYTICS: '/analytics',
  CATEGORIES: '/categories',
  UPLOADS: '/uploads'
}

// Статусы пользователя
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
}

// Роли пользователя
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
}

// Статусы товаров
export const ITEM_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  RENTED: 'rented',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived'
}

// Статусы контрактов
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  SIGNED: 'signed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
  EXPIRED: 'expired'
}

// Типы платежей
export const PAYMENT_TYPE = {
  RENTAL: 'rental',
  DEPOSIT: 'deposit',
  PENALTY: 'penalty',
  REFUND: 'refund'
}

// Статусы платежей
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
}

// Категории товаров
export const ITEM_CATEGORIES = {
  ELECTRONICS: 'electronics',
  VEHICLES: 'vehicles',
  TOOLS: 'tools',
  SPORTS: 'sports',
  CLOTHING: 'clothing',
  HOME: 'home',
  BOOKS: 'books',
  MUSIC: 'music',
  OTHER: 'other'
}

// Типы уведомлений
export const NOTIFICATION_TYPE = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
}

// Типы событий в системе
export const EVENT_TYPE = {
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  ITEM_CREATED: 'item_created',
  ITEM_UPDATED: 'item_updated',
  CONTRACT_CREATED: 'contract_created',
  CONTRACT_SIGNED: 'contract_signed',
  CONTRACT_COMPLETED: 'contract_completed',
  PAYMENT_MADE: 'payment_made',
  DISPUTE_CREATED: 'dispute_created'
}

// Единицы времени
export const TIME_UNITS = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month'
}

// Валюты
export const CURRENCIES = {
  ETH: 'ETH',
  USD: 'USD',
  EUR: 'EUR',
  RUB: 'RUB'
}

// Сети блокчейн
export const NETWORKS = {
  MAINNET: {
    id: 1,
    name: 'Ethereum Mainnet',
    rpc: 'https://mainnet.infura.io/v3/',
    explorer: 'https://etherscan.io'
  },
  SEPOLIA: {
    id: 11155111,
    name: 'Sepolia Testnet',
    rpc: 'https://sepolia.infura.io/v3/',
    explorer: 'https://sepolia.etherscan.io'
  },
  POLYGON: {
    id: 137,
    name: 'Polygon Mainnet',
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com'
  }
}

// Размеры файлов
export const FILE_SIZES = {
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DOCUMENT_SIZE: 50 * 1024 * 1024 // 50MB
}

// Типы файлов
export const FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ARCHIVES: ['application/zip', 'application/x-rar-compressed']
}

// Регулярные выражения
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
}

// Тайм-ауты
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 секунд
  FILE_UPLOAD: 120000, // 2 минуты
  BLOCKCHAIN_TX: 300000, // 5 минут
  NOTIFICATION: 5000 // 5 секунд
}

// Лимиты
export const LIMITS = {
  ITEMS_PER_PAGE: 12,
  MESSAGES_PER_PAGE: 50,
  MAX_IMAGES_PER_ITEM: 10,
  MAX_CONTRACT_DURATION: 365, // дней
  MIN_RENTAL_DURATION: 1, // день
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_TITLE_LENGTH: 100
}

// Настройки по умолчанию
export const DEFAULTS = {
  THEME: 'light',
  LANGUAGE: 'ru',
  CURRENCY: 'ETH',
  NETWORK: NETWORKS.SEPOLIA,
  ITEMS_VIEW: 'grid',
  NOTIFICATIONS_ENABLED: true
}

// Ключи для localStorage
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  WALLET_ADDRESS: 'wallet_address',
  VIEWED_ITEMS: 'viewed_items',
  SEARCH_HISTORY: 'search_history'
}

// Периоды для аналитики
export const ANALYTICS_PERIODS = {
  LAST_24H: '24h',
  LAST_7D: '7d',
  LAST_30D: '30d',
  LAST_90D: '90d',
  LAST_YEAR: '1y',
  ALL_TIME: 'all'
}

// Метрики для аналитики
export const ANALYTICS_METRICS = {
  USERS: 'users',
  ITEMS: 'items',
  CONTRACTS: 'contracts',
  REVENUE: 'revenue',
  CONVERSION: 'conversion',
  RETENTION: 'retention'
}

// Социальные сети
export const SOCIAL_LINKS = {
  TELEGRAM: 'https://t.me/rentchain',
  TWITTER: 'https://twitter.com/rentchain',
  DISCORD: 'https://discord.gg/rentchain',
  GITHUB: 'https://github.com/rentchain'
}

// Контактная информация
export const CONTACT_INFO = {
  EMAIL: 'support@rentchain.com',
  PHONE: '+7 (999) 123-45-67',
  ADDRESS: 'Астана, Казахстан'
}

// URL'ы документации
export const DOCS_URLS = {
  USER_GUIDE: '/docs/user-guide',
  API_DOCS: '/docs/api',
  SMART_CONTRACTS: '/docs/contracts',
  TERMS_OF_SERVICE: '/terms',
  PRIVACY_POLICY: '/privacy',
  FAQ: '/faq'
}

// Сообщения об ошибках
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ошибка подключения к сети',
  SERVER_ERROR: 'Ошибка сервера',
  UNAUTHORIZED: 'Необходима авторизация',
  FORBIDDEN: 'Недостаточно прав',
  NOT_FOUND: 'Ресурс не найден',
  VALIDATION_ERROR: 'Ошибка валидации данных',
  FILE_TOO_LARGE: 'Файл слишком большой',
  UNSUPPORTED_FILE_TYPE: 'Неподдерживаемый тип файла'
}

// Сообщения об успехе
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Профиль успешно обновлен',
  ITEM_CREATED: 'Товар успешно создан',
  CONTRACT_SIGNED: 'Контракт успешно подписан',
  PAYMENT_COMPLETED: 'Платеж успешно завершен',
  EMAIL_SENT: 'Письмо отправлено',
  FILE_UPLOADED: 'Файл успешно загружен'
}

// Цвета для статусов
export const STATUS_COLORS = {
  [CONTRACT_STATUS.ACTIVE]: '#10b981', // green
  [CONTRACT_STATUS.PENDING]: '#f59e0b', // yellow
  [CONTRACT_STATUS.COMPLETED]: '#3b82f6', // blue
  [CONTRACT_STATUS.CANCELLED]: '#ef4444', // red
  [CONTRACT_STATUS.DISPUTED]: '#8b5cf6', // purple
  [PAYMENT_STATUS.COMPLETED]: '#10b981',
  [PAYMENT_STATUS.PENDING]: '#f59e0b',
  [PAYMENT_STATUS.FAILED]: '#ef4444'
}

export default {
  API_ENDPOINTS,
  USER_STATUS,
  USER_ROLES,
  ITEM_STATUS,
  CONTRACT_STATUS,
  PAYMENT_TYPE,
  PAYMENT_STATUS,
  ITEM_CATEGORIES,
  NOTIFICATION_TYPE,
  EVENT_TYPE,
  TIME_UNITS,
  CURRENCIES,
  NETWORKS,
  FILE_SIZES,
  FILE_TYPES,
  REGEX,
  TIMEOUTS,
  LIMITS,
  DEFAULTS,
  STORAGE_KEYS,
  ANALYTICS_PERIODS,
  ANALYTICS_METRICS,
  SOCIAL_LINKS,
  CONTACT_INFO,
  DOCS_URLS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STATUS_COLORS
}