import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Package, FileText, BarChart3, User, PlusCircle } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import styles from './Navigation.module.css'

const Navigation = ({ variant = 'horizontal' }) => {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  const isActivePath = (path) => {
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path))
  }

  const navigationItems = [
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
      public: true
    },
    {
      icon: <FileText size={20} />,
      label: 'Контракты',
      path: '/contracts',
      requireAuth: true
    },
    {
      icon: <BarChart3 size={20} />,
      label: 'Аналитика',
      path: '/analytics',
      adminOnly: true
    },
    { icon: <User size={20} />,
      label: 'Администрирование',
      path: '/admin',
      adminOnly: true
    },
    {
      icon: <User size={20} />,
      label: 'Профиль',
      path: '/profile',
      requireAuth: true
    }
  ]

  const quickActions = [
    {
      icon: <PlusCircle size={18} />,
      label: 'Добавить товар',
      path: '/items/create',
      requireAuth: true,
      primary: true
    }
  ]

  const filteredItems = navigationItems.filter(item => {
    if (item.public) return true
    if (item.adminOnly) return user?.role === 'admin'
    if (item.requireAuth) return isAuthenticated
    return isAuthenticated
  })

  const filteredActions = quickActions.filter(action => {
    if (action.requireAuth) return isAuthenticated
    return true
  })

  return (
    <nav className={`${styles.navigation} ${styles[variant]}`}>
      <div className={styles.navItems}>
        {filteredItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`${styles.navItem} ${
              isActivePath(item.path) ? styles.active : ''
            }`}
            title={item.label}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      {filteredActions.length > 0 && (
        <div className={styles.quickActions}>
          {filteredActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className={`${styles.quickAction} ${
                action.primary ? styles.primary : ''
              }`}
              title={action.label}
            >
              <span className={styles.actionIcon}>{action.icon}</span>
              <span className={styles.actionLabel}>{action.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

export default Navigation