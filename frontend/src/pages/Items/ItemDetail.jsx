// frontend/src/pages/Items/ItemDetail.jsx - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
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
  DollarSign,
  FileText
} from 'lucide-react'
import { itemsAPI } from '../../services/api/items'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import Button from '../../components/UI/Button/Button'
import Card from '../../components/UI/Card/Card'
import Loader from '../../components/UI/Loader/Loader'
import Modal from '../../components/UI/Modal/Modal'
import { formatCurrency, formatDate } from '../../services/utils/formatting'
import toast from 'react-hot-toast'
import styles from './Items.module.css'

// Утилиты для работы с датами
const formatDateForAPI = (dateString, endOfDay = false) => {
  if (!dateString) return null
  
  try {
    // Создаем дату в UTC
    const date = new Date(dateString + 'T' + (endOfDay ? '23:59:59' : '00:00:00') + '.000Z')
    return date.toISOString()
  } catch (error) {
    console.error('Error formatting date:', error)
    return null
  }
}

const getDaysDifference = (startDate, endDate) => {
  if (!startDate || !endDate) return 0
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
  
  const diffTime = Math.abs(end - start)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const getTodayString = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

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
    data: response, 
    loading, 
    error 
  } = useApi(() => itemsAPI.getItem(id), [id])

  // Извлекаем данные товара из ответа API
  const item = response?.data?.data || response?.data || null

  console.log('API Response:', response)
  console.log('Extracted Item:', item)

  const { 
    data: similarResponse 
  } = useApi(() => itemsAPI.getSimilarItems(id), [id], { immediate: false })

  const similarItems = similarResponse?.data?.data || similarResponse?.data || []

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

  const handleCreateContract = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    // Переходим на страницу создания контракта с предзаполненными данными
    navigate('/contracts/create', {
      state: {
        contractData: {
          itemId: item.id,
          startDate: rentalDates.startDate,
          endDate: rentalDates.endDate
        }
      }
    })
  }

  const handleRentalSubmit = async () => {
    try {
      // Проверяем валидность дат
      if (!rentalDates.startDate || !rentalDates.endDate) {
        toast.error('Выберите даты аренды')
        return
      }

      // Проверяем что дата окончания после даты начала
      if (new Date(rentalDates.endDate) <= new Date(rentalDates.startDate)) {
        toast.error('Дата окончания должна быть позже даты начала')
        return
      }

      // Используем утилиту для подсчета дней
      const totalDays = getDaysDifference(rentalDates.startDate, rentalDates.endDate)
      const totalPrice = totalDays * parseFloat(item.price_per_day)

      // Преобразуем даты в ISO формат для бэкенда
      const startDate = formatDateForAPI(rentalDates.startDate, false)
      const endDate = formatDateForAPI(rentalDates.endDate, true)

      console.log('Отправляем запрос на аренду:', {
        startDate,
        endDate,
        totalPrice,
        totalDays,
        originalDates: rentalDates,
        itemId: id
      })

      const requestData = {
        start_date: startDate,
        end_date: endDate,
        total_price: totalPrice,
        message: 'Запрос на аренду через карточку товара'
      }

      console.log('Данные запроса (без item_id):', requestData)

      await itemsAPI.createRentalRequest(id, requestData)

      setIsRentalModalOpen(false)
      // Очищаем даты после успешного запроса
      setRentalDates({ startDate: '', endDate: '' })
      toast.success('Запрос на аренду успешно отправлен!')
    } catch (error) {
      console.error('Ошибка создания запроса на аренду:', error)
      
      // Детальная обработка ошибок валидации
      let errorMessage = 'Ошибка при отправке запроса на аренду'
      
      if (error.response?.status === 422 && error.response?.data?.details) {
        const validationErrors = error.response.data.details
        if (Array.isArray(validationErrors)) {
          const errorMessages = validationErrors.map(err => {
            const field = err.loc?.slice(-1)[0] || 'поле'
            const fieldTranslations = {
              'start_date': 'Дата начала',
              'end_date': 'Дата окончания',
              'total_price': 'Общая стоимость',
              'message': 'Сообщение'
            }
            
            let message = err.msg
            if (message.includes('Field required')) {
              message = 'Обязательное поле'
            } else if (message.includes('Input should be a valid datetime')) {
              message = 'Неверный формат даты'
            }
            
            const fieldName = fieldTranslations[field] || field
            return `${fieldName}: ${message}`
          })
          errorMessage = errorMessages.join('\n')
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
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
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Ссылка скопирована в буфер обмена')
      } catch (error) {
        console.error('Error copying to clipboard:', error)
      }
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
  const canRent = !isOwner && item.is_available && isAuthenticated

  // Вычисляем итоговую стоимость для отображения
  const totalDays = getDaysDifference(rentalDates.startDate, rentalDates.endDate)
  const totalPrice = totalDays > 0 ? totalDays * parseFloat(item.price_per_day || 0) : 0

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
                src={item.images?.[currentImageIndex] ? 
                  `http://localhost:8000${item.images[currentImageIndex]}` : 
                  '/placeholder-image.jpg'
                }
                alt={item.title}
                className={styles.image}
              />
              {!item.is_available && (
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
                    <img 
                      src={`http://localhost:8000${image}`} 
                      alt={`${item.title} ${index + 1}`} 
                    />
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
                  <span className={styles.category}>{item.category?.name}</span>
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
                  {formatCurrency(item.price_per_day)}
                  <span className={styles.period}>/день</span>
                </div>
                {item.rating && (
                  <div className={styles.rating}>
                    <Star size={16} fill="currentColor" />
                    <span>{item.rating.toFixed(1)}</span>
                    <span className={styles.reviewsCount}>
                      ({item.total_reviews} отзывов)
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
                        min={getTodayString()}
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
                        min={rentalDates.startDate || getTodayString()}
                      />
                    </div>
                  </div>

                  {/* Показываем предварительную стоимость */}
                  {totalDays > 0 && (
                    <div className={styles.pricePreview}>
                      <span>Продолжительность: {totalDays} дн.</span>
                      <span>Итого: {formatCurrency(totalPrice)}</span>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleRentalRequest}
                    disabled={!rentalDates.startDate || !rentalDates.endDate}
                  >
                    Запросить аренду
                  </Button>

                  {/* Кнопка создания контракта */}
                  <Button
                    variant="outline"
                    size="large"
                    fullWidth
                    onClick={handleCreateContract}
                    disabled={!rentalDates.startDate || !rentalDates.endDate}
                    icon={<FileText size={16} />}
                  >
                    Создать контракт аренды
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
                  
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => navigate('/contracts/create', {
                      state: { contractData: { itemId: item.id } }
                    })}
                    icon={<FileText size={16} />}
                  >
                    Создать предложение аренды
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
                  <span>Доступен с {formatDate(item.available_from)}</span>
                </div>
                <div className={styles.detail}>
                  <Clock size={16} />
                  <span>Минимальный срок: {item.min_rental_days || 1} день</span>
                </div>
                <div className={styles.detail}>
                  <DollarSign size={16} />
                  <span>Залог: {formatCurrency(item.deposit || 0)}</span>
                </div>
                <div className={styles.detail}>
                  <Shield size={16} />
                  <span>Состояние: {item.condition}</span>
                </div>
                {item.brand && (
                  <div className={styles.detail}>
                    <span>Бренд: {item.brand}</span>
                  </div>
                )}
                {item.model && (
                  <div className={styles.detail}>
                    <span>Модель: {item.model}</span>
                  </div>
                )}
                {item.year && (
                  <div className={styles.detail}>
                    <span>Год: {item.year}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Информация о владельце */}
            <Card className={styles.ownerCard}>
              <h3>Владелец</h3>
              <div className={styles.ownerInfo}>
                <div className={styles.ownerAvatar}>
                  {item.owner?.avatar ? (
                    <img 
                      src={`http://localhost:8000${item.owner.avatar}`} 
                      alt={`${item.owner.first_name} ${item.owner.last_name}`} 
                    />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className={styles.ownerDetails}>
                  <div className={styles.ownerName}>
                    {item.owner?.first_name} {item.owner?.last_name}
                  </div>
                  <div className={styles.ownerStats}>
                    <span>⭐ {item.owner?.rating || 'Нет рейтинга'}</span>
                    <span>✅ {item.owner?.is_verified ? 'Верифицирован' : 'Не верифицирован'}</span>
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
          title="Подтверждение запроса на аренду"
        >
          <div className={styles.rentalModal}>
            <div className={styles.rentalSummary}>
              <h4>{item.title}</h4>
              <div className={styles.summaryDetails}>
                <div>Период: {rentalDates.startDate} - {rentalDates.endDate}</div>
                <div>Количество дней: {totalDays}</div>
                <div>Цена за день: {formatCurrency(item.price_per_day)}</div>
                <div className={styles.totalPrice}>
                  Итого: {formatCurrency(totalPrice)}
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
                Отправить запрос
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default ItemDetail