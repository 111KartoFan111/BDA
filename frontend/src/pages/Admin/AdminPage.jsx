import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Package, 
  Users, 
  FolderTree,
  FileText, 
  TrendingUp,
  Shield,
  Bell
} from 'lucide-react'
import { apiRequest } from '../../services/api/base.js'
import toast from 'react-hot-toast'

// Импортируем компоненты вкладок
import DashboardTab from './DashboardTab.jsx'
import ItemsModerationTab from './ItemsModerationTab.jsx'
import UsersTab from './UsersTab.jsx'
import CategoriesTab from './CategoriesTab.jsx'
import ContractsTab from './ContractsTab.jsx'
import AnalyticsTab from './AnalyticsTab.jsx'

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalItems: 0,
    pendingItems: 0,
    activeContracts: 0,
    totalRevenue: 0,
    disputedContracts: 0
  })
  const [loading, setLoading] = useState(true)

  const tabs = [
    { id: 'dashboard', label: 'Обзор', icon: <BarChart3 size={20} /> },
    { id: 'items', label: 'Модерация товаров', icon: <Package size={20} /> },
    { id: 'users', label: 'Пользователи', icon: <Users size={20} /> },
    { id: 'categories', label: 'Категории', icon: <FolderTree size={20} /> },
    { id: 'contracts', label: 'Контракты', icon: <FileText size={20} /> },
    { id: 'analytics', label: 'Аналитика', icon: <TrendingUp size={20} /> },
  ]

  // Загрузка общей статистики при монтировании
  useEffect(() => {
    fetchDashboardStats()
  }, [])

const fetchDashboardStats = async () => {
  try {
    setLoading(true)
    const response = await apiRequest.get('/v1/admin/dashboard')
    
    // ВАЖНО: данные вложены в response.data.data
    const data = response.data.data
    
    console.log('Raw dashboard data:', data) // Для отладки
    
    // Правильный маппинг в соответствии с структурой ответа
    setStats({
      totalUsers: data.totals?.users || 0,
      totalItems: data.totals?.items || 0,
      pendingItems: data.pending?.items || 0,
      activeContracts: data.active?.contracts || 0,
      totalRevenue: data.revenue?.last_30_days || 0,
      disputedContracts: data.pending?.disputes || 0
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    toast.error('Ошибка загрузки статистики')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Навигация */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <Shield className="text-blue-600" size={24} />
                <span className="text-xl font-bold">RentChain Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  3
                </span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  A
                </div>
                <span className="text-sm font-medium">Admin</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Вкладки */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Контент */}
        {loading && activeTab === 'dashboard' ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
            {activeTab === 'items' && <ItemsModerationTab />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'categories' && <CategoriesTab />}
            {activeTab === 'contracts' && <ContractsTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
          </>
        )}
      </div>
    </div>
  )
}

export default AdminPanel