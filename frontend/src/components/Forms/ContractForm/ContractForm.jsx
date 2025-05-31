// frontend/src/components/Forms/ContractForm/ContractForm.jsx
import React, { useState, useEffect } from 'react'
import { Calendar, DollarSign, FileText, User, Clock, MapPin } from 'lucide-react'
import { itemsAPI } from '../../../services/api/items'
import { usersAPI } from '../../../services/api/users'
import Button from '../../UI/Button/Button'
import Input from '../../UI/Input/Input'
import Card from '../../UI/Card/Card'
import Modal from '../../UI/Modal/Modal'
import toast from 'react-hot-toast'
import { 
  validateText, 
  validateDate, 
  validateDateRange,
  validateForm as validateFormData
} from '../../../services/utils/validation'
import { formatCurrency } from '../../../services/utils/formatting'
import styles from './ContractForm.module.css'

const ContractForm = ({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  prefilledData = {} // Для предзаполнения данных (например, из товара)
}) => {
  const [formData, setFormData] = useState({
    itemId: '',
    tenantEmail: '',
    startDate: '',
    endDate: '',
    message: '',
    specialTerms: '',
    ...prefilledData
  })

  const [errors, setErrors] = useState({})
  const [items, setItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [calculatedData, setCalculatedData] = useState({
    totalDays: 0,
    totalPrice: 0,
    pricePerDay: 0
  })
  const [showTenantSearch, setShowTenantSearch] = useState(false)
  const [tenantSearchResults, setTenantSearchResults] = useState([])
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [searchingTenant, setSearchingTenant] = useState(false)

  // Загружаем товары пользователя при монтировании
  useEffect(() => {
    loadUserItems()
  }, [])

  // Пересчитываем стоимость при изменении дат или товара
  useEffect(() => {
    if (formData.startDate && formData.endDate && selectedItem) {
      calculateRentalCost()
    }
  }, [formData.startDate, formData.endDate, selectedItem])

  // Загружаем информацию о товаре при его выборе
  useEffect(() => {
    if (formData.itemId) {
      loadItemDetails(formData.itemId)
    }
  }, [formData.itemId])

  const loadUserItems = async () => {
    try {
      const response = await itemsAPI.getMyItems({ status: 'active' })
      const itemsData = response.data.data || response.data || []
      setItems(itemsData)
      
      // Если есть предзаполненный itemId, устанавливаем его
      if (prefilledData.itemId) {
        const item = itemsData.find(item => item.id === prefilledData.itemId)
        if (item) {
          setSelectedItem(item)
        }
      }
    } catch (error) {
      console.error('Error loading user items:', error)
      toast.error('Ошибка загрузки товаров')
    }
  }

  const loadItemDetails = async (itemId) => {
    try {
      const response = await itemsAPI.getItem(itemId)
      const item = response.data.data || response.data
      setSelectedItem(item)
    } catch (error) {
      console.error('Error loading item details:', error)
    }
  }

  const calculateRentalCost = () => {
    if (!formData.startDate || !formData.endDate || !selectedItem) return

    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)
    const diffTime = Math.abs(endDate - startDate)
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const pricePerDay = selectedItem.price_per_day || selectedItem.pricePerDay || 0
    const totalPrice = totalDays * pricePerDay

    setCalculatedData({
      totalDays,
      totalPrice,
      pricePerDay
    })
  }

  const searchTenant = async (email) => {
    if (!email.trim()) {
      setTenantSearchResults([])
      return
    }

    setSearchingTenant(true)
    try {
      const response = await usersAPI.searchUsers(email, { limit: 5 })
      const users = response.data.data || response.data || []
      setTenantSearchResults(users)
    } catch (error) {
      console.error('Error searching users:', error)
      setTenantSearchResults([])
    } finally {
      setSearchingTenant(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Очищаем ошибку для этого поля
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }

    // Поиск арендатора при вводе email
    if (name === 'tenantEmail') {
      if (value.length > 2) {
        const timeoutId = setTimeout(() => searchTenant(value), 300)
        return () => clearTimeout(timeoutId)
      } else {
        setTenantSearchResults([])
        setSelectedTenant(null)
      }
    }
  }

  const handleTenantSelect = (user) => {
    setSelectedTenant(user)
    setFormData(prev => ({
      ...prev,
      tenantEmail: user.email
    }))
    setTenantSearchResults([])
    setShowTenantSearch(false)
  }

  const validateFormFields = () => {
    const validationRules = {
      itemId: [
        (value) => !value ? 'Выберите товар для аренды' : null
      ],
      tenantEmail: [
        (value) => {
          if (!value) return 'Email арендатора обязателен'
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(value)) return 'Некорректный формат email'
          return null
        }
      ],
      startDate: [
        (value) => validateDate(value, 'Дата начала аренды')
      ],
      endDate: [
        (value) => validateDate(value, 'Дата окончания аренды')
      ],
      message: [
        (value) => validateText(value, 10, 500, 'Сообщение арендатору')
      ]
    }
    
    // Проверяем период дат
    if (formData.startDate && formData.endDate) {
      const dateRangeError = validateDateRange(formData.startDate, formData.endDate)
      if (dateRangeError) {
        setErrors(prev => ({ ...prev, endDate: dateRangeError }))
        return false
      }
    }

    // Проверяем минимальный период аренды
    if (selectedItem && calculatedData.totalDays > 0) {
      const minDays = selectedItem.min_rental_days || selectedItem.minRentalDays || 1
      const maxDays = selectedItem.max_rental_days || selectedItem.maxRentalDays || 365
      
      if (calculatedData.totalDays < minDays) {
        setErrors(prev => ({ ...prev, endDate: `Минимальный период аренды: ${minDays} дней` }))
        return false
      }
      
      if (calculatedData.totalDays > maxDays) {
        setErrors(prev => ({ ...prev, endDate: `Максимальный период аренды: ${maxDays} дней` }))
        return false
      }
    }
    
    const { isValid, errors: validationErrors } = validateFormData(formData, validationRules)
    setErrors(validationErrors)
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateFormFields()) {
      toast.error('Пожалуйста, исправьте ошибки в форме')
      return
    }
    
    const submitData = {
      itemId: formData.itemId,
      tenantEmail: formData.tenantEmail.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      totalPrice: calculatedData.totalPrice,
      totalDays: calculatedData.totalDays,
      message: formData.message.trim(),
      specialTerms: formData.specialTerms?.trim() || null,
      // Добавляем информацию о товаре для контекста
      itemInfo: {
        title: selectedItem?.title,
        pricePerDay: calculatedData.pricePerDay
      }
    }
    
    console.log('Contract form submit data:', submitData)
    onSubmit?.(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className={styles.contractForm}>
      {/* Выбор товара */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FileText size={20} />
          Товар для аренды
        </h3>
        
        <div className={styles.itemSelection}>
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel}>
              Выберите товар <span className={styles.required}>*</span>
            </label>
            <select
              name="itemId"
              value={formData.itemId}
              onChange={handleInputChange}
              className={`${styles.select} ${errors.itemId ? styles.selectError : ''}`}
              required
            >
              <option value="">Выберите товар из ваших объявлений</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.title} - {formatCurrency(item.price_per_day || item.pricePerDay)}/день
                </option>
              ))}
            </select>
            {errors.itemId && (
              <span className={styles.errorText}>{errors.itemId}</span>
            )}
          </div>

          {selectedItem && (
            <div className={styles.selectedItemPreview}>
              <div className={styles.itemImage}>
                {selectedItem.images?.[0] ? (
                  <img src={selectedItem.images[0]} alt={selectedItem.title} />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <FileText size={24} />
                  </div>
                )}
              </div>
              <div className={styles.itemDetails}>
                <h4 className={styles.itemTitle}>{selectedItem.title}</h4>
                <p className={styles.itemPrice}>
                  {formatCurrency(selectedItem.price_per_day || selectedItem.pricePerDay)}/день
                </p>
                {selectedItem.location && (
                  <p className={styles.itemLocation}>
                    <MapPin size={14} />
                    {selectedItem.location}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Информация об арендаторе */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <User size={20} />
          Арендатор
        </h3>
        
        <div className={styles.tenantSection}>
          <Input
            label="Email арендатора"
            name="tenantEmail"
            type="email"
            value={formData.tenantEmail}
            onChange={handleInputChange}
            error={errors.tenantEmail}
            placeholder="email@example.com"
            required
            fullWidth
            helperText="Введите email пользователя, который будет арендовать товар"
          />

          {tenantSearchResults.length > 0 && (
            <div className={styles.searchResults}>
              <p className={styles.searchResultsTitle}>Найденные пользователи:</p>
              {tenantSearchResults.map(user => (
                <div 
                  key={user.id} 
                  className={styles.searchResultItem}
                  onClick={() => handleTenantSelect(user)}
                >
                  <div className={styles.userAvatar}>
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.first_name} />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div className={styles.userEmail}>{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTenant && (
            <div className={styles.selectedTenant}>
              <div className={styles.tenantCard}>
                <div className={styles.tenantAvatar}>
                  {selectedTenant.avatar ? (
                    <img src={selectedTenant.avatar} alt={selectedTenant.first_name} />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className={styles.tenantInfo}>
                  <div className={styles.tenantName}>
                    {selectedTenant.first_name} {selectedTenant.last_name}
                  </div>
                  <div className={styles.tenantEmail}>{selectedTenant.email}</div>
                  {selectedTenant.rating && (
                    <div className={styles.tenantRating}>
                      Рейтинг: {selectedTenant.rating}/5
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Период аренды */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Calendar size={20} />
          Период аренды
        </h3>
        
        <div className={styles.dateRange}>
          <Input
            label="Дата начала"
            name="startDate"
            type="datetime-local"
            value={formData.startDate}
            onChange={handleInputChange}
            error={errors.startDate}
            min={new Date().toISOString().slice(0, 16)}
            required
            fullWidth
          />
          
          <Input
            label="Дата окончания"
            name="endDate"
            type="datetime-local"
            value={formData.endDate}
            onChange={handleInputChange}
            error={errors.endDate}
            min={formData.startDate || new Date().toISOString().slice(0, 16)}
            required
            fullWidth
          />
        </div>

        {calculatedData.totalDays > 0 && (
          <div className={styles.rentalSummary}>
            <div className={styles.summaryItem}>
              <Clock size={16} />
              <span>Период: {calculatedData.totalDays} дней</span>
            </div>
            <div className={styles.summaryItem}>
              <DollarSign size={16} />
              <span>
                Общая стоимость: {formatCurrency(calculatedData.totalPrice)}
              </span>
            </div>
            <div className={styles.summaryBreakdown}>
              {formatCurrency(calculatedData.pricePerDay)}/день × {calculatedData.totalDays} дней
            </div>
          </div>
        )}
      </Card>

      {/* Сообщение и условия */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FileText size={20} />
          Дополнительная информация
        </h3>
        
        <div className={styles.textareaGroup}>
          <label className={styles.textareaLabel}>
            Сообщение арендатору <span className={styles.required}>*</span>
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder="Опишите условия аренды, место передачи товара, особые требования..."
            className={`${styles.textarea} ${errors.message ? styles.textareaError : ''}`}
            rows={4}
            required
          />
          {errors.message && (
            <span className={styles.errorText}>{errors.message}</span>
          )}
          <span className={styles.helperText}>
            Минимум 10 символов. Это сообщение увидит арендатор при получении предложения.
          </span>
        </div>

        <div className={styles.textareaGroup}>
          <label className={styles.textareaLabel}>
            Особые условия (необязательно)
          </label>
          <textarea
            name="specialTerms"
            value={formData.specialTerms}
            onChange={handleInputChange}
            placeholder="Дополнительные условия, ограничения, требования к арендатору..."
            className={styles.textarea}
            rows={3}
          />
          <span className={styles.helperText}>
            Укажите дополнительные условия, которые не указаны в описании товара
          </span>
        </div>
      </Card>

      {/* Действия */}
      <div className={styles.formActions}>
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
          disabled={isLoading || !selectedItem || calculatedData.totalDays === 0}
        >
          Отправить предложение аренды
        </Button>
      </div>
    </form>
  )
}

export default ContractForm