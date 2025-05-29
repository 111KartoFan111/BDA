import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  // Показываем загрузку пока проверяем аутентификацию
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Если пользователь не аутентифицирован
  if (!isAuthenticated) {
    toast.error('Необходима авторизация для доступа к админ-панели')
    return <Navigate to="/login" replace />
  }

  // Если пользователь не является администратором
  if (user?.role !== 'admin') {
    toast.error('Недостаточно прав для доступа к админ-панели')
    return <Navigate to="/" replace />
  }

  // Если все проверки пройдены, показываем компонент
  return children
}

export default AdminRoute