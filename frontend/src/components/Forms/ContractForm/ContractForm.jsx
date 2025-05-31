// frontend/src/components/Forms/ContractForm/ContractForm.jsx
import React, { useState, useEffect } from 'react'
import { Search, Calendar, DollarSign, Clock, FileText, User } from 'lucide-react'
import { itemsAPI } from '../../../services/api/items'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../UI/Button/Button'
import Input from '../../UI/Input/Input'
import Card from '../../UI/Card/Card'
import Loader from '../../UI/Loader/Loader'
import ItemSearchModal from '../../Features/ItemSearchModal/ItemSearchModal'
import { validateEmail, validateDate, validatePrice } from '../../../services/utils/validation'
import { formatCurrency, formatDate } from '../../../services/utils/formatting'
import styles from './ContractForm.module.css'

const ContractForm = ({ 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  prefilledData = {} 
}) => {
  const { user } = useAuth()
  
  // Состояние формы
  const [formData, setFormData] = useState({
    itemId: prefilledData.itemId || '',
    itemInfo: prefilledData.itemInfo || null,
    tenantEmail: prefilledData.tenantEmail || '',
    startDate: prefilledData.startDate || '',
    endDate: prefilledData.endDate || '',
    totalPrice: prefilledData.totalPrice || '',
    message: prefilledData.message || '',
    specialTerms: prefilledData.specialTerms || '',
    totalDays: 0
  })
  
  // Состояние валидации
  const [errors, setErrors] = useState({})
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false)
  
  // Данные для загрузки товаров
  const [myItems, setMyItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  // Загрузка моих товаров при монтировании
  useEffect(() => {
    loadMyItems()
  }, [])

  // Пересчет общей стоимости при изменении дат
  useEffect(() => {
    calculateTotalPrice()
  }, [formData.startDate, formData.endDate, formData.itemInfo])

  const loadMyItems = async () => {
    try {
      setLoadingItems(true)
      const response = await itemsAPI.getMyItems()
      
      // ИСПРАВЛЯЕМ: правильно извлекаем массив товаров
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
      setMyItems([]) // Устанавливаем пустой массив в случае ошибки
    } finally {
      setLoadingItems(false)
    }
  }

  const calculateTotalPrice = () => {
    if (formData.startDate && formData.endDate && formData.itemInfo?.pricePerDay) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      
      if (days > 0) {
        const totalPrice = days * parseFloat(formData.itemInfo.pricePerDay)
        setFormData(prev => ({
          ...prev,
          totalDays: days,
          totalPrice: totalPrice.toFixed(4)
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
  }

  const handleItemSelect = (item) => {
    setFormData(prev => ({
      ...prev,
      itemId: item.id,
      itemInfo: item
    }))
    setIsItemSearchOpen(false)
  }

  const validateForm = () => {
    const newErrors = {}

    // Валидация товара
    if (!formData.itemId || !formData.itemInfo) {
      newErrors.itemId = 'Выберите товар для аренды'
    }

    // Валидация email арендатора
    const emailError = validateEmail(formData.tenantEmail)
    if (emailError) {
      newErrors.tenantEmail = emailError
    }

    // Проверка, что не отправляем самому себе
    if (formData.tenantEmail === user?.email) {
      newErrors.tenantEmail = 'Нельзя отправить предложение самому себе'
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
    }

    // Валидация цены
    const priceError = validatePrice(formData.totalPrice, 0.0001)
    if (priceError) {
      newErrors.totalPrice = priceError
    }

    // Валидация сообщения (необязательно, но если есть - проверяем длину)
    if (formData.message && formData.message.length > 1000) {
      newErrors.message = 'Сообщение не должно превышать 1000 символов'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  return (
    <div className={styles.contractForm}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Выбор товара */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <FileText size={20} />
              Товар для аренды
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
                      {formData.itemInfo.description}
                    </p>
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
                  Выберите товар из ваших объявлений
                </p>
                
                {loadingItems ? (
                  <div className={styles.loadingItems}>
                    <Loader size="small" text="Загрузка товаров..." />
                  </div>
                ) : myItems.length > 0 ? (
                  <>
                    <div className={styles.itemsList}>
                      {myItems.slice(0, 3).map(item => (
                        <div
                          key={item.id}
                          className={styles.quickSelectItem}
                          onClick={() => handleItemSelect(item)}
                        >
                          {item.images?.[0] ? (
                            <img 
                              src={item.images[0]} 
                              alt={item.title}
                              className={styles.quickItemImage}
                            />
                          ) : (
                            <div className={styles.quickItemPlaceholder}>
                              <FileText size={20} />
                            </div>
                          )}
                          <div className={styles.quickItemInfo}>
                            <span className={styles.quickItemTitle}>{item.title}</span>
                            <span className={styles.quickItemPrice}>
                              {formatCurrency(item.pricePerDay)}/день
                            </span>
                          </div>
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
                      Посмотреть все товары
                    </Button>
                  </>
                ) : (
                  <div className={styles.noItems}>
                    <FileText size={48} />
                    <p>У вас пока нет товаров для аренды</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open('/items/create', '_blank')}
                    >
                      Добавить товар
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {errors.itemId && (
              <div className={styles.error}>{errors.itemId}</div>
            )}
          </div>
        </Card>

        {/* Информация об арендаторе */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <User size={20} />
              Арендатор
            </h3>
          </div>
          
          <div className={styles.sectionContent}>
            <Input
              label="Email арендатора"
              type="email"
              value={formData.tenantEmail}
              onChange={(e) => handleInputChange('tenantEmail', e.target.value)}
              placeholder="email@example.com"
              error={errors.tenantEmail}
              required
            />
            
            <div className={styles.tenantNote}>
              <p>
                Укажите email пользователя, которому хотите отправить предложение аренды.
                Пользователь должен быть зарегистрирован в системе.
              </p>
            </div>
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
                label="Дата начала"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                error={errors.startDate}
                required
              />
              
              <Input
                label="Дата окончания"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                error={errors.endDate}
                required
              />
            </div>
            
            {formData.totalDays > 0 && (
              <div className={styles.durationInfo}>
                <Clock size={16} />
                <span>Продолжительность: {formData.totalDays} дней</span>
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
            <Input
              label="Общая стоимость (ETH)"
              type="number"
              step="0.0001"
              value={formData.totalPrice}
              onChange={(e) => handleInputChange('totalPrice', e.target.value)}
              error={errors.totalPrice}
              required
            />
            
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
                <div className={styles.priceRow + ' ' + styles.priceTotal}>
                  <span>Итого:</span>
                  <span>{formatCurrency(formData.totalPrice)}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Дополнительная информация */}
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Дополнительная информация</h3>
          </div>
          
          <div className={styles.sectionContent}>
            <div className={styles.textAreaGroup}>
              <label className={styles.textAreaLabel}>
                Сообщение арендатору
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Добавьте любую дополнительную информацию..."
                rows={4}
                className={styles.textArea}
              />
              {errors.message && (
                <div className={styles.error}>{errors.message}</div>
              )}
            </div>
            
            <div className={styles.textAreaGroup}>
              <label className={styles.textAreaLabel}>
                Особые условия
              </label>
              <textarea
                value={formData.specialTerms}
                onChange={(e) => handleInputChange('specialTerms', e.target.value)}
                placeholder="Укажите особые условия аренды, если есть..."
                rows={3}
                className={styles.textArea}
              />
            </div>
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
            disabled={!formData.itemId || !formData.tenantEmail}
          >
            Отправить предложение
          </Button>
        </div>
      </form>

      {/* Модальное окно поиска товаров */}
      <ItemSearchModal
        isOpen={isItemSearchOpen}
        onClose={() => setIsItemSearchOpen(false)}
        onSelect={handleItemSelect}
        items={myItems}
        loading={loadingItems}
      />
    </div>
  )
}

export default ContractForm