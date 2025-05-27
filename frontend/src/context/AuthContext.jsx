import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { authAPI } from '../services/api/auth'
import toast from 'react-hot-toast'

const AuthContext = createContext()

// Начальное состояние
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null
}

// Действия
const authActions = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER'
}

// Редьюсер
function authReducer(state, action) {
  switch (action.type) {
    case authActions.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      }
    
    case authActions.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case authActions.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }
    
    case authActions.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      }
    
    case authActions.CLEAR_ERROR:
      return {
        ...state,
        error: null
      }
    
    case authActions.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }
    
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Проверка токена при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      
      if (!token) {
        dispatch({ type: authActions.SET_LOADING, payload: false })
        return
      }

      try {
        const response = await authAPI.getCurrentUser()
        
        // Проверяем структуру ответа от бэкенда
        const userData = response.data.data || response.data
        
        dispatch({
          type: authActions.LOGIN_SUCCESS,
          payload: {
            user: userData,
            token: token
          }
        })
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('token')
        dispatch({ type: authActions.LOGOUT })
      }
    }

    checkAuth()
  }, [])

  // Функция входа
  const login = async (credentials) => {
    dispatch({ type: authActions.SET_LOADING, payload: true })
    dispatch({ type: authActions.CLEAR_ERROR })

    try {
      const response = await authAPI.login(credentials)
      
      // Извлекаем данные из ответа бэкенда
      const responseData = response.data.data || response.data
      const { access_token, user } = responseData

      if (!access_token) {
        throw new Error('Токен не получен от сервера')
      }

      localStorage.setItem('token', access_token)
      
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: { 
          user: user,
          token: access_token 
        }
      })

      toast.success(`Добро пожаловать, ${user.first_name || user.email}!`)
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail || 
                          error.message || 
                          'Ошибка входа'
      dispatch({ type: authActions.SET_ERROR, payload: errorMessage })
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Функция регистрации
  const register = async (userData) => {
    dispatch({ type: authActions.SET_LOADING, payload: true })
    dispatch({ type: authActions.CLEAR_ERROR })

    try {
      const response = await authAPI.register(userData)
      
      // Проверяем, возвращает ли регистрация токен или требует подтверждения email
      const responseData = response.data.data || response.data
      
      if (responseData.access_token) {
        // Если токен возвращается сразу
        localStorage.setItem('token', responseData.access_token)
        
        dispatch({
          type: authActions.LOGIN_SUCCESS,
          payload: { 
            user: responseData.user || responseData,
            token: responseData.access_token 
          }
        })
        
        toast.success('Регистрация прошла успешно!')
      } else {
        // Если требуется подтверждение email
        dispatch({ type: authActions.SET_LOADING, payload: false })
        toast.success('Регистрация прошла успешно! Проверьте email для подтверждения.')
      }
      
      return { success: true }
    } catch (error) {
      console.error('Registration error:', error)
      let errorMessage = 'Ошибка регистрации'
      
      if (error.response?.data?.details) {
        // Обработка ошибок валидации
        const details = error.response.data.details
        if (Array.isArray(details)) {
          errorMessage = details.map(err => err.msg).join(', ')
        } else {
          errorMessage = details.toString()
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      }
      
      dispatch({ type: authActions.SET_ERROR, payload: errorMessage })
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Функция выхода
  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
      // Продолжаем выход даже если запрос не удался
    }
    
    localStorage.removeItem('token')
    dispatch({ type: authActions.LOGOUT })
    toast.success('Вы вышли из системы')
  }

  // Функция обновления профиля
  const updateProfile = async (userData) => {
    try {
      const response = await authAPI.updateProfile(userData)
      const updatedUser = response.data.data || response.data.user || response.data
      
      dispatch({
        type: authActions.UPDATE_USER,
        payload: updatedUser
      })
      toast.success('Профиль обновлён')
      return { success: true }
    } catch (error) {
      console.error('Profile update error:', error)
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail || 
                          'Ошибка обновления профиля'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Очистка ошибок
  const clearError = () => {
    dispatch({ type: authActions.CLEAR_ERROR })
  }

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}