import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Shield, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  User, 
  LogOut, 
  Settings,
  Wallet,
  PlusCircle
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useWeb3 } from '../../../context/Web3Context'
import { useTheme } from '../../../context/ThemeContext'
import Button from '../../UI/Button/Button'
import { formatWalletAddress } from '../../../services/utils/formatting'
import styles from './Header.module.css'

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const { isConnected, account, balance, connectWallet } = useWeb3()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen)
  }

  const handleLogout = () => {
    logout()
    setIsProfileDropdownOpen(false)
    navigate('/')
  }

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const navigationItems = [
    { path: '/', label: 'Главная', public: true },
    { path: '/items', label: 'Товары', public: true },
    { path: '/contracts', label: 'Контракты', requireAuth: true },
    { path: '/admin', label: 'Управление', adminOnly: true }
  ]

  const filteredNavItems = navigationItems.filter(item => {
    if (item.public) return true
    if (item.adminOnly) return user?.role === 'admin'
    if (item.requireAuth) return isAuthenticated
    return false
  })

  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.headerContent}>
          {/* Логотип */}
          <Link to="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <Shield size={24} />
            </div>
            <span className={styles.logoText}>RentChain</span>
          </Link>

          {/* Навигация для десктопа */}
          <nav className={styles.desktopNav}>
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navLink} ${
                  isActivePath(item.path) ? styles.active : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Правая секция */}
          <div className={styles.rightSection}>
            {/* Переключатель темы */}
            <button
              onClick={toggleTheme}
              className={styles.themeToggle}
              title={`Переключить на ${theme === 'light' ? 'темную' : 'светлую'} тему`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            {/* Аутентификация */}
            {isAuthenticated ? (              
              <div className={styles.profileSection}>
                {/* Кнопка создания товара */}
                <Link to="/items/create">
                  <Button
                    variant="primary"
                    size="small"
                    icon={<PlusCircle size={16} />}
                    className={styles.createButton}
                  >
                    Создать
                  </Button>
                </Link>

              {/* Web3 кошелек */}
              <div className={styles.walletSection}>
                {isConnected ? (
                  <div className={styles.walletInfo}>
                    <div className={styles.walletBalance}>
                      {parseFloat(balance).toFixed(4)} ETH
                    </div>
                    <button className={styles.walletButton}>
                      <Wallet size={16} />
                      {formatWalletAddress(account)}
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="small"
                    onClick={connectWallet}
                    icon={<Wallet size={16} />}
                  >
                    Подключить кошелек
                  </Button>
                )}
              </div>

                {/* Профильное меню */}
                <div className={styles.profileMenu}>
                  <button
                    onClick={toggleProfileDropdown}
                    className={styles.profileButton}
                  >
                    <div className={styles.avatar}>
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.firstName} />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <span className={styles.userName}>
                      {user?.firstName}
                    </span>
                  </button>

                  {/* Выпадающее меню */}
                  {isProfileDropdownOpen && (
                    <div className={styles.profileDropdown}>
                      <Link
                        to="/profile"
                        className={styles.dropdownItem}
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <User size={16} />
                        Профиль
                      </Link>
                      <Link
                        to="/myitems"
                        className={styles.dropdownItem}
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <Settings size={16} />
                        Мои обьявления
                      </Link>
                      <button
                        onClick={handleLogout}
                        className={styles.dropdownItem}
                      >
                        <LogOut size={16} />
                        Выйти
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.authButtons}>
                <Link  to="/login">
                  <Button className={styles.walletButton} variant="outline" size="small">
                    Войти
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className={styles.walletButton} variant="primary" size="small">
                    Регистрация
                  </Button>
                </Link>
              </div>
            )}

            {/* Мобильное меню */}
            <button
              onClick={toggleMobileMenu}
              className={styles.mobileMenuButton}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Мобильная навигация */}
        {isMobileMenuOpen && (
          <div className={styles.mobileNav}>
            <div className={styles.mobileNavContent}>
              {filteredNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.mobileNavLink} ${
                    isActivePath(item.path) ? styles.active : ''
                  }`}
                  onClick={toggleMobileMenu}
                >
                  {item.label}
                </Link>
              ))}

              {isAuthenticated && (
                <>
                  <div className={styles.mobileDivider} />
                  <Link
                    to="/items/create"
                    className={styles.mobileNavLink}
                    onClick={toggleMobileMenu}
                  >
                    <PlusCircle size={16} />
                    Создать товар
                  </Link>
                  <Link
                    to="/profile"
                    className={styles.mobileNavLink}
                    onClick={toggleMobileMenu}
                  >
                    <User size={16} />
                    Профиль
                  </Link>

                  <Link
                    to="/myitems"
                    className={styles.mobileNavLink}
                    onClick={toggleMobileMenu}
                  >
                    <Settings size={16} />
                    Мои обьявления
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      toggleMobileMenu()
                    }}
                    className={styles.mobileNavLink}
                  >
                    <LogOut size={16} />
                    Выйти
                  </button>
                </>
              )}

              {!isAuthenticated && (
                <>
                  <div className={styles.mobileDivider} />
                  <Link
                    to="/login"
                    className={styles.mobileNavLink}
                    onClick={toggleMobileMenu}
                  >
                    Войти
                  </Link>
                  <Link
                    to="/register"
                    className={styles.mobileNavLink}
                    onClick={toggleMobileMenu}
                  >
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header