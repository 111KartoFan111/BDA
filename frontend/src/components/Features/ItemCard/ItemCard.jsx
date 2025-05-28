import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star, Calendar, User } from 'lucide-react'
import { formatCurrency, formatDate } from '../../../services/utils/formatting'
import styles from './ItemCard.module.css'

const ItemCard = ({ item, className = '' }) => {
  // Проверяем, что item существует
  if (!item) {
    return null
  }

  const {
    id,
    title,
    description,
    price,
    price_per_day, // добавляем поддержку snake_case из бэкенда
    pricePerDay,
    images,
    location,
    rating,
    reviewsCount,
    reviews_count, // добавляем поддержку snake_case
    owner,
    availableFrom,
    available_from, // добавляем поддержку snake_case
    category,
    isAvailable,
    is_available // добавляем поддержку snake_case
  } = item

  // Определяем цену с учетом разных форматов
  const itemPrice = price || price_per_day || pricePerDay || 0
  
  // Определяем доступность
  const available = isAvailable !== undefined ? isAvailable : (is_available !== undefined ? is_available : true)
  
  // Определяем дату доступности
  const availabilityDate = availableFrom || available_from
  
  // Определяем количество отзывов
  const reviewCount = reviewsCount || reviews_count || 0

  const cardClasses = [
    styles.card,
    !available && styles.unavailable,
    className
  ].filter(Boolean).join(' ')

  return (
    <Link to={`/items/${id}`} className={cardClasses}>
      <div className={styles.imageContainer}>
        <img 
          src={images?.[0] || '/placeholder-image.jpg'} 
          alt={title || 'Товар'}
          className={styles.image}
          loading="lazy"
        />
        {!available && (
          <div className={styles.unavailableBadge}>
            Недоступно
          </div>
        )}
        <div className={styles.categoryBadge}>
          {typeof category === 'object' ? category?.name : category || 'Без категории'}
        </div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title || 'Без названия'}</h3>
          <div className={styles.price}>
            {formatCurrency(itemPrice)}<span className={styles.period}>/день</span>
          </div>
        </div>
        
        <p className={styles.description}>
          {description && description.length > 100 
            ? `${description.substring(0, 100)}...` 
            : (description || 'Описание отсутствует')
          }
        </p>
        
        <div className={styles.details}>
          {location && (
            <div className={styles.detail}>
              <MapPin size={14} />
              <span>{location}</span>
            </div>
          )}
          
          {availabilityDate && (
            <div className={styles.detail}>
              <Calendar size={14} />
              <span>с {formatDate(availabilityDate)}</span>
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <div className={styles.owner}>
            <div className={styles.ownerAvatar}>
              {owner?.avatar ? (
                <img src={owner.avatar} alt={owner.name || owner.first_name} />
              ) : (
                <User size={16} />
              )}
            </div>
            <span className={styles.ownerName}>
              {owner?.name || owner?.first_name || owner?.email?.split('@')[0] || 'Пользователь'}
            </span>
          </div>
          
          {rating && (
            <div className={styles.rating}>
              <Star size={14} className={styles.starIcon} />
              <span className={styles.ratingValue}>{Number(rating).toFixed(1)}</span>
              {reviewCount > 0 && (
                <span className={styles.reviewsCount}>({reviewCount})</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default ItemCard