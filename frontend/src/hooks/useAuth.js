import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

// Хук уже экспортируется из AuthContext, но можно добавить дополнительную логику
export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

export default useAuth