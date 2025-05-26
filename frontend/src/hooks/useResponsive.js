import { useState, useEffect } from 'react'

// Брейкпоинты
const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200
}

// Хук для отслеживания размера экрана
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  const [deviceType, setDeviceType] = useState('desktop')

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setWindowSize({ width, height })
      
      // Определяем тип устройства
      if (width < breakpoints.mobile) {
        setDeviceType('mobile')
      } else if (width < breakpoints.tablet) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }

    // Вызываем сразу для установки начального значения
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    width: windowSize.width,
    height: windowSize.height,
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isSmallScreen: windowSize.width < breakpoints.tablet,
    isLargeScreen: windowSize.width >= breakpoints.desktop
  }
}

// Хук для медиа-запросов
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event) => setMatches(event.matches)
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      // Для старых браузеров
      mediaQuery.addListener(handler)
      return () => mediaQuery.removeListener(handler)
    }
  }, [query])

  return matches
}

// Хук для определения ориентации устройства
export const useOrientation = () => {
  const [orientation, setOrientation] = useState('portrait')

  useEffect(() => {
    const updateOrientation = () => {
      if (window.innerWidth > window.innerHeight) {
        setOrientation('landscape')
      } else {
        setOrientation('portrait')
      }
    }

    updateOrientation()
    
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)
    
    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  return {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape'
  }
}

// Хук для отслеживания touch устройств
export const useTouch = () => {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      )
    }

    checkTouch()
    
    // Перепроверяем при первом touch событии
    const handleTouch = () => {
      setIsTouch(true)
      window.removeEventListener('touchstart', handleTouch)
    }
    
    window.addEventListener('touchstart', handleTouch)
    
    return () => {
      window.removeEventListener('touchstart', handleTouch)
    }
  }, [])

  return isTouch
}

export default useResponsive