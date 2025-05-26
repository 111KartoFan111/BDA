import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star, Calendar, User } from 'lucide-react'
import { formatCurrency, formatDate } from '../../../services/utils/formatting'
import styles from './ItemCard.module.css'

const ItemCard = ({ item, className = '' }) => {
  const {
    id,
    title,
    description,
    price,
    images,
    location,
    rating,
    reviewsCount,
    owner,
    availableFrom,
    category,
    isAvailable
  } = item

  const cardClasses = [
    styles.card,
    !isAvailable && styles.unavailable,
    className
  ].filter(Boolean).join(' ')

  return (
    <Link to={`/items/${id}`} className={cardClasses}>
      <div className={styles.imageContainer}>
        <img 
          src={images?.[0] || '/placeholder-image.jpg'} 
          alt={title}
          className={styles.image}
          loading="lazy"
        />
        {!isAvailable && (
          <div className={styles.unavailableBadge}>
            Недоступно
          </div>
        )}
        <div className={styles.categoryBadge}>
          {category}
        </div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.price}>
            {formatCurrency(price)}<span className={styles.period}>/день</span>
          </div>
        </div>
        
        <p className={styles.description}>
          {description?.length > 100 
            ? `${description.substring(0, 100)}...` 
            : description
          }
        </p>
        
        <div className={styles.details}>
          {location && (
            <div className={styles.detail}>
              <MapPin size={14} />
              <span>{location}</span>
            </div>
          )}
          
          {availableFrom && (
            <div className={styles.detail}>
              <Calendar size={14} />
              <span>с {formatDate(availableFrom)}</span>
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <div className={styles.owner}>
            <div className={styles.ownerAvatar}>
              {owner?.avatar ? (
                <img src={owner.avatar} alt={owner.name} />
              ) : (
                <User size={16} />
              )}
            </div>
            <span className={styles.ownerName}>{owner?.name}</span>
          </div>
          
          {rating && (
            <div className={styles.rating}>
              <Star size={14} className={styles.starIcon} />
              <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
              {reviewsCount > 0 && (
                <span className={styles.reviewsCount}>({reviewsCount})</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default ItemCard