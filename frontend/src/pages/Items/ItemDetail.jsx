import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Calendar, 
  Heart, 
  Share2, 
  Flag,
  User,
  Shield,
  Clock,
  DollarSign
} from 'lucide-react'
import { itemsAPI } from '../../services/api/items'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import Button from '../../components/UI/Button/Button'
import Card from '../../components/UI/Card/Card'
import Loader from '../../components/UI/Loader/Loader'
import Modal from '../../components/UI/Modal/Modal'
import { formatCurrency, formatDate } from '../../services/utils/formatting'
import styles from './Items.module.css'

const ItemDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [rentalDates, setRentalDates] = useState({
    startDate: '',
    endDate: ''
  })

  const { 
    data: item, 
    loading, 
    error 
  } = useApi(() => itemsAPI.getItem(id), [id])

  const { 
    data: similarItems 
  } = useApi(() => itemsAPI.getSimilarItems(id), [id], { immediate: false })

  useEffect(() => {
    if (item) {
      // Добавляем просмотр
      itemsAPI.addView(id).catch(console.error)
      
      // Проверяем, в избранном ли товар
      setIsFavorite(item.isFavorite || false)
    }
  }, [item, id])

  const handleImageChange = (index) => {
    setCurrentImageIndex(index)
  }

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    try {
      if (isFavorite) {
        await itemsAPI.removeFromFavorites(id)
      } else {
        await itemsAPI.addToFavorites(id)
      }
      setIsFavorite(!isFavorite)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleRentalRequest = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setIsRentalModalOpen(true)
  }

  const handleRentalSubmit = async () => {
    try {
      const totalDays = Math.ceil(
        (new Date(rentalDates.endDate) - new Date(rentalDates.startDate)) / 
        (1000 * 60 * 60 * 24)
      )
      const totalPrice = totalDays * item.pricePerDay

      await itemsAPI.createRentalRequest(id, {
        ...rentalDates,
        totalPrice,
        message: 'Запрос на аренду'
      })

      setIsRentalModalOpen(false)
      // Показать успешное сообщение или перенаправить
    } catch (error) {
      console.error('Error creating rental request:', error)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.description,
          url: window.location.href
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback: копируем ссылку в буфер обмена
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size="large" text="Загрузка товара..." />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className={styles.errorContainer}>
        <h2>Товар не найден</h2>
        <p>Запрашиваемый товар не существует или был удален.</p>
        <Button onClick={() => navigate('/items')}>
          Вернуться к каталогу
        </Button>
      </div>
    )
  }

  const isOwner = user?.id === item.owner?.id
  const canRent = !isOwner && item.isAvailable && isAuthenticated

  return (
    <div className={styles.itemDetail}>
      <div className="container">
        {/* Хлебные крошки */}
        <div className={styles.breadcrumbs}>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft size={16} />}
          >
            Назад
          </Button>
        </div>

        <div className={styles.itemContent}>
          {/* Галерея изображений */}
          <div className={styles.imageGallery}>
            <div className={styles.mainImage}>
              <img
                src={item.images?.[currentImageIndex] || '/placeholder-image.jpg'}
                alt={item.title}
                className={styles.image}
              />
              {!item.isAvailable && (
                <div className={styles.unavailableOverlay}>
                  <span>Недоступно</span>
                </div>
              )}
            </div>
            
            {item.images && item.images.length > 1 && (
              <div className={styles.thumbnails}>
                {item.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageChange(index)}
                    className={`${styles.thumbnail} ${
                      index === currentImageIndex ? styles.active : ''
                    }`}
                  >
                    <img src={image} alt={`${item.title} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Основная информация */}
          <div className={styles.itemInfo}>
            <div className={styles.itemHeader}>
              <div className={styles.titleSection}>
                <h1 className={styles.itemTitle}>{item.title}</h1>
                <div className={styles.itemMeta}>
                  {item.location && (
                    <span className={styles.location}>
                      <MapPin size={16} />
                      {item.location}
                    </span>
                  )}
                  <span className={styles.category}>{item.category}</span>
                </div>
              </div>

              <div className={styles.actionButtons}>
                <Button
                  variant="ghost"
                  onClick={handleFavoriteToggle}
                  icon={<Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />}
                  className={isFavorite ? styles.favoriteActive : ''}
                />
                <Button
                  variant="ghost"
                  onClick={handleShare}
                  icon={<Share2 size={16} />}
                />
                <Button
                  variant="ghost"
                  icon={<Flag size={16} />}
                />
              </div>
            </div>

            {/* Цена и аренда */}
            <Card className={styles.rentalCard}>
              <div className={styles.priceSection}>
                <div className={styles.price}>
                  {formatCurrency(item.pricePerDay)}
                  <span className={styles.period}>/день</span>
                </div>
                {item.rating && (
                  <div className={styles.rating}>
                    <Star size={16} fill="currentColor" />
                    <span>{item.rating.toFixed(1)}</span>
                    <span className={styles.reviewsCount}>
                      ({item.reviewsCount} отзывов)
                    </span>
                  </div>
                )}
              </div>

              {canRent && (
                <div className={styles.rentalForm}>
                  <div className={styles.dateInputs}>
                    <div className={styles.dateInput}>
                      <label>Начало аренды</label>
                      <input
                        type="date"
                        value={rentalDates.startDate}
                        onChange={(e) => setRentalDates(prev => ({
                          ...prev,
                          startDate: e.target.value
                        }))}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className={styles.dateInput}>
                      <label>Окончание аренды</label>
                      <input
                        type="date"
                        value={rentalDates.endDate}
                        onChange={(e) => setRentalDates(prev => ({
                          ...prev,
                          endDate: e.target.value
                        }))}
                        min={rentalDates.startDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleRentalRequest}
                    disabled={!rentalDates.startDate || !rentalDates.endDate}
                  >
                    Арендовать
                  </Button>
                </div>
              )}

              {isOwner && (
                <div className={styles.ownerActions}>
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => navigate(`/items/${id}/edit`)}
                  >
                    Редактировать
                  </Button>
                </div>
              )}

              {!isAuthenticated && (
                <div className={styles.authPrompt}>
                  <p>Войдите в систему для аренды товара</p>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => navigate('/login')}
                  >
                    Войти
                  </Button>
                </div>
              )}
            </Card>

            {/* Описание */}
            <div className={styles.description}>
              <h3>Описание</h3>
              <p>{item.description}</p>
            </div>

            {/* Детали */}
            <Card className={styles.detailsCard}>
              <h3>Детали</h3>
              <div className={styles.details}>
                <div className={styles.detail}>
                  <Calendar size={16} />
                  <span>Доступен с {formatDate(item.availableFrom)}</span>
                </div>
                <div className={styles.detail}>
                  <Clock size={16} />
                  <span>Минимальный срок: {item.minRentalDays || 1} день</span>
                </div>
                <div className={styles.detail}>
                  <DollarSign size={16} />
                  <span>Залог: {formatCurrency(item.deposit || 0)}</span>
                </div>
                <div className={styles.detail}>
                  <Shield size={16} />
                  <span>Страховка включена</span>
                </div>
              </div>
            </Card>

            {/* Информация о владельце */}
            <Card className={styles.ownerCard}>
              <h3>Владелец</h3>
              <div className={styles.ownerInfo}>
                <div className={styles.ownerAvatar}>
                  {item.owner?.avatar ? (
                    <img src={item.owner.avatar} alt={item.owner.name} />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className={styles.ownerDetails}>
                  <div className={styles.ownerName}>{item.owner?.name}</div>
                  <div className={styles.ownerStats}>
                    <span>⭐ {item.owner?.rating || 'Нет рейтинга'}</span>
                    <span>📦 {item.owner?.itemsCount || 0} товаров</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => navigate(`/users/${item.owner?.id}`)}
                >
                  Профиль
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Модальное окно аренды */}
        <Modal
          isOpen={isRentalModalOpen}
          onClose={() => setIsRentalModalOpen(false)}
          title="Подтверждение аренды"
        >
          <div className={styles.rentalModal}>
            <div className={styles.rentalSummary}>
              <h4>{item.title}</h4>
              <div className={styles.summaryDetails}>
                <div>Период: {rentalDates.startDate} - {rentalDates.endDate}</div>
                <div>Цена за день: {formatCurrency(item.pricePerDay)}</div>
                <div className={styles.totalPrice}>
                  Итого: {formatCurrency(
                    Math.ceil((new Date(rentalDates.endDate) - new Date(rentalDates.startDate)) / (1000 * 60 * 60 * 24)) * item.pricePerDay
                  )}
                </div>
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <Button
                variant="outline"
                onClick={() => setIsRentalModalOpen(false)}
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleRentalSubmit}
              >
                Подтвердить
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default ItemDetail