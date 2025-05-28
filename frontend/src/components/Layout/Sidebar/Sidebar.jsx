import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Package, 
  FileText, 
  BarChart3, 
  User, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Star,
  Clock,
  DollarSign
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import styles from './Sidebar.module.css'

const Sidebar = ({ isOpen, onToggle }) => {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState({
    items: false,
    contracts: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const mainMenuItems = [
    {
      icon: <Home size={20} />,
      label: 'Главная',
      path: '/',
      public: true
    },
    {
      icon: <Package size={20} />,
      label: 'Товары',
      path: '/items',
      public: true,
      expandable: true,
      section: 'items',
      subItems: [
        { label: 'Все товары', path: '/items' },
        { label: 'Избранное', path: '/items/favorites', requireAuth: true },
        { label: 'Добавить товар', path: '/items/create', requireAuth: true }
      ]
    },
    {
      icon: <FileText size={20} />,
      label: 'Контракты',
      path: '/contracts',
      requireAuth: true,
      expandable: true,
      section: 'contracts',
      subItems: [
        { label: 'Все контракты', path: '/contracts' },
        { label: 'Активные', path: '/contracts/active' },
        { label: 'Завершенные', path: '/contracts/completed' }
      ]
    },
    {
      icon: <BarChart3 size={20} />,
      label: 'Аналитика',
      path: '/analytics',
      adminOnly: true
    },
    {
      icon: <User size={20} />,
      label: 'Администрирование',
      path: '/admin',
      adminOnly: true
    }

  ]

  const userMenuItems = [
    {
      icon: <User size={20} />,
      label: 'Профиль',
      path: '/profile'
    },
    {
      icon: <Settings size={20} />,
      label: 'Настройки',
      path: '/settings'
    }
  ]

  const quickStats = [
    {
      icon: <Package size={16} />,
      label: 'Мои товары',
      value: user?.itemsCount || 0,
      path: '/items/my'
    },
    {
      icon: <FileText size={16} />,
      label: 'Активные сделки',
      value: user?.activeContracts || 0,
      path: '/contracts/active'
    },
    {
      icon: <Star size={16} />,
      label: 'Рейтинг',
      value: user?.rating ? `${user.rating}/5` : 'Нет',
      path: '/profile'
    },
    {
      icon: <DollarSign size={16} />,
      label: 'Заработано',
      value: user?.totalEarnings ? `${user.totalEarnings} ETH` : '0 ETH',
      path: '/analytics/earnings'
    }
  ]

  const renderMenuItem = (item) => {
    const isActive = isActivePath(item.path)
    const canShow = item.public || 
                   (item.requireAuth && isAuthenticated) || 
                   (item.adminOnly && user?.role === 'admin') ||
                   (!item.requireAuth && !item.adminOnly && !item.public)

    if (!canShow) return null

    return (
      <div key={item.path} className={styles.menuItem}>
        {item.expandable ? (
          <>
            <button
              className={`${styles.menuLink} ${isActive ? styles.active : ''}`}
              onClick={() => toggleSection(item.section)}
            >
              <span className={styles.menuIcon}>{item.icon}</span>
              {isOpen && (
                <>
                  <span className={styles.menuLabel}>{item.label}</span>
                  <span className={styles.expandIcon}>
                    {expandedSections[item.section] ? 
                      <ChevronLeft size={16} /> : 
                      <ChevronRight size={16} />
                    }
                  </span>
                </>
              )}
            </button>
            
            {isOpen && expandedSections[item.section] && (
              <div className={styles.subMenu}>
                {item.subItems.map(subItem => {
                  if (subItem.requireAuth && !isAuthenticated) return null
                  
                  return (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`${styles.subMenuLink} ${
                        isActivePath(subItem.path) ? styles.active : ''
                      }`}
                    >
                      {subItem.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <Link
            to={item.path}
            className={`${styles.menuLink} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.menuIcon}>{item.icon}</span>
            {isOpen && <span className={styles.menuLabel}>{item.label}</span>}
          </Link>
        )}
      </div>
    )
  }

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
      <div className={styles.sidebarContent}>
        {/* Toggle Button */}
        <button 
          className={styles.toggleButton}
          onClick={onToggle}
          title={isOpen ? 'Свернуть меню' : 'Развернуть меню'}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* Main Navigation */}
        <nav className={styles.navigation}>
          <div className={styles.menuSection}>
            {isOpen && <h3 className={styles.sectionTitle}>Навигация</h3>}
            {mainMenuItems.map(renderMenuItem)}
          </div>

          {/* Quick Stats */}
          {isAuthenticated && isOpen && (
            <div className={styles.menuSection}>
              <h3 className={styles.sectionTitle}>Быстрая статистика</h3>
              <div className={styles.quickStats}>
                {quickStats.map((stat, index) => (
                  <Link
                    key={index}
                    to={stat.path}
                    className={styles.statItem}
                  >
                    <span className={styles.statIcon}>{stat.icon}</span>
                    <div className={styles.statContent}>
                      <div className={styles.statValue}>{stat.value}</div>
                      <div className={styles.statLabel}>{stat.label}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* User Menu */}
          {isAuthenticated && (
            <div className={styles.menuSection}>
              {isOpen && <h3 className={styles.sectionTitle}>Аккаунт</h3>}
              {userMenuItems.map(renderMenuItem)}
            </div>
          )}
        </nav>

        {/* Quick Actions */}
        {isAuthenticated && isOpen && (
          <div className={styles.quickActions}>
            <Link to="/items/create" className={styles.quickAction}>
              <Plus size={16} />
              Добавить товар
            </Link>
          </div>
        )}

        {/* User Info */}
        {isAuthenticated && isOpen && (
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.firstName} />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>
                {user?.firstName} {user?.lastName}
              </div>
              <div className={styles.userRole}>
                {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar