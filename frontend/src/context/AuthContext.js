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
        dispatch({
          type: authActions.LOGIN_SUCCESS,
          payload: {
            user: response.data.user,
            token: token
          }
        })
      } catch (error) {
        localStorage.removeItem('token')
        dispatch({ type: authActions.LOGOUT })
        console.error('Auth check failed:', error)
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
      const { user, token } = response.data

      localStorage.setItem('token', token)
      
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: { user, token }
      })

      toast.success(`Добро пожаловать, ${user.firstName}!`)
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка входа'
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
      const { user, token } = response.data

      localStorage.setItem('token', token)
      
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: { user, token }
      })

      toast.success('Регистрация прошла успешно!')
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка регистрации'
      dispatch({ type: authActions.SET_ERROR, payload: errorMessage })
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Функция выхода
  const logout = () => {
    localStorage.removeItem('token')
    dispatch({ type: authActions.LOGOUT })
    toast.success('Вы вышли из системы')
  }

  // Функция обновления профиля
  const updateProfile = async (userData) => {
    try {
      const response = await authAPI.updateProfile(userData)
      dispatch({
        type: authActions.UPDATE_USER,
        payload: response.data.user
      })
      toast.success('Профиль обновлён')
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка обновления профиля'
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