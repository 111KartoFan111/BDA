import React, { useState, useEffect } from 'react'
import { Upload, X, MapPin, Calendar, DollarSign, Package, FileText } from 'lucide-react'
import { itemsAPI } from '../../../services/api/items'
import Button from '../../UI/Button/Button'
import Input from '../../UI/Input/Input'
import Card from '../../UI/Card/Card'
import { 
  validateText, 
  validatePrice, 
  validateDate, 
  validateImage 
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
    terms: ''
  })

  const [images, setImages] = useState([])
  const [imageFiles, setImageFiles] = useState([])
  const [errors, setErrors] = useState({})
  const [categories, setCategories] = useState([])

  // Загружаем данные если редактируем существующий товар
  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        category: item.category || '',
        pricePerDay: item.pricePerDay?.toString() || '',
        deposit: item.deposit?.toString() || '',
        location: item.location || '',
        availableFrom: item.availableFrom ? item.availableFrom.split('T')[0] : '',
        availableTo: item.availableTo ? item.availableTo.split('T')[0] : '',
        minRentalDays: item.minRentalDays?.toString() || '1',
        maxRentalDays: item.maxRentalDays?.toString() || '30',
        terms: item.terms || ''
      })
      
      if (item.images) {
        setImages(item.images)
      }
    }
  }, [item])

  // Загружаем категории
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await itemsAPI.getCategories()
        setCategories(response.data || [])
      } catch (error) {
        console.error('Error loading categories:', error)
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
      } else {
        validFiles.push(file)
      }
    })
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }))
      return
    }
    
    // Добавляем новые файлы
    const newImageFiles = [...imageFiles, ...validFiles]
    setImageFiles(newImageFiles)
    
    // Создаем превью
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImages(prev => [...prev, e.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImageFiles(prev => prev.filter((_, i) => i !== index))
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Валидация заголовка
    const titleError = validateText(formData.title, 5, 100, 'Название')
    if (titleError) newErrors.title = titleError
    
    // Валидация описания
    const descriptionError = validateText(formData.description, 10, 2000, 'Описание')
    if (descriptionError) newErrors.description = descriptionError
    
    // Валидация категории
    if (!formData.category) {
      newErrors.category = 'Выберите категорию'
    }
    
    // Валидация цены
    const priceError = validatePrice(formData.pricePerDay, 0.001, 10000)
    if (priceError) newErrors.pricePerDay = priceError
    
    // Валидация залога
    if (formData.deposit) {
      const depositError = validatePrice(formData.deposit, 0, 10000)
      if (depositError) newErrors.deposit = depositError
    }
    
    // Валидация дат
    if (formData.availableFrom) {
      const dateError = validateDate(formData.availableFrom, 'Дата начала доступности')
      if (dateError) newErrors.availableFrom = dateError
    }
    
    if (formData.availableTo && formData.availableFrom) {
      if (new Date(formData.availableTo) <= new Date(formData.availableFrom)) {
        newErrors.availableTo = 'Дата окончания должна быть позже даты начала'
      }
    }
    
    // Валидация минимального и максимального срока аренды
    const minDays = parseInt(formData.minRentalDays)
    const maxDays = parseInt(formData.maxRentalDays)
    
    if (minDays < 1) {
      newErrors.minRentalDays = 'Минимальный срок не может быть меньше 1 дня'
    }
    
    if (maxDays < minDays) {
      newErrors.maxRentalDays = 'Максимальный срок не может быть меньше минимального'
    }
    
    // Проверяем наличие изображений
    if (images.length === 0) {
      newErrors.images = 'Добавьте хотя бы одно изображение'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    // Подготавливаем данные для отправки
    const submitData = {
      ...formData,
      pricePerDay: parseFloat(formData.pricePerDay),
      deposit: formData.deposit ? parseFloat(formData.deposit) : 0,
      minRentalDays: parseInt(formData.minRentalDays),
      maxRentalDays: parseInt(formData.maxRentalDays),
      images: imageFiles
    }
    
    onSubmit?.(submitData)
  }

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
            >
              <option value="">Выберите категорию</option>
              {categories.map(category => (
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
            Максимум 10 фотографий. Форматы: JPG, PNG, WebP. Размер до 5MB.
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
            type="date"
            value={formData.availableFrom}
            onChange={handleInputChange}
            error={errors.availableFrom}
            min={new Date().toISOString().split('T')[0]}
            fullWidth
          />
          
          <Input
            label="Доступен до"
            name="availableTo"
            type="date"
            value={formData.availableTo}
            onChange={handleInputChange}
            error={errors.availableTo}
            min={formData.availableFrom || new Date().toISOString().split('T')[0]}
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
        >
          {item ? 'Обновить товар' : 'Создать товар'}
        </Button>
      </div>
    </form>
  )
}

export default ItemForm