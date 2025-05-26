import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Save, X, Camera } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../UI/Button/Button'
import Input from '../../UI/Input/Input'
import Card from '../../UI/Card/Card'
import { validateEmail, validatePhone, validateName } from '../../../services/utils/validation'
import styles from './ProfileForm.module.css'

const ProfileForm = ({ onCancel, onSuccess }) => {
  const { user, updateProfile, isLoading } = useAuth()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    avatar: null
  })
  
  const [errors, setErrors] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)

  // Заполняем форму данными пользователя
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || '',
        avatar: null
      })
      setAvatarPreview(user.avatar)
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    setIsDirty(true)
    
    // Очищаем ошибку для этого поля
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Проверяем размер файла (макс. 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          avatar: 'Размер файла не должен превышать 5MB'
        }))
        return
      }

      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          avatar: 'Пожалуйста, выберите изображение'
        }))
        return
      }

      setFormData(prev => ({
        ...prev,
        avatar: file
      }))

      // Создаем превью
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target.result)
      }
      reader.readAsDataURL(file)
      
      setIsDirty(true)
      
      // Очищаем ошибку
      if (errors.avatar) {
        setErrors(prev => ({
          ...prev,
          avatar: ''
        }))
      }
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Валидация имени
    const firstNameError = validateName(formData.firstName, 'Имя')
    if (firstNameError) newErrors.firstName = firstNameError
    
    // Валидация фамилии
    const lastNameError = validateName(formData.lastName, 'Фамилия')
    if (lastNameError) newErrors.lastName = lastNameError
    
    // Валидация email
    const emailError = validateEmail(formData.email)
    if (emailError) newErrors.email = emailError
    
    // Валидация телефона (опционально)
    if (formData.phone) {
      const phoneError = validatePhone(formData.phone)
      if (phoneError) newErrors.phone = phoneError
    }
    
    // Валидация био (опционально)
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Описание не должно превышать 500 символов'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      const result = await updateProfile(formData)
      
      if (result.success) {
        setIsDirty(false)
        onSuccess?.()
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('У вас есть несохраненные изменения. Вы уверены, что хотите отменить?')
      if (!confirmed) return
    }
    
    // Сбрасываем форму к исходным данным
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || '',
        avatar: null
      })
      setAvatarPreview(user.avatar)
    }
    
    setErrors({})
    setIsDirty(false)
    onCancel?.()
  }

  return (
    <Card className={styles.profileForm}>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>Редактирование профиля</h2>
        <p className={styles.formSubtitle}>
          Обновите информацию о себе
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Аватар */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatar}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Аватар" />
              ) : (
                <User size={40} />
              )}
            </div>
            <label className={styles.avatarButton}>
              <Camera size={16} />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className={styles.hiddenInput}
              />
            </label>
          </div>
          {errors.avatar && (
            <span className={styles.errorText}>{errors.avatar}</span>
          )}
          <p className={styles.avatarHint}>
            JPG, PNG или GIF. Максимум 5MB.
          </p>
        </div>

        {/* Основная информация */}
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Основная информация</h3>
          
          <div className={styles.formRow}>
            <Input
              label="Имя"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              error={errors.firstName}
              icon={<User size={18} />}
              required
            />
            
            <Input
              label="Фамилия"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              error={errors.lastName}
              icon={<User size={18} />}
              required
            />
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            icon={<Mail size={18} />}
            required
          />

          <Input
            label="Телефон"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            error={errors.phone}
            icon={<Phone size={18} />}
            placeholder="+7 (999) 123-45-67"
            helperText="Опционально"
          />

          <Input
            label="Местоположение"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            error={errors.location}
            icon={<MapPin size={18} />}
            placeholder="Город, страна"
            helperText="Опционально"
          />
        </div>

        {/* Дополнительная информация */}
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>О себе</h3>
          
          <div className={styles.textareaGroup}>
            <label className={styles.textareaLabel}>
              Расскажите о себе
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Расскажите немного о себе, ваших интересах..."
              className={`${styles.textarea} ${errors.bio ? styles.error : ''}`}
              rows={4}
              maxLength={500}
            />
            {errors.bio && (
              <span className={styles.errorText}>{errors.bio}</span>
            )}
            <div className={styles.charCount}>
              {formData.bio.length}/500
            </div>
          </div>
        </div>

        {/* Действия */}
        <div className={styles.formActions}>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            icon={<X size={16} />}
          >
            Отмена
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={!isDirty}
            icon={<Save size={16} />}
          >
            Сохранить изменения
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default ProfileForm