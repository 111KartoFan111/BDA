import React, { useState, useEffect } from 'react'
import { Download, TrendingUp, Users, FileText } from 'lucide-react'
import { apiRequest } from '../../services/api/base.js'
import toast from 'react-hot-toast'

const AnalyticsTab = () => {
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState({
    revenue: [],
    userGrowth: [],
    keyMetrics: {},
    popularCategories: []
  })

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [revenueResponse, userGrowthResponse, metricsResponse, categoriesResponse] = await Promise.all([
        apiRequest.get('/v1/analytics/revenue', { params: { period } }),
        apiRequest.get('/v1/analytics/users/activity', { params: { period } }),
        apiRequest.get('/v1/analytics/dashboard', { params: { period } }),
        apiRequest.get('/v1/analytics/items/categories', { params: { period } })
      ])

      setAnalyticsData({
        revenue: revenueResponse.data.data || [],
        userGrowth: userGrowthResponse.data.data || [],
        keyMetrics: metricsResponse.data.data || {},
        popularCategories: categoriesResponse.data.data || []
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Ошибка загрузки аналитики')
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async () => {
    try {
      const response = await apiRequest.get('/v1/admin/export/analytics', {
        params: { period, format: 'csv' },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `analytics-report-${period}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Отчет экспортирован')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Ошибка экспорта отчета')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Фильтр периода */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Период:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Последние 7 дней</option>
            <option value="30d">Последние 30 дней</option>
            <option value="90d">Последние 90 дней</option>
            <option value="1y">Последний год</option>
          </select>
          <button 
            onClick={handleExportReport}
            className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download size={16} />
            Экспорт отчета
          </button>
        </div>
      </div>

      {/* Ключевые метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Общий доход</p>
              <p className="text-3xl font-bold text-gray-900">
                {analyticsData.keyMetrics.totalRevenue || '0'} ETH
              </p>
              <p className="text-sm text-green-600">
                +{analyticsData.keyMetrics.revenueGrowth || '0'}% за период
              </p>
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Новые пользователи</p>
              <p className="text-3xl font-bold text-gray-900">
                {analyticsData.keyMetrics.newUsers || '0'}
              </p>
              <p className="text-sm text-green-600">
                +{analyticsData.keyMetrics.userGrowth || '0'}% за период
              </p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Активные контракты</p>
              <p className="text-3xl font-bold text-gray-900">
                {analyticsData.keyMetrics.activeContracts || '0'}
              </p>
              <p className="text-sm text-green-600">
                +{analyticsData.keyMetrics.contractsGrowth || '0'}% за период
              </p>
            </div>
            <FileText className="text-purple-500" size={32} />
          </div>
        </div>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Рост доходов</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {analyticsData.revenue.slice(0, 7).map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="bg-blue-500 rounded-t w-8"
                  style={{ 
                    height: `${Math.max((item.value || 0) / Math.max(...analyticsData.revenue.map(r => r.value || 0)) * 100, 5)}%` 
                  }}
                  title={`${item.value || 0} ETH`}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {item.date ? new Date(item.date).getDate() : index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Рост пользователей</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {analyticsData.userGrowth.slice(0, 7).map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="bg-green-500 rounded-t w-8"
                  style={{ 
                    height: `${Math.max((item.value || 0) / Math.max(...analyticsData.userGrowth.map(u => u.value || 0)) * 100, 5)}%` 
                  }}
                  title={`${item.value || 0} пользователей`}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {item.date ? new Date(item.date).getDate() : index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Топ категории */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Популярные категории</h3>
        <div className="space-y-4">
          {analyticsData.popularCategories.slice(0, 5).map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">
                  {category.name || `Категория ${index + 1}`}
                </span>
                <span className="text-sm text-gray-500">
                  ({category.count || 0} товаров)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ 
                      width: `${category.percentage || Math.random() * 50 + 10}%`
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-900 w-10">
                  {Math.round(category.percentage || Math.random() * 50 + 10)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsTab