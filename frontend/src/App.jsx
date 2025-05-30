import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { Link } from 'react-router-dom'
import styles from './App.module.css'

// Context Providers
import { AuthProvider } from './context/AuthContext'
import { Web3Provider } from './context/Web3Context'
import { ThemeProvider } from './context/ThemeContext'

import { Github, Twitter, Mail, Shield } from 'lucide-react'

// Layout Components
import Header from './components/Layout/Header/Header'
import Footer from './components/Layout/Footer/Footer'

// Page Components
import Home from './pages/Home/Home'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ItemsList from './pages/Items/ItemsList'
import ItemDetail from './pages/Items/ItemDetail'
import CreateItem from './pages/Items/CreateItem'
import ContractsList from './pages/Contracts/ContractsList'
import ContractDetail from './pages/Contracts/ContractDetail'
import Profile from './pages/Profile/Profile'
import Analytics from './pages/Analytics/Analytics'
import AdminPanel from './pages/Admin/AdminPage'
import MyItems from './pages/Profile/MyItems'

// Protected Route Component
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'

// Styles
import './App.css'

function App() {
  const socialLinks = [
    { name: 'GitHub', href: '#', icon: <Github size={20} /> },
    { name: 'Twitter', href: '#', icon: <Twitter size={20} /> },
    { name: 'Email', href: 'mailto:support@rentchain.com', icon: <Mail size={20} /> }
  ]
  return (
    <ThemeProvider>
      <AuthProvider>
        <Web3Provider>
          <Router>
            <div className="app">
              <Header />
              
              <main className="main-content">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/items" element={<ItemsList />} />
                  <Route path="/items/:id" element={<ItemDetail />} />
                  <Route path='/contact' element={
                    <div style={{ display: 'flex', flexDirection: 'column',gap: '1rem', alignItems: 'center', justifyContent: 'center',textAlign: 'center' }} className='containercontacts'>Контакты
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
                  } />
                  <Route path='/terms' element={
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',textAlign: 'center' }} className='containercontacts'>Пользовательское соглашение
                      <div className={styles.socialLinks}>
                        в разработке
                      </div>
                    </div>
                  } />

                  <Route path='/privacy' element={
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',textAlign: 'center' }} className='containercontacts'>Политика конфиденциальности
                      <div className={styles.socialLinks}>
                        в разработке
                      </div>
                    </div>
                  } />

                  <Route path='/rules' element={
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',textAlign: 'center' }} className='containercontacts'>Правила платформы
                      <div className={styles.socialLinks}>
                        в разработке
                      </div>
                    </div>
                  } />

                  
                  {/* Protected Routes */}
                  <Route path="/items/create" element={
                    <ProtectedRoute>
                      <CreateItem />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/contracts" element={
                    <ProtectedRoute>
                      <ContractsList />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/contracts/:id" element={
                    <ProtectedRoute>
                      <ContractDetail />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />

                  <Route path="/myitems" element={
                    <ProtectedRoute>
                      <MyItems />
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin Routes */}
                  <Route path="/analytics" element={
                    <ProtectedRoute requiredRole="admin">
                      <Analytics />
                      
                    </ProtectedRoute>
                  } />

                  <Route path="/admin" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminPanel />
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch all route - 404 */}
                  <Route path="*" element={
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '50vh',
                      textAlign: 'center'
                    }}>
                      <h1>404 - Страница не найдена</h1>
                      <p>Запрашиваемая страница не существует.</p>
                      <a href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                        Вернуться на главную
                      </a>
                    </div>
                  } />
                </Routes>
              </main>
              
              <Footer />
            </div>
            
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--color-success)',
                    secondary: 'white',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--color-error)',
                    secondary: 'white',
                  },
                },
              }}
            />
          </Router>
        </Web3Provider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App