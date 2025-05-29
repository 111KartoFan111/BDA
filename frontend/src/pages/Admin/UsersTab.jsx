import React, { useState, useEffect } from 'react'
import { Users, Shield, Ban, Activity, Eye, Mail } from 'lucide-react'
import { apiRequest } from '../../services/api/base.js'
import toast from 'react-hot-toast'

const UsersTab = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    suspendedUsers: 0,
    activeUsers: 0
  })

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await apiRequest.get('/v1/admin/users')
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Ошибка загрузки пользователей')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiRequest.get('/v1/admin/dashboard')
      const dashboardData = response.data.data
      setStats({
        totalUsers: dashboardData.total_users || 0,
        verifiedUsers: dashboardData.verified_users || 0,
        suspendedUsers: dashboardData.suspended_users || 0,
        activeUsers: dashboardData.active_users || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSuspend = async (id) => {
    const reason = prompt('Укажите причину блокировки:')
    if (!reason) return

    try {
      await apiRequest.patch(`/v1/admin/users/${id}/suspend`, { reason })
      setUsers(users.map(user => 
        user.id === id ? { ...user, status: user.status === 'suspended' ? 'active' : 'suspended' } : user
      ))
      toast.success('Статус пользователя изменен')
    } catch (error) {
      console.error('Error suspending user:', error)
      toast.error('Ошибка при изменении статуса пользователя')
    }
  }

  const handleVerify = async (id) => {
    try {
      await apiRequest.patch(`/v1/admin/users/${id}/verify`)
      setUsers(users.map(user => 
        user.id === id ? { ...user, is_verified: !user.is_verified } : user
      ))
      toast.success('Статус верификации изменен')
    } catch (error) {
      console.error('Error verifying user:', error)
      toast.error('Ошибка при изменении статуса верификации')
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
              <p className="text-sm font-medium text-gray-600">Активные за месяц</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Список пользователей */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium">Управление пользователями</h3>
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
                          {user.first_name?.[0]}{user.last_name?.[0]}
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
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status === 'active' ? 'Активный' : 'Заблокирован'}
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
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleVerify(user.id)}
                        className={user.is_verified ? "text-gray-600 hover:text-gray-900" : "text-green-600 hover:text-green-900"}
                      >
                        <Shield size={16} />
                      </button>
                      <button
                        onClick={() => handleSuspend(user.id)}
                        className={user.status === 'suspended' ? "text-green-600 hover:text-green-900" : "text-red-600 hover:text-red-900"}
                      >
                        <Ban size={16} />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        <Mail size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default UsersTab