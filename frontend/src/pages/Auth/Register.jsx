import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import styles from './Auth.module.css'

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [passwordStrength, setPasswordStrength] = useState(0)
  
  const { register, isLoading, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Перенаправляем если уже авторизован
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

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

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Имя обязательно'
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Фамилия обязательна'
    }
    
    if (!formData.email) {
      newErrors.email = 'Email обязателен'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный email'
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Телефон обязателен'
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Некорректный номер телефона'
    }
    
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Пароль должен содержать минимум 8 символов'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите пароль'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают'
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
      navigate('/', { replace: true })
    }
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Регистрация</h1>
          <p className={styles.authSubtitle}>
            Создайте аккаунт для начала работы с RentChain
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formRow}>
            <Input
              label="Имя"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              error={errors.firstName}
              placeholder="Введите ваше имя"
              icon={<User size={18} />}
              fullWidth
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
              fullWidth
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
                    passwordStrength <= 2 ? styles.weak :
                    passwordStrength === 3 ? styles.fair :
                    passwordStrength === 4 ? styles.good : styles.strong
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

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            loading={isLoading}
            className={styles.authButton}
          >
            Зарегистрироваться
          </Button>
        </form>

        <div className={styles.authFooter}>
          <p>
            Уже есть аккаунт?{' '}
            <Link to="/login" className={styles.authLink}>
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register