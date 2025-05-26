import React, { useState } from 'react'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../UI/Button/Button'
import Input from '../../UI/Input/Input'
import { validateEmail, validatePassword } from '../../../services/utils/validation'
import styles from './LoginForm.module.css'

const LoginForm = ({ onSuccess, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [rememberMe, setRememberMe] = useState(false)
  
  const { login, isLoading } = useAuth()

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

  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked)
  }

  const validateForm = () => {
    const newErrors = {}
    
    const emailError = validateEmail(formData.email)
    if (emailError) newErrors.email = emailError
    
    const passwordError = validatePassword(formData.password)
    if (passwordError) newErrors.password = passwordError
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const result = await login({
      ...formData,
      rememberMe
    })
    
    if (result.success) {
      onSuccess?.()
    }
  }

  const fillDemoCredentials = () => {
    setFormData({
      email: 'demo@rentchain.com',
      password: 'demo123'
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.loginForm}>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>Вход в систему</h2>
        <p className={styles.formSubtitle}>
          Войдите в свой аккаунт для продолжения
        </p>
      </div>

      <div className={styles.formFields}>
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

        <div className={styles.formOptions}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={handleRememberMeChange}
              className={styles.checkbox}
            />
            <span>Запомнить меня</span>
          </label>
          
          <button
            type="button"
            className={styles.forgotLink}
            onClick={() => {/* TODO: Implement forgot password */}}
          >
            Забыли пароль?
          </button>
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
          Войти
        </Button>

        <div className={styles.divider}>
          <span>или</span>
        </div>

        <button
          type="button"
          onClick={fillDemoCredentials}
          className={styles.demoButton}
        >
          Использовать демо-аккаунт
        </button>
      </div>

      <div className={styles.formFooter}>
        <p>
          Нет аккаунта?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className={styles.switchLink}
          >
            Зарегистрироваться
          </button>
        </p>
      </div>
    </form>
  )
}

export default LoginForm