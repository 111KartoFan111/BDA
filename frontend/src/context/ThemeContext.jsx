import React, { createContext, useContext, useReducer, useEffect } from 'react'

const ThemeContext = createContext()

// Начальное состояние
const initialState = {
  theme: localStorage.getItem('theme') || 'light',
  language: localStorage.getItem('language') || 'ru'
}

// Действия
const themeActions = {
  SET_THEME: 'SET_THEME',
  SET_LANGUAGE: 'SET_LANGUAGE',
  TOGGLE_THEME: 'TOGGLE_THEME'
}

// Редьюсер
function themeReducer(state, action) {
  switch (action.type) {
    case themeActions.SET_THEME:
      return {
        ...state,
        theme: action.payload
      }
    
    case themeActions.SET_LANGUAGE:
      return {
        ...state,
        language: action.payload
      }
    
    case themeActions.TOGGLE_THEME:
      return {
        ...state,
        theme: state.theme === 'light' ? 'dark' : 'light'
      }
    
    default:
      return state
  }
}

export function ThemeProvider({ children }) {
  const [state, dispatch] = useReducer(themeReducer, initialState)

  // Применение темы к документу
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
    localStorage.setItem('theme', state.theme)
  }, [state.theme])

  // Применение языка
  useEffect(() => {
    document.documentElement.setAttribute('lang', state.language)
    localStorage.setItem('language', state.language)
  }, [state.language])

  // Функция изменения темы
  const setTheme = (theme) => {
    dispatch({ type: themeActions.SET_THEME, payload: theme })
  }

  // Функция переключения темы
  const toggleTheme = () => {
    dispatch({ type: themeActions.TOGGLE_THEME })
  }

  // Функция изменения языка
  const setLanguage = (language) => {
    dispatch({ type: themeActions.SET_LANGUAGE, payload: language })
  }

  const value = {
    ...state,
    setTheme,
    toggleTheme,
    setLanguage
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}