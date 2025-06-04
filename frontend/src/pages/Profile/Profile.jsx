import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Calendar, Edit, Camera, Save, X, TrendingUp, Package, Star, DollarSign } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWeb3 } from '../../context/Web3Context'
import { useApi } from '../../hooks/useApi'
import { usersAPI } from '../../services/api/users'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import Card from '../../components/UI/Card/Card'
import Modal from '../../components/UI/Modal/Modal'
import { formatDate, formatWalletAddress } from '../../services/utils/formatting'
import styles from './Profile.module.css'

const Profile = () => {
  const { user, updateProfile, isLoading } = useAuth()
  const { account, isConnected, connectWallet, balance } = useWeb3()
  
  const [isEditing, setIsEditing] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    location: ''
  })
  const [errors, setErrors] = useState({})

  // Загрузка статистики пользователя
  const { 
    data: statsResponse, 
    loading: statsLoading, 
    error: statsError, 
    refresh: refreshStats 
  } = useApi(
    usersAPI.getCurrentUserStats,
    [],
    { 
      immediate: !!user,
      defaultValue: {
        data: {
          total_items: 0,
          active_items: 0,
          total_contracts: 0,
          active_contracts: 0,
          completed_contracts: 0,
          total_earnings: 0.0,
          average_rating: null,
          total_reviews: 0
        }
      }
    }
  )

  // Извлекаем данные из ответа API
  const userStats = statsResponse?.data || {
    total_items: 0,
    active_items: 0,
    total_contracts: 0,
    active_contracts: 0,
    completed_contracts: 0,
    total_earnings: 0.0,
    average_rating: null,
    total_reviews: 0
  }

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || ''
      })
    }
  }, [user])

  // Обновляем статистику при изменении пользователя
  useEffect(() => {
    if (user) {
      refreshStats()
    }
  }, [user, refreshStats])

  // Отладочная информация
  useEffect(() => {
    console.log('Stats Response:', statsResponse)
    console.log('User Stats:', userStats)
  }, [statsResponse, userStats])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Имя обязательно'
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Фамилия обязательна'
    }
    
    if (!formData.email) {
      newErrors.email = 'Email обязателен'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный email'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return
    
    const result = await updateProfile(formData)
    if (result.success) {
      setIsEditing(false)
      // Обновляем статистику после сохранения профиля
      refreshStats()
    }
  }

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      bio: user.bio || '',
      location: user.location || ''
    })
    setIsEditing(false)
    setErrors({})
  }

  const handleAvatarUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Здесь будет логика загрузки аватара
      console.log('Uploading avatar:', file)
      setIsAvatarModalOpen(false)
    }
  }

  // Формируем статистику для отображения
  const stats = [
    { 
      label: 'Всего товаров', 
      value: userStats?.total_items || 0,
      icon: <Package size={20} />,
      color: '#3b82f6'
    },
    { 
      label: 'Активных товаров', 
      value: userStats?.active_items || 0,
      icon: <TrendingUp size={20} />,
      color: '#10b981'
    },
    { 
      label: 'Завершено сделок', 
      value: userStats?.completed_contracts || 0,
      icon: <DollarSign size={20} />,
      color: '#f59e0b'
    },
    { 
      label: 'Рейтинг', 
      value: userStats?.average_rating ? `${userStats.average_rating.toFixed(1)}/5` : 'Нет оценок',
      icon: <Star size={20} />,
      color: '#ef4444',
      subtitle: userStats?.total_reviews ? `${userStats.total_reviews} отзывов` : null
    },
    { 
      label: 'Общий доход', 
      value: `${userStats?.total_earnings || 0} ETH`,
      icon: <DollarSign size={20} />,
      color: '#8b5cf6'
    },
    { 
      label: 'На платформе с', 
      value: user?.created_at ? formatDate(user.created_at, 'MMMM yyyy') : '',
      icon: <Calendar size={20} />,
      color: '#6b7280'
    }
  ]

  return (
    <div className={styles.profilePage}>
      <div className="container">
        <div className={styles.profileContent}>
          {/* Основная информация */}
          <Card className={styles.mainCard}>
            <div className={styles.profileHeader}>
              <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.first_name} />
                  ) : (
                    <User size={40} />
                  )}
                  <button
                    className={styles.avatarButton}
                    onClick={() => setIsAvatarModalOpen(true)}
                  >
                    <Camera size={16} />
                  </button>
                </div>
                
                <div className={styles.userInfo}>
                  <h1 className={styles.userName}>
                    {user?.first_name} {user?.last_name}
                  </h1>
                  <p className={styles.userRole}>
                    {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                  </p>
                  {user?.bio && <p className={styles.userBio}>{user.bio}</p>}
                </div>
              </div>

              <div className={styles.profileActions}>
                {isEditing ? (
                  <div className={styles.editActions}>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleCancel}
                      icon={<X size={16} />}
                    >
                      Отмена
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={handleSave}
                      loading={isLoading}
                      icon={<Save size={16} />}
                    >
                      Сохранить
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    icon={<Edit size={16} />}
                  >
                    Редактировать
                  </Button>
                )}
              </div>
            </div>

            {/* Форма редактирования */}
            {isEditing ? (
              <div className={styles.editForm}>
                <div className={styles.formRow}>
                  <Input
                    label="Имя"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    error={errors.firstName}
                    icon={<User size={18} />}
                  />
                  <Input
                    label="Фамилия"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    error={errors.lastName}
                    icon={<User size={18} />}
                  />
                </div>
                
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  icon={<Mail size={18} />}
                />
                
                <Input
                  label="Телефон"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  error={errors.phone}
                  icon={<Phone size={18} />}
                />
                
                <Input
                  label="Местоположение"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  icon={<MapPin size={18} />}
                />
                
                <div className={styles.textareaGroup}>
                  <label className={styles.textareaLabel}>О себе</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Расскажите немного о себе..."
                    className={styles.textarea}
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              /* Отображение информации */
              <div className={styles.profileInfo}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <Mail size={16} />
                    <span>{user?.email}</span>
                  </div>
                  {user?.phone && (
                    <div className={styles.infoItem}>
                      <Phone size={16} />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user?.location && (
                    <div className={styles.infoItem}>
                      <MapPin size={16} />
                      <span>{user.location}</span>
                    </div>
                  )}
                  <div className={styles.infoItem}>
                    <Calendar size={16} />
                    <span>Регистрация: {formatDate(user?.created_at)}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Web3 кошелек */}
          <Card className={styles.walletCard}>
            <h2 className={styles.cardTitle}>Web3 кошелек</h2>
            {isConnected ? (
              <div className={styles.walletInfo}>
                <div className={styles.walletDetail}>
                  <span className={styles.walletLabel}>Адрес:</span>
                  <span className={styles.walletValue}>
                    {formatWalletAddress(account)}
                  </span>
                </div>
                <div className={styles.walletDetail}>
                  <span className={styles.walletLabel}>Баланс:</span>
                  <span className={styles.walletValue}>{balance} ETH</span>
                </div>
                <div className={styles.walletStatus}>
                  <span className={styles.statusIndicator} />
                  Подключен к Sepolia Testnet
                </div>
              </div>
            ) : (
              <div className={styles.walletDisconnected}>
                <p className={styles.walletMessage}>
                  Подключите Web3 кошелек для работы со смарт-контрактами
                </p>
                <Button className={styles.walletButton} variant="primary" onClick={connectWallet}>
                  Подключить кошелек
                </Button>
              </div>
            )}
          </Card>

          {/* Статистика */}
          <Card className={styles.statsCard}>
            <div className={styles.statsHeader}>
              <h2 className={styles.cardTitle}>Статистика</h2>
              <Button 
                variant="ghost" 
                size="small" 
                onClick={refreshStats}
                loading={statsLoading}
              >
                Обновить
              </Button>
            </div>
            
            {statsError ? (
              <div className={styles.statsError}>
                <p>Ошибка загрузки статистики: {statsError}</p>
                <Button variant="outline" size="small" onClick={refreshStats}>
                  Попробовать снова
                </Button>
              </div>
            ) : (
              <div className={styles.statsGrid}>
                {stats.map((stat, index) => (
                  <div key={index} className={styles.statItem}>
                    <div className={styles.statIcon} style={{ color: stat.color }}>
                      {stat.icon}
                    </div>
                    <div className={styles.statContent}>
                      <div className={styles.statLabel}>{stat.label}</div>
                      <div className={styles.statValue}>{stat.value}</div>
                      {stat.subtitle && (
                        <div className={styles.statSubtitle}>{stat.subtitle}</div>
                      )}
                    </div>
                    {statsLoading && (
                      <div className={styles.statLoader}>
                        <div className={styles.skeleton}></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Модальное окно аватара */}
        <Modal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          title="Изменить аватар"
          size="small"
        >
          <div className={styles.avatarModal}>
            <div className={styles.avatarPreview}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Current avatar" />
              ) : (
                <User size={60} />
              )}
            </div>
            
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
              id="avatar-upload"
            />
            
            <div className={styles.avatarActions}>
              <Button
                variant="primary"
                onClick={() => document.getElementById('avatar-upload').click()}
              >
                Выбрать файл
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAvatarModalOpen(false)}
              >
                Отмена
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default Profile