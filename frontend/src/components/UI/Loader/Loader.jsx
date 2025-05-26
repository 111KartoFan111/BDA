import React from 'react'
import styles from './Loader.module.css'

const Loader = ({
  size = 'medium',
  variant = 'spinner',
  color = 'primary',
  text,
  overlay = false,
  className = ''
}) => {
  const loaderClasses = [
    styles.loader,
    styles[variant],
    styles[size],
    styles[color],
    overlay && styles.overlay,
    className
  ].filter(Boolean).join(' ')

  const renderSpinner = () => (
    <div className={styles.spinner}>
      <div className={styles.spinnerCircle}></div>
    </div>
  )

  const renderDots = () => (
    <div className={styles.dots}>
      <div className={styles.dot}></div>
      <div className={styles.dot}></div>
      <div className={styles.dot}></div>
    </div>
  )

  const renderPulse = () => (
    <div className={styles.pulse}>
      <div className={styles.pulseCircle}></div>
    </div>
  )

  const renderBars = () => (
    <div className={styles.bars}>
      <div className={styles.bar}></div>
      <div className={styles.bar}></div>
      <div className={styles.bar}></div>
      <div className={styles.bar}></div>
    </div>
  )

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots()
      case 'pulse':
        return renderPulse()
      case 'bars':
        return renderBars()
      default:
        return renderSpinner()
    }
  }

  return (
    <div className={loaderClasses}>
      <div className={styles.loaderContent}>
        {renderLoader()}
        {text && <div className={styles.text}>{text}</div>}
      </div>
    </div>
  )
}

export default Loader