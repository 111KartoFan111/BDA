import React, { useState, useEffect } from 'react'
import { FileText, Activity, AlertTriangle, CheckCircle, Eye } from 'lucide-react'
import { apiRequest } from '../../services/api/base.js'
import toast from 'react-hot-toast'

const ContractsTab = () => {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    disputedContracts: 0,
    completedContracts: 0
  })

  useEffect(() => {
    fetchContracts()
    fetchStats()
  }, [])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const response = await apiRequest.get('/v1/admin/contracts/all')
      setContracts(response.data.data || [])
    } catch (error) {
      console.error('Error fetching contracts:', error)
      toast.error('Ошибка загрузки контрактов')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiRequest.get('/v1/admin/contracts/stats')
      setStats(response.data.data || stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleResolveDispute = async (id) => {
    const resolution = prompt('Введите решение по спору:')
    if (!resolution) return

    try {
      await apiRequest.patch(`/v1/admin/contracts/disputes/${id}/resolve`, {
        resolution,
        compensation_amount: null,
        compensation_recipient: null
      })
      setContracts(contracts.map(contract => 
        contract.id === id ? { ...contract, status: 'completed' } : contract
      ))
      toast.success('Спор разрешен')
    } catch (error) {
      console.error('Error resolving dispute:', error)
      toast.error('Ошибка при разрешении спора')
    }
  }

  const filteredContracts = contracts.filter(contract => 
    filter === 'all' || contract.status === filter
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Статистика контрактов */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="text-blue-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Всего контрактов</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalContracts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="text-green-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Активные</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeContracts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Споры</p>
              <p className="text-2xl font-bold text-gray-900">{stats.disputedContracts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="text-purple-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Завершенные</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedContracts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтр */}
      <div className="bg-white p-6 rounded-lg shadow">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Все контракты</option>
          <option value="active">Активные</option>
          <option value="disputed">Споры</option>
          <option value="completed">Завершенные</option>
          <option value="cancelled">Отмененные</option>
        </select>
      </div>

      {/* Список контрактов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium">Управление контрактами</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Контракт
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Арендатор
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Владелец
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма (ETH)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Период
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      #{contract.id}
                    </div>
                    <div className="text-sm text-gray-500">
                      {contract.item?.title || 'Товар удален'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.tenant?.first_name} {contract.tenant?.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.owner?.first_name} {contract.owner?.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.total_price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={contract.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contract.start_date && contract.end_date && (
                      <>
                        {new Date(contract.start_date).toLocaleDateString('ru-RU')} - {new Date(contract.end_date).toLocaleDateString('ru-RU')}
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye size={16} />
                      </button>
                      {contract.status === 'disputed' && (
                        <button
                          onClick={() => handleResolveDispute(contract.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Разрешить спор"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
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

const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Ожидание' },
    active: { color: 'bg-blue-100 text-blue-800', text: 'Активный' },
    completed: { color: 'bg-green-100 text-green-800', text: 'Завершен' },
    cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Отменен' },
    disputed: { color: 'bg-red-100 text-red-800', text: 'Спор' }
  }

  const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.text}
    </span>
  )
}

export default ContractsTab