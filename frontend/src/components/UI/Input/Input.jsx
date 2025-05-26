import React, { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import styles from './Input.module.css'

const Input = forwardRef(({
  label,
  error,
  helperText,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  fullWidth = false,
  size = 'medium',
  icon,
  suffix,
  className = '',
  id,
  name,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  const containerClasses = [
    styles.container,
    fullWidth && styles.fullWidth,
    className
  ].filter(Boolean).join(' ')

  const inputClasses = [
    styles.input,
    styles[size],
    error && styles.error,
    disabled && styles.disabled,
    icon && styles.withIcon,
    (suffix || isPassword) && styles.withSuffix,
    isFocused && styles.focused
  ].filter(Boolean).join(' ')

  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus && onFocus(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur && onBlur(e)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <div className={styles.inputWrapper}>
        {icon && (
          <span className={styles.iconWrapper}>
            {icon}
          </span>
        )}
        
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClasses}
          {...props}
        />
        
        {(suffix || isPassword) && (
          <div className={styles.suffixWrapper}>
            {isPassword && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={styles.passwordToggle}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
            {suffix && <span className={styles.suffix}>{suffix}</span>}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className={styles.helpText}>
          {error ? (
            <span className={styles.errorText}>{error}</span>
          ) : (
            <span className={styles.helperText}>{helperText}</span>
          )}
        </div>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input