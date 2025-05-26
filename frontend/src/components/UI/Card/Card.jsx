import React from 'react'
import styles from './Card.module.css'

const Card = ({
  children,
  variant = 'default',
  padding = 'medium',
  shadow = 'medium',
  hover = false,
  clickable = false,
  onClick,
  className = '',
  ...props
}) => {
  const cardClasses = [
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    styles[`shadow-${shadow}`],
    hover && styles.hover,
    clickable && styles.clickable,
    className
  ].filter(Boolean).join(' ')

  const handleClick = (e) => {
    if (clickable && onClick) {
      onClick(e)
    }
  }

  const Component = clickable ? 'button' : 'div'

  return (
    <Component
      className={cardClasses}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Card