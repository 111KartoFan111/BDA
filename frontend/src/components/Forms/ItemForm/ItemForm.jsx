// frontend/src/components/Forms/ItemForm/ItemForm.jsx
import React, { useState, useEffect } from 'react'
import { Upload, X, MapPin, Calendar, DollarSign, Package, FileText } from 'lucide-react'
import { itemsAPI } from '../../../services/api/items'
import Button from '../../UI/Button/Button'
import Input from '../../UI/Input/Input'
import Card from '../../UI/Card/Card'
import toast from 'react-hot-toast'
import { 
  validateText, 
  validatePrice, 
  validateDate, 
  validateImage,
  validateForm as validateFormData
} from '../../../services/utils/validation'
import styles from './ItemForm.module.css'

const ItemForm = ({ 
  item = null, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    pricePerDay: '',
    deposit: '',
    location: '',
    availableFrom: '',
    availableTo: '',
    minRentalDays: '1',
    maxRentalDays: '30',
    terms: '',
    condition: 'good',
    brand: '',
    model: '',
    year: ''
  })

  const [images, setImages] = useState([])
  const [imageFiles, setImageFiles] = useState([])
  const [errors, setErrors] = useState({})
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  // Загружаем данные если редактируем существующий товар
  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        category: item.category_id || item.category?.id || '',
        pricePerDay: item.price_per_day?.toString() || item.pricePerDay?.toString() || '',
        deposit: item.deposit?.toString() || '0',
        location: item.location || '',
        availableFrom: item.available_from ? item.available_from.split('T')[0] : '',
        availableTo: item.available_to ? item.available_to.split('T')[0] : '',
        minRentalDays: item.min_rental_days?.toString() || item.minRentalDays?.toString() || '1',
        maxRentalDays: item.max_rental_days?.toString() || item.maxRentalDays?.toString() || '30',
        terms: item.terms || '',
        condition: item.condition || 'good',
        brand: item.brand || '',
        model: item.model || '',
        year: item.year?.toString() || ''
      })
      
      if (item.images && Array.isArray(item.images)) {
        setImages(item.images)
      }
    }
  }, [item])

  // Загружаем категории
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true)
        console.log('Loading categories in ItemForm...')
        const response = await itemsAPI.getCategories()
        console.log('Categories response in ItemForm:', response)
        
        // Обрабатываем ответ от API
        const responseData = response.data
        let categoriesData = []
        
        if (responseData.success !== false) {
          if (Array.isArray(responseData.data)) {
            categoriesData = responseData.data
          } else if (Array.isArray(responseData)) {
            categoriesData = responseData
          }
        }
        
        console.log('Processed categories in ItemForm:', categoriesData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Error loading categories:', error)
        toast.error('Ошибка загрузки категорий')
        setCategories([])
      } finally {
        setLoadingCategories(false)
      }
    }
    
    loadCategories()
  }, [])

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
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    
    // Проверяем каждый файл
    const validFiles = []
    const newErrors = {}
    
    files.forEach((file, index) => {
      const error = validateImage(file, 5) // 5MB лимит
      if (error) {
        newErrors[`image_${index}`] = error
        toast.error(`Файл ${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    })
    
    if (validFiles.length === 0) {
      return
    }
    
    // Проверяем общее количество изображений
    if (images.length + validFiles.length > 10) {
      toast.error('Максимально можно загрузить 10 изображений')
      return
    }
    
    // Добавляем новые файлы
    setImageFiles(prev => [...prev, ...validFiles])
    
    // Создаем превью
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImages(prev => [...prev, e.target.result])
      }
      reader.readAsDataURL(file)
    })
    
    // Очищаем input
    e.target.value = ''
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImageFiles(prev => prev.filter((_, i) => i !== index))
  }

  const validateFormFields = () => {
    const validationRules = {
      title: [
        (value) => validateText(value, 3, 100, 'Название')
      ],
      description: [
        (value) => validateText(value, 10, 2000, 'Описание')
      ],
      category: [
        (value) => !value ? 'Выберите категорию' : null
      ],
      pricePerDay: [
        (value) => validatePrice(value, 0.001, 10000)
      ],
      deposit: [
        (value) => value && value !== '0' ? validatePrice(value, 0, 10000) : null
      ],
      availableFrom: [
        (value) => value ? validateDate(value, 'Дата начала доступности') : null
      ],
      minRentalDays: [
        (value) => {
          const num = parseInt(value)
          if (isNaN(num) || num < 1) return 'Минимальный срок не может быть меньше 1 дня'
          return null
        }
      ],
      maxRentalDays: [
        (value) => {
          const num = parseInt(value)
          const minNum = parseInt(formData.minRentalDays)
          if (isNaN(num) || num < 1) return 'Максимальный срок не может быть меньше 1 дня'
          if (!isNaN(minNum) && num < minNum) return 'Максимальный срок не может быть меньше минимального'
          return null
        }
      ]
    }
    
    // Проверяем даты
    if (formData.availableTo && formData.availableFrom) {
      if (new Date(formData.availableTo) <= new Date(formData.availableFrom)) {
        validationRules.availableTo = [() => 'Дата окончания должна быть позже даты начала']
      }
    }
    
    const { isValid, errors: validationErrors } = validateFormData(formData, validationRules)
    
    // Добавляем ошибку изображений если нет изображений для нового товара
    if (!item && images.length === 0) {
      validationErrors.images = 'Добавьте хотя бы одно изображение'
    }
    
    setErrors(validationErrors)
    return isValid && (item || images.length > 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateFormFields()) {
      toast.error('Пожалуйста, исправьте ошибки в форме')
      return
    }
    
    // Подготавливаем данные для отправки
    const submitData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category, // Используем category вместо category_id для фронтенда
      pricePerDay: parseFloat(formData.pricePerDay),
      deposit: formData.deposit ? parseFloat(formData.deposit) : 0,
      location: formData.location?.trim() || null,
      availableFrom: formData.availableFrom || null,
      availableTo: formData.availableTo || null,
      minRentalDays: parseInt(formData.minRentalDays),
      maxRentalDays: parseInt(formData.maxRentalDays),
      terms: formData.terms?.trim() || null,
      condition: formData.condition,
      brand: formData.brand?.trim() || null,
      model: formData.model?.trim() || null,
      year: formData.year ? parseInt(formData.year) : null,
      images: imageFiles
    }
    
    console.log('Form submit data:', submitData)
    onSubmit?.(submitData)
  }

  const conditionOptions = [
    { value: 'new', label: 'Новое' },
    { value: 'like_new', label: 'Как новое' },
    { value: 'good', label: 'Хорошее' },
    { value: 'fair', label: 'Удовлетворительное' },
    { value: 'poor', label: 'Плохое' }
  ]

  return (
    <form onSubmit={handleSubmit} className={styles.itemForm}>
      {/* Основная информация */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Package size={20} />
          Основная информация
        </h3>
        
        <div className={styles.formGrid}>
          <Input
            label="Название товара"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            error={errors.title}
            placeholder="Например: iPhone 15 Pro Max"
            required
            fullWidth
          />
          
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel}>
              Категория <span className={styles.required}>*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={`${styles.select} ${errors.category ? styles.selectError : ''}`}
              required
              disabled={loadingCategories}
            >
              <option value="">
                {loadingCategories ? 'Загрузка...' : 'Выберите категорию'}
              </option>
              {Array.isArray(categories) && categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <span className={styles.errorText}>{errors.category}</span>
            )}
          </div>
        </div>
        
        <div className={styles.textareaGroup}>
          <label className={styles.textareaLabel}>
            Описание <span className={styles.required}>*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Подробное описание товара, его состояние, особенности использования..."
            className={`${styles.textarea} ${errors.description ? styles.textareaError : ''}`}
            rows={4}
            required
          />
          {errors.description && (
            <span className={styles.errorText}>{errors.description}</span>
          )}
        </div>
      </Card>

      {/* Изображения */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Upload size={20} />
          Фотографии товара
        </h3>
        
        <div className={styles.imageUpload}>
          <div className={styles.imageGrid}>
            {images.map((image, index) => (
              <div key={index} className={styles.imagePreview}>
                <img src={image} alt={`Превью ${index + 1}`} />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className={styles.removeImageButton}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            
            {images.length < 10 && (
              <label className={styles.uploadButton}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className={styles.hiddenInput}
                />
                <Upload size={24} />
                <span>Добавить фото</span>
              </label>
            )}
          </div>
          
          {errors.images && (
            <span className={styles.errorText}>{errors.images}</span>
          )}
          
          <p className={styles.uploadHint}>
            Максимум 10 фотографий. Форматы: JPG, PNG, WebP. Размер до 5MB каждое.
          </p>
        </div>
      </Card>

      {/* Цена и условия */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <DollarSign size={20} />
          Цена и условия аренды
        </h3>
        
        <div className={styles.formGrid}>
          <Input
            label="Цена за день (ETH)"
            name="pricePerDay"
            type="number"
            step="0.001"
            min="0"
            value={formData.pricePerDay}
            onChange={handleInputChange}
            error={errors.pricePerDay}
            placeholder="0.05"
            required
            fullWidth
          />
          
          <Input
            label="Залог (ETH)"
            name="deposit"
            type="number"
            step="0.001"
            min="0"
            value={formData.deposit}
            onChange={handleInputChange}
            error={errors.deposit}
            placeholder="0.1"
            helperText="Опционально"
            fullWidth
          />
          
          <Input
            label="Минимальный срок (дней)"
            name="minRentalDays"
            type="number"
            min="1"
            value={formData.minRentalDays}
            onChange={handleInputChange}
            error={errors.minRentalDays}
            fullWidth
          />
          
          <Input
            label="Максимальный срок (дней)"
            name="maxRentalDays"
            type="number"
            min="1"
            value={formData.maxRentalDays}
            onChange={handleInputChange}
            error={errors.maxRentalDays}
            fullWidth
          />
        </div>
        
        <div className={styles.formGrid}>
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel}>Состояние</label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleInputChange}
              className={styles.select}
            >
              {conditionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <Input
            label="Бренд"
            name="brand"
            value={formData.brand}
            onChange={handleInputChange}
            placeholder="Apple, Samsung..."
            fullWidth
          />
          
          <Input
            label="Модель"
            name="model"
            value={formData.model}
            onChange={handleInputChange}
            placeholder="iPhone 15, Galaxy S24..."
            fullWidth
          />
          
          <Input
            label="Год выпуска"
            name="year"
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            value={formData.year}
            onChange={handleInputChange}
            placeholder="2024"
            fullWidth
          />
        </div>
      </Card>

      {/* Доступность */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Calendar size={20} />
          Доступность и местоположение
        </h3>
        
        <div className={styles.formGrid}>
          <Input
            label="Доступен с"
            name="availableFrom"
            value={formData.availableFrom ? new Date(formData.availableFrom).toISOString().slice(0, 10) + ' ' + new Date(formData.availableFrom).toISOString().slice(11, 16) : ''}
            onChange={handleInputChange}
            error={errors.availableFrom}
            type="datetime-local"
            min={new Date().toISOString().slice(0, 10) + ' ' + new Date().toISOString().slice(11, 16)}
            fullWidth
          />
          
          <Input
            label="Доступен до"
            name="availableTo"
            type="datetime-local"
            value={formData.availableTo ? new Date(formData.availableTo).toISOString().slice(0, 10) + ' ' + new Date(formData.availableTo).toISOString().slice(11, 16) : ''}
            onChange={handleInputChange}
            error={errors.availableTo}
            min={formData.availableFrom ? new Date(formData.availableFrom).toISOString().slice(0, 10) + ' ' + new Date(formData.availableFrom).toISOString().slice(11, 16) : new Date().toISOString().slice(0, 10) + ' ' + new Date().toISOString().slice(11, 16)}
            helperText="Опционально"
            fullWidth
          />
        </div>
        
        <Input
          label="Местоположение"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          error={errors.location}
          placeholder="Город, район"
          icon={<MapPin size={18} />}
          fullWidth
        />
      </Card>

      {/* Дополнительные условия */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FileText size={20} />
          Дополнительные условия
        </h3>
        
        <div className={styles.textareaGroup}>
          <label className={styles.textareaLabel}>
            Условия использования
          </label>
          <textarea
            name="terms"
            value={formData.terms}
            onChange={handleInputChange}
            placeholder="Особые условия аренды, правила использования, что включено в стоимость..."
            className={styles.textarea}
            rows={3}
          />
          <span className={styles.helperText}>
            Опишите особенности аренды вашего товара
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
          disabled={isLoading}
        >
          {item ? 'Обновить товар' : 'Создать товар'}
        </Button>
      </div>
    </form>
  )
}

export default ItemForm