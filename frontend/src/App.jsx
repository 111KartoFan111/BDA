import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Web3Provider } from './context/Web3Context'
import { ThemeProvider } from './context/ThemeContext'
import Header from './components/Layout/Header/Header'
import Footer from './components/Layout/Footer/Footer'
import Home from './pages/Home/Home'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Profile from './pages/Profile/Profile'
import ItemsList from './pages/Items/ItemsList'
import ItemDetail from './pages/Items/ItemDetail'
import CreateItem from './pages/Items/CreateItem'
import ContractsList from './pages/Contracts/ContractsList'
import ContractDetail from './pages/Contracts/ContractDetail'
import Analytics from './pages/Analytics/Analytics'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Web3Provider>
          <div className="app">
            <Header />
            <main className="main-content">
              <Routes>
                {/* Публичные маршруты */}
                <Route path="/" element={<Home />} />
                <Route path="/items" element={<ItemsList />} />
                <Route path="/items/:id" element={<ItemDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Защищённые маршруты */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
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
                <Route path="/analytics" element={
                  <ProtectedRoute requiredRole="admin">
                    <Analytics />
                  </ProtectedRoute>
                } />
                
                {/* Перенаправление на главную для неизвестных маршрутов */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Web3Provider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App