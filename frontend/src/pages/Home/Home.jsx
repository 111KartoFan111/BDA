import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Zap, Globe, TrendingUp, Users, Star } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { itemsAPI } from '../../services/api/items'
import Button from '../../components/UI/Button/Button'
import ItemCard from '../../components/Features/ItemCard/ItemCard'
import styles from './Home.module.css'

const Home = () => {
  const { isAuthenticated } = useAuth()
  const [featuredItems, setFeaturedItems] = useState([])
  const [stats, setStats] = useState({
    totalItems: 0,
    totalUsers: 0,
    totalContracts: 0,
    averageRating: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true)
        
        // Загрузка рекомендуемых товаров
        const itemsResponse = await itemsAPI.getFeaturedItems()
        setFeaturedItems(itemsResponse.data.items || [])
        
        // Загрузка статистики
        const statsResponse = await itemsAPI.getStats()
        setStats(statsResponse.data || {})
      } catch (error) {
        console.error('Error loading home data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHomeData()
  }, [])

  const features = [
    {
      icon: <Shield size={24} />,
      title: 'Безопасные смарт-контракты',
      description: 'Автоматическое исполнение договоров аренды через блокчейн обеспечивает полную безопасность сделок'
    },
    {
      icon: <Zap size={24} />,
      title: 'Мгновенные транзакции',
      description: 'Быстрое подтверждение сделок и автоматические выплаты без посредников'
    },
    {
      icon: <Globe size={24} />,
      title: 'Децентрализованная платформа',
      description: 'Прозрачность и открытость всех операций благодаря технологии блокчейн'
    }
  ]

  return (
    <div className={styles.home}>
      {/* Главный баннер */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                Аренда товаров <br />
                <span className={styles.highlight}>нового поколения</span>
              </h1>
              <p className={styles.heroDescription}>
                Безопасная платформа для аренды товаров с использованием смарт-контрактов. 
                Арендуйте и сдавайте в аренду любые вещи с гарантией блокчейна.
              </p>
              <div className={styles.heroActions}>
                {isAuthenticated ? (
                  <>
                    <Button
                      variant="primary"
                      size="large"
                      onClick={() => window.location.href = '/items/create'}
                      icon={<ArrowRight size={20} />}
                    >
                      Разместить товар
                    </Button>
                    <Button
                      variant="outline"
                      size="large"
                      onClick={() => window.location.href = '/items'}
                    >
                      Найти товар
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="large"
                      onClick={() => window.location.href = '/register'}
                      icon={<ArrowRight size={20} />}
                    >
                      Начать сейчас
                    </Button>
                    <Button
                      variant="outline"
                      size="large"
                      onClick={() => window.location.href = '/items'}
                    >
                      Просмотреть товары
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className={styles.heroImage}>
              <div className={styles.heroCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Смарт-контракт аренды</div>
                  <div className={styles.cardStatus}>Активен</div>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardItem}>
                    <span>Товар:</span>
                    <span>iPhone 15 Pro</span>
                  </div>
                  <div className={styles.cardItem}>
                    <span>Срок:</span>
                    <span>7 дней</span>
                  </div>
                  <div className={styles.cardItem}>
                    <span>Стоимость:</span>
                    <span>0.1 ETH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Статистика */}
      <section className={styles.stats}>
        <div className="container">
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <TrendingUp size={24} />
              </div>
              <div className={styles.statValue}>{stats.totalItems || 0}</div>
              <div className={styles.statLabel}>Товаров в каталоге</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <Users size={24} />
              </div>
              <div className={styles.statValue}>{stats.totalUsers || 0}</div>
              <div className={styles.statLabel}>Активных пользователей</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <Shield size={24} />
              </div>
              <div className={styles.statValue}>{stats.totalContracts || 0}</div>
              <div className={styles.statLabel}>Выполненных контрактов</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <Star size={24} />
              </div>
              <div className={styles.statValue}>{stats.averageRating || 4.8}</div>
              <div className={styles.statLabel}>Средний рейтинг</div>
            </div>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className={styles.features}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Почему выбирают RentChain</h2>
            <p className={styles.sectionDescription}>
              Современные технологии для безопасной и удобной аренды
            </p>
          </div>
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  {feature.icon}
                </div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Популярные товары */}
      {featuredItems.length > 0 && (
        <section className={styles.featured}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Популярные товары</h2>
              <Link to="/items" className={styles.sectionLink}>
                Смотреть все <ArrowRight size={16} />
              </Link>
            </div>
            
            {loading ? (
              <div className={styles.loadingGrid}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={styles.skeletonCard} />
                ))}
              </div>
            ) : (
              <div className={styles.itemsGrid}>
                {featuredItems.slice(0, 4).map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Призыв к действию */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>
              Готовы начать зарабатывать на аренде?
            </h2>
            <p className={styles.ctaDescription}>
              Присоединяйтесь к тысячам пользователей, которые уже зарабатывают 
              на платформе RentChain
            </p>
            <div className={styles.ctaActions}>
              {isAuthenticated ? (
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => window.location.href = '/items/create'}
                >
                  Разместить первый товар
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => window.location.href = '/register'}
                >
                  Зарегистрироваться бесплатно
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home