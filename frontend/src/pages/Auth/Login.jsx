import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import styles from './Auth.module.css'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  
  const { login, isLoading, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = location.state?.from?.pathname || '/'

  // Перенаправляем если уже авторизован
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

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
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email) {
      newErrors.email = 'Email обязателен'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный email'
    }
    
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const result = await login(formData)
    if (result.success) {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Вход в систему</h1>
          <p className={styles.authSubtitle}>
            Добро пожаловать в RentChain! Войдите в свой аккаунт.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
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
            label="Пароль"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="Введите ваш пароль"
            icon={<Lock size={18} />}
            fullWidth
            required
          />

          <div className={styles.authActions}>
            <Link to="/forgot-password" className={styles.forgotLink}>
              Забыли пароль?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            loading={isLoading}
            className={styles.authButton}
          >
            Войти
          </Button>
        </form>

        <div className={styles.authFooter}>
          <p>
            Нет аккаунта?{' '}
            <Link to="/register" className={styles.authLink}>
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login