import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from '../Button/Button'
import styles from './Modal.module.css'

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEscKey = true,
  showCloseButton = true,
  footer,
  className = ''
}) => {
  const modalRef = useRef()
  const previousActiveElement = useRef()

  useEffect(() => {
    if (isOpen) {
      // Сохраняем текущий активный элемент
      previousActiveElement.current = document.activeElement
      
      // Фокусируемся на модальном окне
      modalRef.current?.focus()
      
      // Блокируем скролл
      document.body.style.overflow = 'hidden'
    } else {
      // Восстанавливаем скролл
      document.body.style.overflow = 'unset'
      
      // Возвращаем фокус
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && closeOnEscKey) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, closeOnEscKey, onClose])

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose()
    }
  }

  const handleModalClick = (event) => {
    event.stopPropagation()
  }

  if (!isOpen) return null

  const modalClasses = [
    styles.modal,
    styles[size],
    className
  ].filter(Boolean).join(' ')

  const modalContent = (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className={modalClasses}
        onClick={handleModalClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && (
              <h2 id="modal-title" className={styles.title}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="small"
                onClick={onClose}
                className={styles.closeButton}
                aria-label="Закрыть"
              >
                <X size={20} />
              </Button>
            )}
          </div>
        )}
        
        <div className={styles.content}>
          {children}
        </div>
        
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default Modal