import React, { useState } from 'react'
import { Mail, Lock, User, Phone } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../UI/Button/Button'
import Input from '../../UI/Input/Input'
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validatePhone 
} from '../../../services/utils/validation'
import styles from './RegisterForm.module.css'

const RegisterForm = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  
  const { register, isLoading } = useAuth()

  const handleChange = (e) => {
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

    // Проверяем силу пароля
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value))
    }
  }

  const handleTermsChange = (e) => {
    setAcceptTerms(e.target.checked)
  }

  const calculatePasswordStrength = (password) => {
    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    return strength
  }

  const getPasswordStrengthText = (strength) => {
    const texts = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Отличный']
    return texts[strength - 1] || 'Очень слабый'
  }

  const getPasswordStrengthClass = (strength) => {
    if (strength <= 2) return 'weak'
    if (strength === 3) return 'fair'
    if (strength === 4) return 'good'
    return 'strong'
  }

  const validateForm = () => {
    const newErrors = {}
    
    const firstNameError = validateName(formData.firstName, 'Имя')
    if (firstNameError) newErrors.firstName = firstNameError
    
    const lastNameError = validateName(formData.lastName, 'Фамилия')
    if (lastNameError) newErrors.lastName = lastNameError
    
    const emailError = validateEmail(formData.email)
    if (emailError) newErrors.email = emailError
    
    const phoneError = validatePhone(formData.phone)
    if (phoneError) newErrors.phone = phoneError
    
    const passwordError = validatePassword(formData.password)
    if (passwordError) newErrors.password = passwordError
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите пароль'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают'
    }
    
    if (!acceptTerms) {
      newErrors.terms = 'Необходимо согласиться с условиями'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password
    })
    
    if (result.success) {
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.registerForm}>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>Регистрация</h2>
        <p className={styles.formSubtitle}>
          Создайте аккаунт для начала работы с RentChain
        </p>
      </div>

      <div className={styles.formFields}>
        <div className={styles.nameFields}>
          <Input
            label="Имя"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            placeholder="Введите ваше имя"
            icon={<User size={18} />}
            required
          />

          <Input
            label="Фамилия"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            placeholder="Введите вашу фамилию"
            icon={<User size={18} />}
            required
          />
        </div>

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="Введите ваш email"
          icon={<Mail size={18} />}
          fullWidth
          required
        />

        <Input
          label="Телефон"
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="+7 (999) 123-45-67"
          icon={<Phone size={18} />}
          fullWidth
          required
        />

        <Input
          label="Пароль"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="Введите пароль"
          icon={<Lock size={18} />}
          fullWidth
          required
        />

        {formData.password && (
          <div className={styles.passwordStrength}>
            <div className={styles.strengthBar}>
              <div 
                className={`${styles.strengthFill} ${
                  styles[getPasswordStrengthClass(passwordStrength)]
                }`}
              />
            </div>
            <div className={styles.strengthText}>
              Сила пароля: {getPasswordStrengthText(passwordStrength)}
            </div>
          </div>
        )}

        <Input
          label="Подтвердите пароль"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          placeholder="Подтвердите пароль"
          icon={<Lock size={18} />}
          fullWidth
          required
        />

        <div className={styles.termsSection}>
          <label className={styles.termsLabel}>
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={handleTermsChange}
              className={styles.checkbox}
            />
            <span>
              Я согласен с{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                условиями использования
              </a>{' '}
              и{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                политикой конфиденциальности
              </a>
            </span>
          </label>
          {errors.terms && (
            <div className={styles.termsError}>{errors.terms}</div>
          )}
        </div>
      </div>

      <div className={styles.formActions}>
        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
          loading={isLoading}
        >
          Зарегистрироваться
        </Button>
      </div>

      <div className={styles.formFooter}>
        <p>
          Уже есть аккаунт?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className={styles.switchLink}
          >
            Войти
          </button>
        </p>
      </div>
    </form>
  )
}

export default RegisterForm