import React from 'react'
import { Link } from 'react-router-dom'
import { Github, Twitter, Mail, Shield } from 'lucide-react'
import styles from './Footer.module.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    platform: [
      { name: 'О платформе', href: '/about' },
      { name: 'Как это работает', href: '/how-it-works' },
      { name: 'Безопасность', href: '/security' },
      { name: 'Комиссии', href: '/fees' }
    ],
    support: [
      { name: 'Центр помощи', href: '/help' },
      { name: 'Связаться с нами', href: '/contact' },
      { name: 'Сообщить о проблеме', href: '/report' },
      { name: 'Статус системы', href: '/status' }
    ],
    legal: [
      { name: 'Пользовательское соглашение', href: '/terms' },
      { name: 'Политика конфиденциальности', href: '/privacy' },
      { name: 'Правила платформы', href: '/rules' },
      { name: 'Документы API', href: '/api-docs' }
    ]
  }

  const socialLinks = [
    { name: 'GitHub', href: '#', icon: <Github size={20} /> },
    { name: 'Twitter', href: '#', icon: <Twitter size={20} /> },
    { name: 'Email', href: 'mailto:support@rentchain.com', icon: <Mail size={20} /> }
  ]

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerContent}>
          {/* Логотип и описание */}
          <div className={styles.footerBrand}>
            <Link to="/" className={styles.logo}>
              <div className={styles.logoIcon}>
                <Shield size={24} />
              </div>
              <span className={styles.logoText}>RentChain</span>
            </Link>
            <p className={styles.brandDescription}>
              Безопасная платформа для аренды товаров с использованием блокчейн технологий. 
              Прозрачные сделки, автоматические контракты, полная защита.
            </p>
            <div className={styles.socialLinks}>
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className={styles.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.name}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Ссылки */}
          <div className={styles.footerLinks}>
            <div className={styles.linkGroup}>
              <h3 className={styles.linkGroupTitle}>Платформа</h3>
              <ul className={styles.linkList}>
                {footerLinks.platform.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} className={styles.link}>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.linkGroup}>
              <h3 className={styles.linkGroupTitle}>Поддержка</h3>
              <ul className={styles.linkList}>
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} className={styles.link}>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.linkGroup}>
              <h3 className={styles.linkGroupTitle}>Правовая информация</h3>
              <ul className={styles.linkList}>
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} className={styles.link}>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Нижняя часть */}
        <div className={styles.footerBottom}>
          <div className={styles.copyright}>
            <p>© {currentYear} RentChain. Все права защищены.</p>
          </div>
          <div className={styles.footerMeta}>
            <span className={styles.version}>v1.0.0</span>
            <span className={styles.network}>Sepolia Testnet</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer