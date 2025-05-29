import React, { useState, useEffect } from 'react'
import { Users, Shield, Ban, Activity, Eye, Mail, Search } from 'lucide-react'
import { apiRequest } from '../../services/api/base.js'
import toast from 'react-hot-toast'

const UsersTab = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    pages: 0
  })
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    suspendedUsers: 0,
    activeUsers: 0
  })

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [pagination.page, searchTerm, filterStatus, filterRole])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        size: pagination.size,
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        role: filterRole !== 'all' ? filterRole : undefined
      }
      
      console.log('Fetching users with params:', params)
      
      const response = await apiRequest.get('/v1/admin/users', { params })
      
      console.log('Users API response:', response.data)
      
      // Проверяем структуру ответа - может быть PaginatedResponse или обычный массив
      let usersData = []
      let meta = {}
      
      if (response.data?.items) {
        // PaginatedResponse формат
        usersData = response.data.items
        meta = response.data.meta || {}
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // Обычный формат с data
        usersData = response.data.data
      } else if (Array.isArray(response.data)) {
        // Прямой массив
        usersData = response.data
      } else {
        console.warn('Unexpected users response format:', response.data)
        usersData = []
      }
      
      setUsers(usersData)
      setPagination(prev => ({
        ...prev,
        total: meta.total || usersData.length,
        pages: meta.pages || Math.ceil(usersData.length / prev.size)
      }))
      
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Ошибка загрузки пользователей')
      
      // Устанавливаем тестовые данные если API недоступен
      setUsers([
        {
          id: '1',
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          status: 'active',
          role: 'user',
          is_verified: true,
          is_email_verified: true,
          created_at: new Date().toISOString(),
          items_count: 5,
          contracts_count: 12
        },
        {
          id: '2',
          email: 'jane@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          status: 'active',
          role: 'user',
          is_verified: false,
          is_email_verified: true,
          created_at: new Date().toISOString(),
          items_count: 3,
          contracts_count: 8
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiRequest.get('/v1/admin/dashboard')
      const dashboardData = response.data?.data || response.data
      
      if (dashboardData) {
        setStats({
          totalUsers: dashboardData.totals?.users || dashboardData.total_users || 0,
          verifiedUsers: dashboardData.verified_users || 0,
          suspendedUsers: dashboardData.suspended_users || 0,
          activeUsers: dashboardData.active?.users || dashboardData.active_users || 0
        })
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      // Устанавливаем моковые данные
      setStats({
        totalUsers: 150,
        verifiedUsers: 120,
        suspendedUsers: 5,
        activeUsers: 145
      })
    }
  }

  const handleSuspend = async (id, currentStatus) => {
    const action = currentStatus === 'suspended' ? 'разблокировать' : 'заблокировать'
    const reason = currentStatus !== 'suspended' ? prompt('Укажите причину блокировки:') : null
    
    if (currentStatus !== 'suspended' && !reason) return

    try {
      if (currentStatus === 'suspended') {
        // Разблокировка - этот эндпоинт нужно добавить в API
        await apiRequest.patch(`/v1/admin/users/${id}/unsuspend`)
      } else {
        // Блокировка
        await apiRequest.patch(`/v1/admin/users/${id}/suspend`, { reason })
      }
      
      setUsers(users.map(user => 
        user.id === id ? { 
          ...user, 
          status: currentStatus === 'suspended' ? 'active' : 'suspended' 
        } : user
      ))
      toast.success(`Пользователь успешно ${currentStatus === 'suspended' ? 'разблокирован' : 'заблокирован'}`)
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error(`Ошибка при попытке ${action} пользователя`)
    }
  }

  const handleVerify = async (id, currentVerificationStatus) => {
    try {
      if (currentVerificationStatus) {
        // Снятие верификации - этот эндпоинт тоже нужно добавить
        await apiRequest.delete(`/v1/admin/users/${id}/verify`)
      } else {
        // Верификация
        await apiRequest.patch(`/v1/admin/users/${id}/verify`)
      }
      
      setUsers(users.map(user => 
        user.id === id ? { ...user, is_verified: !currentVerificationStatus } : user
      ))
      toast.success(`Статус верификации изменен`)
    } catch (error) {
      console.error('Error updating verification status:', error)
      toast.error('Ошибка при изменении статуса верификации')
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setPagination(prev => ({ ...prev, page: 1 })) // Сброс на первую страницу
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Статистика пользователей */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="text-blue-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Всего пользователей</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Shield className="text-green-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Верифицированные</p>
              <p className="text-2xl font-bold text-gray-900">{stats.verifiedUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Ban className="text-red-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Заблокированные</p>
              <p className="text-2xl font-bold text-gray-900">{stats.suspendedUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="text-purple-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Активные</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Поиск пользователей..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="suspended">Заблокированные</option>
            <option value="pending">Ожидающие</option>
          </select>
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все роли</option>
            <option value="user">Пользователи</option>
            <option value="admin">Администраторы</option>
            <option value="moderator">Модераторы</option>
          </select>
        </div>
      </div>

      {/* Список пользователей */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium">
            Управление пользователями ({users.length} из {pagination.total})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Товары
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Контракты
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата регистрации
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {user.first_name} {user.last_name}
                          {user.is_verified && <Shield className="text-green-500" size={14} />}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : user.status === 'suspended'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status === 'active' ? 'Активный' : 
                       user.status === 'suspended' ? 'Заблокирован' : 
                       user.status === 'pending' ? 'Ожидает' : user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.items_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.contracts_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button 
                        className="text-blue-600 hover:text-blue-900"
                        title="Просмотр профиля"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleVerify(user.id, user.is_verified)}
                        className={user.is_verified ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"}
                        title={user.is_verified ? "Снять верификацию" : "Верифицировать"}
                      >
                        <Shield size={16} />
                      </button>
                      <button
                        onClick={() => handleSuspend(user.id, user.status)}
                        className={user.status === 'suspended' ? "text-green-600 hover:text-green-900" : "text-red-600 hover:text-red-900"}
                        title={user.status === 'suspended' ? "Разблокировать" : "Заблокировать"}
                      >
                        <Ban size={16} />
                      </button>
                      <button 
                        className="text-blue-600 hover:text-blue-900"
                        title="Отправить письмо"
                      >
                        <Mail size={16} />
                      </button>
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
              (всего {pagination.total} пользователей)
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
        
        {/* Если пользователей нет */}
        {users.length === 0 && !loading && (
          <div className="px-6 py-12 text-center text-gray-500">
            {searchTerm || filterStatus !== 'all' || filterRole !== 'all' 
              ? 'Пользователи не найдены по заданным критериям'
              : 'Пользователи не найдены'
            }
          </div>
        )}
      </div>
    </div>
  )
}

export default UsersTab