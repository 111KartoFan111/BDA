// frontend/src/components/Forms/ContractForm/ContractForm.jsx - УНИВЕРСАЛЬНАЯ ВЕРСИЯ
import React, { useState, useEffect } from 'react'
import { Search, Calendar, DollarSign, Clock, FileText, User, Mail, CheckCircle, Package, Filter } from 'lucide-react'
import { itemsAPI } from '../../../services/api/items'
import { usersAPI } from '../../../services/api/users'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../UI/Button/Button'
import Input from '../../UI/Input/Input'
import Card from '../../UI/Card/Card'
import Loader from '../../UI/Loader/Loader'
import Modal from '../../UI/Modal/Modal'
import ItemCard from '../../Features/ItemCard/ItemCard'
import { validateEmail, validateDate, validatePrice } from '../../../services/utils/validation'
import { formatCurrency, formatDate } from '../../../services/utils/formatting'
import toast from 'react-hot-toast'
import styles from './ContractForm.module.css'

const ContractForm = ({ 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  prefilledData = {},
  mode = 'auto' // 'auto', 'owner', 'tenant'
}) => {
  const { user } = useAuth()
  
  // Определяем режим работы формы
  const [contractMode, setContractMode] = useState(mode)
  const [isOwner, setIsOwner] = useState(false)
  const [isTenant, setIsTenant] = useState(false)
  
  // Состояние формы
  const [formData, setFormData] = useState({
    itemId: prefilledData.itemId || '',
    itemInfo: prefilledData.itemInfo || null,
    ownerEmail: prefilledData.ownerEmail || '',
    ownerId: prefilledData.ownerId || '',
    ownerInfo: prefilledData.ownerInfo || null,
    tenantEmail: prefilledData.tenantEmail || user?.email || '',
    tenantId: prefilledData.tenantId || user?.id || '',
    tenantInfo: prefilledData.tenantInfo || user || null,
    startDate: prefilledData.startDate || '',
    endDate: prefilledData.endDate || '',
    totalPrice: prefilledData.totalPrice || '',
    deposit: prefilledData.deposit || '',
    terms: prefilledData.terms || '',
    specialConditions: prefilledData.specialConditions || '',
    message: prefilledData.message || '',
    totalDays: 0
  })
  
  // Состояние валидации и UI
  const [errors, setErrors] = useState({})
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false)
  const [isSearchingUser, setIsSearchingUser] = useState(false)
  const [userSearchResults, setUserSearchResults] = useState([])
  const [showUserSuggestions, setShowUserSuggestions] = useState(false)
  
  // Данные для товаров
  const [availableItems, setAvailableItems] = useState([])
  const [myItems, setMyItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsFilter, setItemsFilter] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    location: ''
  })
  const [categories, setCategories] = useState([])

  // Определение режима при монтировании
  useEffect(() => {
    if (mode === 'auto') {
      // Автоматически определяем режим
      if (prefilledData.itemId && prefilledData.itemInfo?.owner?.id === user?.id) {
        setContractMode('owner')
        setIsOwner(true)
      } else {
        setContractMode('tenant')
        setIsTenant(true)
      }
    } else {
      setContractMode(mode)
      setIsOwner(mode === 'owner')
      setIsTenant(mode === 'tenant')
    }
  }, [mode, prefilledData, user])

  // Загрузка данных при монтировании
  useEffect(() => {
    if (isOwner) {
      loadMyItems()
    } else {
      loadAvailableItems()
      loadCategories()
    }
  }, [isOwner])

  // Пересчет общей стоимости при изменении дат или товара
  useEffect(() => {
    calculateTotalPrice()
  }, [formData.startDate, formData.endDate, formData.itemInfo])

  // Автоматическое заполнение залога при выборе товара
  useEffect(() => {
    if (formData.itemInfo && !formData.deposit) {
      setFormData(prev => ({
        ...prev,
        deposit: formData.itemInfo.deposit || (formData.itemInfo.pricePerDay * 2)
      }))
    }
  }, [formData.itemInfo])

  // Поиск пользователя с задержкой
  useEffect(() => {
    const email = isOwner ? formData.tenantEmail : formData.ownerEmail
    const userInfo = isOwner ? formData.tenantInfo : formData.ownerInfo
    
    const timeoutId = setTimeout(() => {
      if (email && email.length > 2 && !userInfo) {
        searchUsers(email)
      } else {
        setUserSearchResults([])
        setShowUserSuggestions(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.tenantEmail, formData.ownerEmail, isOwner])

  const loadMyItems = async () => {
    try {
      setLoadingItems(true)
      const response = await itemsAPI.getMyItems()
      
      let itemsArray = []
      if (response.data) {
        if (Array.isArray(response.data)) {
          itemsArray = response.data
        } else if (response.data.items && Array.isArray(response.data.items)) {
          itemsArray = response.data.items
        } else if (response.data.data && Array.isArray(response.data.data)) {
          itemsArray = response.data.data
        }
      }
      
      console.log('Loaded my items:', itemsArray)
      setMyItems(itemsArray)
      
    } catch (error) {
      console.error('Error loading my items:', error)
      setMyItems([])
      toast.error('Ошибка загрузки товаров')
    } finally {
      setLoadingItems(false)
    }
  }

  const loadAvailableItems = async () => {
    try {
      setLoadingItems(true)
      const params = {
        available: true,
        exclude_owner: user?.id, // Исключаем свои товары
        ...Object.fromEntries(
          Object.entries(itemsFilter).filter(([_, value]) => value !== '')
        )
      }
      
      const response = await itemsAPI.getItems(params)
      
      let itemsArray = []
      if (response.data) {
        if (Array.isArray(response.data)) {
          itemsArray = response.data
        } else if (response.data.items && Array.isArray(response.data.items)) {
          itemsArray = response.data.items
        } else if (response.data.data && Array.isArray(response.data.data)) {
          itemsArray = response.data.data
        }
      }
      
      console.log('Loaded available items:', itemsArray)
      setAvailableItems(itemsArray)
      
    } catch (error) {
      console.error('Error loading available items:', error)
      setAvailableItems([])
      toast.error('Ошибка загрузки товаров')
    } finally {
      setLoadingItems(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await itemsAPI.getCategories()
      let categoriesData = []
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          categoriesData = response.data
        } else if (response.data.data && Array.isArray(response.data.data)) {
          categoriesData = response.data.data
        }
      }
      
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    }
  }

  const searchUsers = async (query) => {
    if (query.length < 3) return
    
    try {
      setIsSearchingUser(true)
      const response = await usersAPI.searchUsers(query, { 
        type: 'email',
        limit: 5 
      })
      
      let users = []
      if (response.data) {
        if (Array.isArray(response.data)) {
          users = response.data
        } else if (response.data.data && Array.isArray(response.data.data)) {
          users = response.data.data
        } else if (response.data.users && Array.isArray(response.data.users)) {
          users = response.data.users
        }
      }
      
      // Исключаем текущего пользователя
      const filteredUsers = users.filter(u => u.id !== user?.id)
      
      setUserSearchResults(filteredUsers)
      setShowUserSuggestions(filteredUsers.length > 0)
      
    } catch (error) {
      console.error('Error searching users:', error)
      setUserSearchResults([])
      setShowUserSuggestions(false)
    } finally {
      setIsSearchingUser(false)
    }
  }

  const calculateTotalPrice = () => {
    if (formData.startDate && formData.endDate && formData.itemInfo?.pricePerDay) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      const timeDiff = end.getTime() - start.getTime()
      const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
      
      if (days > 0) {
        const totalPrice = days * parseFloat(formData.itemInfo.pricePerDay)
        setFormData(prev => ({
          ...prev,
          totalDays: days,
          totalPrice: totalPrice.toFixed(4)
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          totalDays: 0,
          totalPrice: ''
        }))
      }
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }

    // Специальная обработка для email
    if (field === 'tenantEmail' || field === 'ownerEmail') {
      const infoField = field === 'tenantEmail' ? 'tenantInfo' : 'ownerInfo'
      const idField = field === 'tenantEmail' ? 'tenantId' : 'ownerId'
      
      setFormData(prev => ({
        ...prev,
        [infoField]: null,
        [idField]: ''
      }))
    }
  }

  const handleItemSelect = (item) => {
    setFormData(prev => ({
      ...prev,
      itemId: item.id,
      itemInfo: item,
      // Если выбираем товар другого пользователя, заполняем информацию о владельце
      ownerEmail: item.owner?.email || '',
      ownerId: item.owner?.id || '',
      ownerInfo: item.owner || null
    }))
    setIsItemSearchOpen(false)
  }

  const handleUserSelect = (selectedUser) => {
    if (isOwner) {
      // Владелец выбирает арендатора
      setFormData(prev => ({
        ...prev,
        tenantEmail: selectedUser.email,
        tenantId: selectedUser.id,
        tenantInfo: selectedUser
      }))
    } else {
      // Арендатор выбирает владельца (хотя это редкий случай)
      setFormData(prev => ({
        ...prev,
        ownerEmail: selectedUser.email,
        ownerId: selectedUser.id,
        ownerInfo: selectedUser
      }))
    }
    setShowUserSuggestions(false)
    setUserSearchResults([])
  }

  const handleFilterChange = (field, value) => {
    setItemsFilter(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const applyItemsFilter = () => {
    if (!isOwner) {
      loadAvailableItems()
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Валидация товара
    if (!formData.itemId || !formData.itemInfo) {
      newErrors.itemId = 'Выберите товар для аренды'
    }

    // Валидация участников
    if (isOwner) {
      // Владелец должен указать арендатора
      const emailError = validateEmail(formData.tenantEmail)
      if (emailError) {
        newErrors.tenantEmail = emailError
      }
      
      if (formData.tenantEmail === user?.email) {
        newErrors.tenantEmail = 'Нельзя отправить предложение самому себе'
      }
    } else {
      // Арендатор должен указать сообщение владельцу
      if (!formData.message.trim()) {
        newErrors.message = 'Добавьте сообщение владельцу товара'
      }
    }

    // Валидация дат
    const startDateError = validateDate(formData.startDate, 'Дата начала')
    if (startDateError) {
      newErrors.startDate = startDateError
    }

    const endDateError = validateDate(formData.endDate, 'Дата окончания')
    if (endDateError) {
      newErrors.endDate = endDateError
    }

    // Проверка периода дат
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      const now = new Date()
      
      if (start < now) {
        newErrors.startDate = 'Дата начала не может быть в прошлом'
      }
      
      if (end <= start) {
        newErrors.endDate = 'Дата окончания должна быть позже даты начала'
      }

      // Проверка минимального и максимального срока аренды
      if (formData.itemInfo) {
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
        
        if (formData.itemInfo.minRentalDays && days < formData.itemInfo.minRentalDays) {
          newErrors.endDate = `Минимальный срок аренды: ${formData.itemInfo.minRentalDays} дней`
        }
        
        if (formData.itemInfo.maxRentalDays && days > formData.itemInfo.maxRentalDays) {
          newErrors.endDate = `Максимальный срок аренды: ${formData.itemInfo.maxRentalDays} дней`
        }
      }
    }

    // Валидация цены
    const priceError = validatePrice(formData.totalPrice, 0.0001)
    if (priceError) {
      newErrors.totalPrice = priceError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (validateForm()) {
      // Подготавливаем данные для отправки
      const submitData = {
        itemId: formData.itemId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalPrice: formData.totalPrice,
        deposit: formData.deposit || 0,
        terms: formData.terms,
        specialConditions: formData.specialConditions,
        message: formData.message,
        // Данные участников зависят от режима
        ...(isOwner ? {
          tenantEmail: formData.tenantEmail,
          tenantId: formData.tenantId || undefined,
        } : {
          ownerEmail: formData.ownerEmail,
          ownerId: formData.ownerId || undefined,
        })
      }
      
      onSubmit(submitData)
    }
  }

  // Форматирование даты для input[type="datetime-local"]
  const formatDateForInput = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const itemsToShow = isOwner ? myItems : availableItems

  return (
    <div className={styles.contractForm}>
      {/* Индикатор режима */}
      <Card className={styles.modeIndicator}>
        <div className={styles.modeInfo}>
          <div className={styles.modeIcon}>
            {isOwner ? <Package size={20} /> : <User size={20} />}
          </div>
          <div className={styles.modeText}>
            <h4>{isOwner ? 'Режим арендодателя' : 'Режим арендатора'}</h4>
            <p>
              {isOwner 
                ? 'Вы предлагаете свой товар в аренду' 
                : 'Вы запрашиваете товар в аренду'
              }
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Выбор товара */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <FileText size={20} />
              {isOwner ? 'Ваш товар для аренды' : 'Выберите товар для аренды'}
            </h3>
          </div>
          
          <div className={styles.sectionContent}>
            {formData.itemInfo ? (
              <div className={styles.selectedItem}>
                <div className={styles.itemPreview}>
                  {formData.itemInfo.images?.[0] ? (
                    <img 
                      src={formData.itemInfo.images[0]} 
                      alt={formData.itemInfo.title}
                      className={styles.itemImage}
                    />
                  ) : (
                    <div className={styles.itemImagePlaceholder}>
                      <FileText size={24} />
                    </div>
                  )}
                  
                  <div className={styles.itemDetails}>
                    <h4 className={styles.itemTitle}>{formData.itemInfo.title}</h4>
                    <p className={styles.itemPrice}>
                      {formatCurrency(formData.itemInfo.pricePerDay)} / день
                    </p>
                    <p className={styles.itemDescription}>
                      {formData.itemInfo.description?.substring(0, 100)}
                      {formData.itemInfo.description?.length > 100 ? '...' : ''}
                    </p>
                    {!isOwner && formData.itemInfo.owner && (
                      <p className={styles.itemOwner}>
                        Владелец: {formData.itemInfo.owner.firstName} {formData.itemInfo.owner.lastName}
                      </p>
                    )}
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => setIsItemSearchOpen(true)}
                >
                  Изменить товар
                </Button>
              </div>
            ) : (
              <div className={styles.itemSelector}>
                <p className={styles.selectorText}>
                  {isOwner 
                    ? 'Выберите товар из ваших объявлений'
                    : 'Выберите товар для аренды из каталога'
                  }
                </p>
                
                {/* Фильтры для арендатора */}
                {!isOwner && (
                  <div className={styles.itemsFilter}>
                    <div className={styles.filterRow}>
                      <Input
                        placeholder="Поиск товаров..."
                        value={itemsFilter.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        icon={<Search size={16} />}
                        size="small"
                      />
                      
                      <select
                        value={itemsFilter.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className={styles.filterSelect}
                      >
                        <option value="">Все категории</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="small"
                        onClick={applyItemsFilter}
                        icon={<Filter size={16} />}
                      >
                        Применить
                      </Button>
                    </div>
                  </div>
                )}
                
                {loadingItems ? (
                  <div className={styles.loadingItems}>
                    <Loader size="medium" text="Загрузка товаров..." />
                  </div>
                ) : itemsToShow.length > 0 ? (
                  <>
                    <div className={styles.itemsGrid}>
                      {itemsToShow.slice(0, isOwner ? 6 : 8).map(item => (
                        <div
                          key={item.id}
                          className={styles.selectableItem}
                          onClick={() => handleItemSelect(item)}
                        >
                          <ItemCard item={item} />
                        </div>
                      ))}
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsItemSearchOpen(true)}
                      icon={<Search size={16} />}
                      fullWidth
                    >
                      {isOwner ? 'Посмотреть все мои товары' : 'Посмотреть больше товаров'}
                    </Button>
                  </>
                ) : (
                  <div className={styles.noItems}>
                    <FileText size={48} />
                    <p>
                      {isOwner 
                        ? 'У вас пока нет товаров для аренды'
                        : 'Не найдено подходящих товаров'
                      }
                    </p>
                    {isOwner && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open('/items/create', '_blank')}
                      >
                        Добавить товар
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {errors.itemId && (
              <div className={styles.error}>{errors.itemId}</div>
            )}
          </div>
        </Card>

        {/* Информация об участнике */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <User size={20} />
              {isOwner ? 'Арендатор' : 'Сообщение владельцу'}
            </h3>
          </div>
          
          <div className={styles.sectionContent}>
            {isOwner ? (
              // Режим владельца - выбор арендатора
              <div className={styles.userSearchContainer}>
                <Input
                  label="Email арендатора"
                  type="email"
                  value={formData.tenantEmail}
                  onChange={(e) => handleInputChange('tenantEmail', e.target.value)}
                  placeholder="email@example.com"
                  error={errors.tenantEmail}
                  icon={<Mail size={18} />}
                  required
                  fullWidth
                />
                
                {isSearchingUser && (
                  <div className={styles.searchingIndicator}>
                    <Loader size="small" text="Поиск пользователя..." />
                  </div>
                )}
                
                {/* Предложения пользователей */}
                {showUserSuggestions && userSearchResults.length > 0 && (
                  <div className={styles.userSuggestions}>
                    <div className={styles.suggestionsHeader}>
                      Найденные пользователи:
                    </div>
                    {userSearchResults.map(selectedUser => (
                      <div
                        key={selectedUser.id}
                        className={styles.userSuggestion}
                        onClick={() => handleUserSelect(selectedUser)}
                      >
                        <div className={styles.userAvatar}>
                          {selectedUser.avatar ? (
                            <img src={selectedUser.avatar} alt={selectedUser.firstName} />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <div className={styles.userInfo}>
                          <div className={styles.userName}>
                            {selectedUser.firstName} {selectedUser.lastName}
                          </div>
                          <div className={styles.userEmail}>{selectedUser.email}</div>
                        </div>
                        {selectedUser.isVerified && (
                          <CheckCircle size={16} className={styles.verifiedIcon} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Выбранный арендатор */}
                {formData.tenantInfo && (
                  <div className={styles.selectedUser}>
                    <div className={styles.userCard}>
                      <div className={styles.userAvatar}>
                        {formData.tenantInfo.avatar ? (
                          <img src={formData.tenantInfo.avatar} alt={formData.tenantInfo.firstName} />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className={styles.userDetails}>
                        <div className={styles.userName}>
                          {formData.tenantInfo.firstName} {formData.tenantInfo.lastName}
                        </div>
                        <div className={styles.userEmail}>{formData.tenantInfo.email}</div>
                        {formData.tenantInfo.rating && (
                          <div className={styles.userRating}>
                            ⭐ {formData.tenantInfo.rating}/5
                          </div>
                        )}
                      </div>
                      {formData.tenantInfo.isVerified && (
                        <div className={styles.verifiedBadge}>
                          <CheckCircle size={16} />
                          Верифицирован
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Режим арендатора - сообщение владельцу
              <div className={styles.messageContainer}>
                <div className={styles.textAreaGroup}>
                  <label className={styles.textAreaLabel}>
                    Сообщение владельцу товара *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Напишите сообщение владельцу товара: зачем вам этот товар, ваш опыт использования подобных вещей, гарантии бережного обращения..."
                    rows={4}
                    className={styles.textArea}
                    maxLength={500}
                    required
                  />
                  {errors.message && (
                    <div className={styles.error}>{errors.message}</div>
                  )}
                  <div className={styles.charCount}>
                    {formData.message.length}/500 символов
                  </div>
                </div>
                
                {formData.ownerInfo && (
                  <div className={styles.ownerInfo}>
                    <h4>Владелец товара:</h4>
                    <div className={styles.ownerCard}>
                      <div className={styles.userAvatar}>
                        {formData.ownerInfo.avatar ? (
                          <img src={formData.ownerInfo.avatar} alt={formData.ownerInfo.firstName} />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className={styles.userDetails}>
                        <div className={styles.userName}>
                          {formData.ownerInfo.firstName} {formData.ownerInfo.lastName}
                        </div>
                        {formData.ownerInfo.rating && (
                          <div className={styles.userRating}>
                            ⭐ {formData.ownerInfo.rating}/5 ({formData.ownerInfo.reviewsCount || 0} отзывов)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Период аренды */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Calendar size={20} />
              Период аренды
            </h3>
          </div>
          
          <div className={styles.sectionContent}>
            <div className={styles.dateRow}>
              <Input
                label="Дата и время начала"
                type="datetime-local"
                value={formatDateForInput(formData.startDate)}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                error={errors.startDate}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
              
              <Input
                label="Дата и время окончания"
                type="datetime-local"
                value={formatDateForInput(formData.endDate)}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                error={errors.endDate}
                min={formData.startDate || new Date().toISOString().slice(0, 16)}
                required
              />
            </div>
            
            {formData.totalDays > 0 && (
              <div className={styles.durationInfo}>
                <Clock size={16} />
                <span>Продолжительность: {formData.totalDays} дней</span>
                {formData.itemInfo?.minRentalDays && formData.totalDays < formData.itemInfo.minRentalDays && (
                  <span className={styles.durationWarning}>
                    (Минимум: {formData.itemInfo.minRentalDays} дней)
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Стоимость */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <DollarSign size={20} />
              Стоимость
            </h3>
          </div>
          
          <div className={styles.sectionContent}>
            <div className={styles.priceRow}>
              <Input
                label="Общая стоимость (ETH)"
                type="number"
                step="0.0001"
                min="0"
                value={formData.totalPrice}
                onChange={(e) => handleInputChange('totalPrice', e.target.value)}
                error={errors.totalPrice}
                required
                helperText={!isOwner ? "Владелец может изменить цену" : undefined}
              />
              
              <Input
                label="Залог (ETH)"
                type="number"
                step="0.0001"
                min="0"
                value={formData.deposit}
                onChange={(e) => handleInputChange('deposit', e.target.value)}
                error={errors.deposit}
                helperText="Опционально"
              />
            </div>
            
            {formData.itemInfo && formData.totalDays > 0 && (
              <div className={styles.priceBreakdown}>
                <div className={styles.priceRow}>
                  <span>Цена за день:</span>
                  <span>{formatCurrency(formData.itemInfo.pricePerDay)}</span>
                </div>
                <div className={styles.priceRow}>
                  <span>Количество дней:</span>
                  <span>{formData.totalDays}</span>
                </div>
                <div className={`${styles.priceRow} ${styles.priceTotal}`}>
                  <span>Итого:</span>
                  <span>{formatCurrency(formData.totalPrice)}</span>
                </div>
                {formData.deposit > 0 && (
                  <div className={styles.priceRow}>
                    <span>Залог:</span>
                    <span>{formatCurrency(formData.deposit)}</span>
                  </div>
                )}
                <div className={styles.totalCost}>
                  <span>К оплате:</span>
                  <span>{formatCurrency(parseFloat(formData.totalPrice || 0) + parseFloat(formData.deposit || 0))}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Условия аренды */}
        {isOwner && (
          <Card className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Условия аренды</h3>
            </div>
            
            <div className={styles.sectionContent}>
              <div className={styles.textAreaGroup}>
                <label className={styles.textAreaLabel}>
                  Основные условия
                </label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => handleInputChange('terms', e.target.value)}
                  placeholder="Опишите основные условия аренды: что включено, правила использования, ответственность сторон..."
                  rows={4}
                  className={styles.textArea}
                  maxLength={1000}
                />
                {errors.terms && (
                  <div className={styles.error}>{errors.terms}</div>
                )}
                <div className={styles.charCount}>
                  {formData.terms.length}/1000 символов
                </div>
              </div>
              
              <div className={styles.textAreaGroup}>
                <label className={styles.textAreaLabel}>
                  Особые условия
                </label>
                <textarea
                  value={formData.specialConditions}
                  onChange={(e) => handleInputChange('specialConditions', e.target.value)}
                  placeholder="Укажите особые условия, ограничения, дополнительные требования..."
                  rows={3}
                  className={styles.textArea}
                  maxLength={1000}
                />
                {errors.specialConditions && (
                  <div className={styles.error}>{errors.specialConditions}</div>
                )}
                <div className={styles.charCount}>
                  {formData.specialConditions.length}/1000 символов
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Итоговая информация */}
        <Card className={styles.summaryCard}>
          <h3 className={styles.sectionTitle}>Итоговая информация</h3>
          <div className={styles.summaryContent}>
            {formData.itemInfo && (
              <div className={styles.summaryItem}>
                <span>Товар:</span>
                <span>{formData.itemInfo.title}</span>
              </div>
            )}
            {isOwner && formData.tenantInfo && (
              <div className={styles.summaryItem}>
                <span>Арендатор:</span>
                <span>{formData.tenantInfo.firstName} {formData.tenantInfo.lastName}</span>
              </div>
            )}
            {!isOwner && formData.ownerInfo && (
              <div className={styles.summaryItem}>
                <span>Владелец:</span>
                <span>{formData.ownerInfo.firstName} {formData.ownerInfo.lastName}</span>
              </div>
            )}
            {formData.startDate && formData.endDate && (
              <div className={styles.summaryItem}>
                <span>Период:</span>
                <span>
                  {formatDate(formData.startDate)} - {formatDate(formData.endDate)}
                  {formData.totalDays > 0 && ` (${formData.totalDays} дней)`}
                </span>
              </div>
            )}
            {formData.totalPrice && (
              <div className={styles.summaryItem}>
                <span>Стоимость аренды:</span>
                <span>{formatCurrency(formData.totalPrice)}</span>
              </div>
            )}
            {formData.deposit > 0 && (
              <div className={styles.summaryItem}>
                <span>Залог:</span>
                <span>{formatCurrency(formData.deposit)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Кнопки действий */}
        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Отмена
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={!formData.itemId || 
                     (isOwner && !formData.tenantEmail) || 
                     (!isOwner && !formData.message.trim()) || 
                     isLoading}
          >
            {isOwner ? 'Отправить предложение' : 'Отправить запрос'}
          </Button>
        </div>
      </form>

      {/* Модальное окно поиска товаров */}
      <Modal
        isOpen={isItemSearchOpen}
        onClose={() => setIsItemSearchOpen(false)}
        title={isOwner ? "Выберите ваш товар" : "Выберите товар для аренды"}
        size="large"
      >
        <div className={styles.itemSearchModal}>
          {!isOwner && (
            <div className={styles.modalFilters}>
              <div className={styles.filterRow}>
                <Input
                  placeholder="Поиск товаров..."
                  value={itemsFilter.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  icon={<Search size={16} />}
                  size="small"
                />
                
                <select
                  value={itemsFilter.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">Все категории</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  onClick={applyItemsFilter}
                  icon={<Filter size={16} />}
                >
                  Найти
                </Button>
              </div>
            </div>
          )}

          <div className={styles.modalItemsGrid}>
            {loadingItems ? (
              <div className={styles.modalLoading}>
                <Loader size="large" text="Загрузка товаров..." />
              </div>
            ) : itemsToShow.length > 0 ? (
              itemsToShow.map(item => (
                <div
                  key={item.id}
                  className={styles.modalSelectableItem}
                  onClick={() => handleItemSelect(item)}
                >
                  <ItemCard item={item} />
                  <div className={styles.selectOverlay}>
                    <Button size="small" variant="primary">
                      Выбрать
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noModalItems}>
                <FileText size={48} />
                <h3>Товары не найдены</h3>
                <p>
                  {isOwner 
                    ? 'У вас нет активных товаров для аренды'
                    : 'Попробуйте изменить параметры поиска'
                  }
                </p>
              </div>
            )}
          </div>

          <div className={styles.modalActions}>
            <Button
              variant="outline"
              onClick={() => setIsItemSearchOpen(false)}
            >
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ContractForm