import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  User, 
  MapPin, 
  Calendar, 
  Star, 
  Package, 
  Award,
  MessageCircle,
  Flag,
  Shield
} from 'lucide-react'
import { usersAPI } from '../../../services/api/users'
import { useAuth } from '../../../context/AuthContext'
import { useApi } from '../../../hooks/useApi'
import Button from '../../UI/Button/Button'
import Card from '../../UI/Card/Card'
import Loader from '../../UI/Loader/Loader'
import ItemCard from '../ItemCard/ItemCard'
import { formatDate, formatUserName, generateInitials } from '../../../services/utils/formatting'
import styles from './UserProfile.module.css'

const UserProfile = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, isAuthenticated } = useAuth()
  
  const [activeTab, setActiveTab] = useState('items')
  const [isFollowing, setIsFollowing] = useState(false)

  const { 
    data: user, 
    loading: userLoading, 
    error: userError 
  } = useApi(() => usersAPI.getUser(userId), [userId])

  const { 
    data: userItems, 
    loading: itemsLoading 
  } = useApi(() => usersAPI.getUserItems(userId), [userId])

  const { 
    data: userStats 
  } = useApi(() => usersAPI.getUserStats(userId), [userId])

  const { 
    data: userReviews, 
    loading: reviewsLoading 
  } = useApi(() => usersAPI.getUserReviews(userId), [userId])

  useEffect(() => {
    if (user && currentUser) {
      // Проверяем, подписаны ли мы на этого пользователя
      setIsFollowing(user.isFollowing || false)
    }
  }, [user, currentUser])

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    try {
      if (isFollowing) {
        await usersAPI.unfollowUser(userId)
      } else {
        await usersAPI.followUser(userId)
      }
      setIsFollowing(!isFollowing)
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const handleReportUser = async () => {
    // TODO: Implement report functionality
    console.log('Report user:', userId)
  }

  const handleMessageUser = () => {
    // TODO: Implement messaging functionality
    console.log('Message user:', userId)
  }

  if (userLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size="large" text="Загрузка профиля..." />
      </div>
    )
  }

  if (userError || !user) {
    return (
      <div className={styles.errorContainer}>
        <h2>Пользователь не найден</h2>
        <p>Запрашиваемый пользователь не существует или был удален.</p>
        <Button onClick={() => navigate(-1)}>
          Назад
        </Button>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === user.id
  const stats = userStats || {}

  const tabs = [
    { id: 'items', label: 'Товары', count: stats.itemsCount || 0 },
    { id: 'reviews', label: 'Отзывы', count: stats.reviewsCount || 0 }
  ]

  return (
    <div className={styles.userProfile}>
      <div className="container">
        {/* Заголовок профиля */}
        <Card className={styles.profileHeader}>
          <div className={styles.profileInfo}>
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>
                {user.avatar ? (
                  <img src={user.avatar} alt={formatUserName(user)} />
                ) : (
                  <span className={styles.initials}>
                    {generateInitials(user)}
                  </span>
                )}
              </div>
              
              {user.isVerified && (
                <div className={styles.verifiedBadge} title="Верифицированный пользователь">
                  <Shield size={16} />
                </div>
              )}
            </div>

            <div className={styles.userDetails}>
              <h1 className={styles.userName}>{formatUserName(user)}</h1>
              
              {user.bio && (
                <p className={styles.userBio}>{user.bio}</p>
              )}

              <div className={styles.userMeta}>
                {user.location && (
                  <div className={styles.metaItem}>
                    <MapPin size={16} />
                    <span>{user.location}</span>
                  </div>
                )}
                
                <div className={styles.metaItem}>
                  <Calendar size={16} />
                  <span>На платформе с {formatDate(user.createdAt, 'MMMM yyyy')}</span>
                </div>

                {user.rating && (
                  <div className={styles.metaItem}>
                    <Star size={16} />
                    <span>{user.rating.toFixed(1)}/5 ({stats.reviewsCount || 0} отзывов)</span>
                  </div>
                )}
              </div>
            </div>

            {!isOwnProfile && isAuthenticated && (
              <div className={styles.profileActions}>
                <Button
                  variant={isFollowing ? 'outline' : 'primary'}
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? 'Отписаться' : 'Подписаться'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleMessageUser}
                  icon={<MessageCircle size={16} />}
                >
                  Написать
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={handleReportUser}
                  icon={<Flag size={16} />}
                  title="Пожаловаться"
                />
              </div>
            )}
          </div>

          {/* Статистика */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{stats.itemsCount || 0}</div>
              <div className={styles.statLabel}>Товаров</div>
            </div>
            
            <div className={styles.statItem}>
              <div className={styles.statValue}>{stats.completedDeals || 0}</div>
              <div className={styles.statLabel}>Сделок</div>
            </div>
            
            <div className={styles.statItem}>
              <div className={styles.statValue}>{stats.followersCount || 0}</div>
              <div className={styles.statLabel}>Подписчиков</div>
            </div>
            
            <div className={styles.statItem}>
              <div className={styles.statValue}>{stats.followingCount || 0}</div>
              <div className={styles.statLabel}>Подписок</div>
            </div>
          </div>
        </Card>

        {/* Вкладки */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={styles.tabCount}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Контент вкладок */}
        <div className={styles.tabContent}>
          {activeTab === 'items' && (
            <div className={styles.itemsTab}>
              {itemsLoading ? (
                <div className={styles.loadingContainer}>
                  <Loader text="Загрузка товаров..." />
                </div>
              ) : userItems && userItems.length > 0 ? (
                <div className={styles.itemsGrid}>
                  {userItems.map(item => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Package size={48} />
                  <h3>Нет товаров</h3>
                  <p>
                    {isOwnProfile 
                      ? 'Вы еще не добавили ни одного товара'
                      : 'Пользователь пока не добавил товары'
                    }
                  </p>
                  {isOwnProfile && (
                    <Button
                      variant="primary"
                      onClick={() => navigate('/items/create')}
                    >
                      Добавить товар
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className={styles.reviewsTab}>
              {reviewsLoading ? (
                <div className={styles.loadingContainer}>
                  <Loader text="Загрузка отзывов..." />
                </div>
              ) : userReviews && userReviews.length > 0 ? (
                <div className={styles.reviewsList}>
                  {userReviews.map(review => (
                    <Card key={review.id} className={styles.reviewCard}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewAuthor}>
                          <div className={styles.reviewAvatar}>
                            {review.author.avatar ? (
                              <img src={review.author.avatar} alt={review.author.name} />
                            ) : (
                              <User size={20} />
                            )}
                          </div>
                          <div>
                            <div className={styles.reviewAuthorName}>
                              {formatUserName(review.author)}
                            </div>
                            <div className={styles.reviewDate}>
                              {formatDate(review.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        <div className={styles.reviewRating}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={i < review.rating ? styles.starFilled : styles.starEmpty}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {review.comment && (
                        <p className={styles.reviewComment}>{review.comment}</p>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Award size={48} />
                  <h3>Нет отзывов</h3>
                  <p>
                    {isOwnProfile 
                      ? 'У вас пока нет отзывов'
                      : 'Об этом пользователе пока нет отзывов'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfile