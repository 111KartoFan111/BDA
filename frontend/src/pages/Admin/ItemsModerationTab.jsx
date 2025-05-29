import React, { useState, useEffect } from 'react'
import { Search, CheckCircle, XCircle, Eye, Filter } from 'lucide-react'
import { apiRequest } from '../../services/api/base.js'
import toast from 'react-hot-toast'

const ItemsModerationTab = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // Изначально показываем только pending
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    pages: 0
  })

  // Загрузка товаров при монтировании компонента
  useEffect(() => {
    fetchItems()
  }, [pagination.page, filter, searchTerm])

  const fetchItems = async () => {
    try {
      setLoading(true)
      
      let url = '/v1/admin/items/pending'
      let params = {
        page: pagination.page,
        size: pagination.size
      }
      
      // Если фильтр не pending, используем общий эндпоинт items
      if (filter !== 'pending') {
        url = '/v1/items'
        params.status = filter === 'all' ? undefined : filter
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }
      
      console.log('Fetching items:', { url, params })
      
      const response = await apiRequest.get(url, { params })
      
      console.log('Items API response:', response.data)
      
      // Обработка разных форматов ответа
      let itemsData = []
      let meta = {}
      
      if (response.data?.items) {
        // PaginatedResponse формат
        itemsData = response.data.items
        meta = response.data.meta || {}
      } else if (response.data?.data) {
        if (Array.isArray(response.data.data)) {
          itemsData = response.data.data
        } else if (response.data.data.items) {
          itemsData = response.data.data.items
          meta = response.data.data.meta || {}
        }
      } else if (Array.isArray(response.data)) {
        itemsData = response.data
      }
      
      setItems(itemsData)
      setPagination(prev => ({
        ...prev,
        total: meta.total || itemsData.length,
        pages: meta.pages || Math.ceil(itemsData.length / prev.size)
      }))
      
    } catch (error) {
      console.error('Error fetching items:', error)
      toast.error('Ошибка загрузки товаров')
      
      // Устанавливаем тестовые данные если API недоступен
      setItems([
        {
          id: '1',
          title: 'iPhone 14 Pro',
          description: 'Отличный смартфон в хорошем состоянии',
          price_per_day: 0.01,
          condition: 'good',
          status: 'pending',
          location: 'Москва',
          images: ['https://via.placeholder.com/100x100?text=iPhone'],
          created_at: new Date().toISOString(),
          owner: {
            first_name: 'Иван',
            last_name: 'Петров',
            email: 'ivan@example.com'
          },
          category: {
            name: 'Электроника'
          }
        },
        {
          id: '2',
          title: 'MacBook Pro 16"',
          description: 'Мощный ноутбук для работы',
          price_per_day: 0.05,
          condition: 'like_new',
          status: 'pending',
          location: 'СПб',
          images: ['https://via.placeholder.com/100x100?text=MacBook'],
          created_at: new Date().toISOString(),
          owner: {
            first_name: 'Мария',
            last_name: 'Иванова',
            email: 'maria@example.com'
          },
          category: {
            name: 'Компьютеры'
          }
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await apiRequest.patch(`/v1/admin/items/${id}/approve`)
      setItems(items.map(item => 
        item.id === id ? { ...item, status: 'approved', is_approved: true } : item
      ))
      toast.success('Товар одобрен')
    } catch (error) {
      console.error('Error approving item:', error)
      toast.error('Ошибка при одобрении товара')
    }
  }

  const handleReject = async (id) => {
    const reason = prompt('Укажите причину отклонения:')
    if (!reason) return

    try {
      await apiRequest.patch(`/v1/admin/items/${id}/reject`, { reason })
      setItems(items.map(item => 
        item.id === id ? { ...item, status: 'rejected', rejection_reason: reason } : item
      ))
      toast.success('Товар отклонен')
    } catch (error) {
      console.error('Error rejecting item:', error)
      toast.error('Ошибка при отклонении товара')
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const getStatusBadge = (item) => {
    const status = item.status || (item.is_approved === false ? 'pending' : item.is_approved === true ? 'approved' : 'pending')
    
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'На модерации' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Одобрено' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Отклонено' },
      active: { color: 'bg-blue-100 text-blue-800', text: 'Активный' },
      inactive: { color: 'bg-gray-100 text-gray-800', text: 'Неактивный' }
    }

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Фильтры и поиск */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">На модерации</option>
              <option value="approved">Одобренные</option>
              <option value="rejected">Отклоненные</option>
              <option value="active">Активные</option>
              <option value="all">Все товары</option>
            </select>
          </div>
        </div>
      </div>

      {/* Список товаров */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium">
            {filter === 'pending' ? 'Товары на модерации' : 'Управление товарами'} 
            ({items.length} из {pagination.total})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Товар
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Владелец
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Цена (ETH/день)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата создания
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        className="h-12 w-12 rounded-lg object-cover bg-gray-200"
                        src={item.images?.[0] || 'https://via.placeholder.com/100x100?text=No+Image'}
                        alt={item.title}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/100x100?text=No+Image'
                        }}
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.title || 'Без названия'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.location || 'Местоположение не указано'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        {item.owner?.first_name} {item.owner?.last_name}
                      </div>
                      <div className="text-gray-500">
                        {item.owner?.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.category?.name || 'Без категории'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {parseFloat(item.price_per_day || 0).toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('ru-RU') : 'Не указана'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button 
                        className="text-blue-600 hover:text-blue-900"
                        title="Просмотр товара"
                      >
                        <Eye size={16} />
                      </button>
                      {(item.status === 'pending' || (!item.status && !item.is_approved)) && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Одобрить"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Отклонить"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Пагинация */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Страница {pagination.page} из {pagination.pages} 
              (всего {pagination.total} товаров)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперед
              </button>
            </div>
          </div>
        )}
        
        {/* Если товаров нет */}
        {items.length === 0 && !loading && (
          <div className="px-6 py-12 text-center text-gray-500">
            <div className="text-lg font-medium mb-2">
              {filter === 'pending' ? 'Нет товаров на модерации' : 'Товары не найдены'}
            </div>
            <div className="text-sm">
              {searchTerm || filter !== 'pending' 
                ? 'Попробуйте изменить фильтры или поисковый запрос'
                : 'Все товары прошли модерацию'
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ItemsModerationTab