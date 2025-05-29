import { useState, useEffect } from 'react'
import { adminAPI } from '../services/api/adminApi'
import toast from 'react-hot-toast'

export const useAdmin = () => {
  const [loading, setLoading] = useState(false)
  const [dashboardStats, setDashboardStats] = useState({})
  const [users, setUsers] = useState([])
  const [pendingItems, setPendingItems] = useState([])
  const [contracts, setContracts] = useState([])

  // Загрузка статистики дашборда
  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getDashboard()
      setDashboardStats(response.data.data)
      return response.data.data
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      toast.error('Ошибка загрузки статистики')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Загрузка пользователей
  const fetchUsers = async (params = {}) => {
    try {
      setLoading(true)
      const response = await adminAPI.getUsers(params)
      setUsers(response.data.data)
      return response.data
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Ошибка загрузки пользователей')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Загрузка товаров на модерации
  const fetchPendingItems = async (params = {}) => {
    try {
      setLoading(true)
      const response = await adminAPI.getPendingItems(params)
      setPendingItems(response.data.data)
      return response.data
    } catch (error) {
      console.error('Error fetching pending items:', error)
      toast.error('Ошибка загрузки товаров')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Загрузка контрактов
  const fetchContracts = async (params = {}) => {
    try {
      setLoading(true)
      const response = await adminAPI.getAllContracts(params)
      setContracts(response.data.data)
      return response.data
    } catch (error) {
      console.error('Error fetching contracts:', error)
      toast.error('Ошибка загрузки контрактов')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Управление пользователями
  const verifyUser = async (userId) => {
    try {
      await adminAPI.verifyUser(userId)
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_verified: !user.is_verified } : user
      ))
      toast.success('Статус верификации изменен')
    } catch (error) {
      console.error('Error verifying user:', error)
      toast.error('Ошибка при изменении статуса верификации')
      throw error
    }
  }

  const suspendUser = async (userId, reason, duration_days = null) => {
    try {
      await adminAPI.suspendUser(userId, reason, duration_days)
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: user.status === 'suspended' ? 'active' : 'suspended' } : user
      ))
      toast.success('Статус пользователя изменен')
    } catch (error) {
      console.error('Error suspending user:', error)
      toast.error('Ошибка при изменении статуса пользователя')
      throw error
    }
  }

  // Модерация товаров
  const approveItem = async (itemId) => {
    try {
      await adminAPI.approveItem(itemId)
      setPendingItems(pendingItems.map(item => 
        item.id === itemId ? { ...item, status: 'approved' } : item
      ))
      toast.success('Товар одобрен')
    } catch (error) {
      console.error('Error approving item:', error)
      toast.error('Ошибка при одобрении товара')
      throw error
    }
  }

  const rejectItem = async (itemId, reason) => {
    try {
      await adminAPI.rejectItem(itemId, reason)
      setPendingItems(pendingItems.map(item => 
        item.id === itemId ? { ...item, status: 'rejected' } : item
      ))
      toast.success('Товар отклонен')
    } catch (error) {
      console.error('Error rejecting item:', error)
      toast.error('Ошибка при отклонении товара')
      throw error
    }
  }

  // Работа со спорами
  const resolveDispute = async (disputeId, resolution, compensation_amount = null, compensation_recipient = null) => {
    try {
      await adminAPI.resolveDispute(disputeId, resolution, compensation_amount, compensation_recipient)
      setContracts(contracts.map(contract => 
        contract.id === disputeId ? { ...contract, status: 'completed' } : contract
      ))
      toast.success('Спор разрешен')
    } catch (error) {
      console.error('Error resolving dispute:', error)
      toast.error('Ошибка при разрешении спора')
      throw error
    }
  }

  // Экспорт данных
  const exportData = async (type, params = {}) => {
    try {
      let response
      switch (type) {
        case 'users':
          response = await adminAPI.exportUsersData(params.format || 'csv')
          break
        case 'analytics':
          response = await adminAPI.exportAnalyticsData(
            params.startDate, 
            params.endDate, 
            params.format || 'csv'
          )
          break
        default:
          throw new Error('Неподдерживаемый тип экспорта')
      }

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${type}-export.${params.format || 'csv'}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Данные экспортированы')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Ошибка экспорта данных')
      throw error
    }
  }

  // Системные операции
  const toggleMaintenanceMode = async (enabled, message = null) => {
    try {
      await adminAPI.toggleMaintenanceMode(enabled, message)
      toast.success(`Режим обслуживания ${enabled ? 'включен' : 'отключен'}`)
    } catch (error) {
      console.error('Error toggling maintenance mode:', error)
      toast.error('Ошибка при изменении режима обслуживания')
      throw error
    }
  }

  const clearCache = async (cache_type = 'all') => {
    try {
      await adminAPI.clearCache(cache_type)
      toast.success('Кеш очищен')
    } catch (error) {
      console.error('Error clearing cache:', error)
      toast.error('Ошибка при очистке кеша')
      throw error
    }
  }

  const sendBulkEmail = async (subject, content, user_filter = {}) => {
    try {
      await adminAPI.sendBulkEmail(subject, content, user_filter)
      toast.success('Email отправлен в очередь')
    } catch (error) {
      console.error('Error sending bulk email:', error)
      toast.error('Ошибка при отправке email')
      throw error
    }
  }

  return {
    // Состояние
    loading,
    dashboardStats,
    users,
    pendingItems,
    contracts,

    // Методы загрузки данных
    fetchDashboardStats,
    fetchUsers,
    fetchPendingItems,
    fetchContracts,

    // Управление пользователями
    verifyUser,
    suspendUser,

    // Модерация товаров
    approveItem,
    rejectItem,

    // Работа со спорами
    resolveDispute,

    // Утилиты
    exportData,
    toggleMaintenanceMode,
    clearCache,
    sendBulkEmail
  }
}

export default useAdmin