import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Package, 
  FileText, 
  Settings, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Shield,
  Ban,
  Mail,
  Download,
  Upload,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  Bell,
  Tag,
  FolderTree
} from 'lucide-react'

// Компонент главной админ панели
const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    totalUsers: 1234,
    totalItems: 567,
    pendingItems: 23,
    activeContracts: 89,
    totalRevenue: 45.67,
    disputedContracts: 3
  })

  const tabs = [
    { id: 'dashboard', label: 'Обзор', icon: <BarChart3 size={20} /> },
    { id: 'items', label: 'Модерация товаров', icon: <Package size={20} /> },
    { id: 'users', label: 'Пользователи', icon: <Users size={20} /> },
    { id: 'categories', label: 'Категории', icon: <FolderTree size={20} /> },
    { id: 'contracts', label: 'Контракты', icon: <FileText size={20} /> },
    { id: 'analytics', label: 'Аналитика', icon: <TrendingUp size={20} /> },
  ]

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
        {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
        {activeTab === 'items' && <ItemsModerationTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'contracts' && <ContractsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  )
}

const ContractsTab = () => {
  const [contracts, setContracts] = useState([
    {
      id: 1,
      itemTitle: "iPhone 15 Pro Max",
      tenant: "john_doe",
      owner: "jane_smith",
      amount: 0.05,
      status: "active",
      startDate: "2024-01-15",
      endDate: "2024-01-22",
      createdAt: "2024-01-15T10:30:00Z"
    },
    {
      id: 2,
      itemTitle: "MacBook Pro M3",
      tenant: "alice_wonder",
      owner: "bob_builder",
      amount: 0.15,
      status: "disputed",
      startDate: "2024-01-10",
      endDate: "2024-01-17",
      createdAt: "2024-01-10T14:20:00Z"
    },
    {
      id: 3,
      itemTitle: "Canon EOS R5",
      tenant: "photo_lover",
      owner: "camera_pro",
      amount: 0.08,
      status: "completed",
      startDate: "2024-01-05",
      endDate: "2024-01-12",
      createdAt: "2024-01-05T16:45:00Z"
    }
  ])

  const [filter, setFilter] = useState('all')

  const filteredContracts = contracts.filter(contract => 
    filter === 'all' || contract.status === filter
  )

  const handleResolveDispute = (id) => {
    setContracts(contracts.map(contract => 
      contract.id === id ? { ...contract, status: 'completed' } : contract
    ))
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
              <p className="text-2xl font-bold text-gray-900">234</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="text-green-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Активные</p>
              <p className="text-2xl font-bold text-gray-900">89</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Споры</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="text-purple-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Завершенные</p>
              <p className="text-2xl font-bold text-gray-900">142</p>
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
                      {contract.itemTitle}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.tenant}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.owner}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={contract.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contract.startDate).toLocaleDateString('ru-RU')} - {new Date(contract.endDate).toLocaleDateString('ru-RU')}
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

const AnalyticsTab = () => {
  const [period, setPeriod] = useState('30d')
  
  const analyticsData = {
    revenue: [
      { date: '2024-01-01', value: 2.5 },
      { date: '2024-01-02', value: 3.2 },
      { date: '2024-01-03', value: 1.8 },
      { date: '2024-01-04', value: 4.1 },
      { date: '2024-01-05', value: 3.7 },
      { date: '2024-01-06', value: 5.2 },
      { date: '2024-01-07', value: 4.8 }
    ],
    userGrowth: [
      { date: '2024-01-01', value: 123 },
      { date: '2024-01-02', value: 135 },
      { date: '2024-01-03', value: 142 },
      { date: '2024-01-04', value: 158 },
      { date: '2024-01-05', value: 167 },
      { date: '2024-01-06', value: 189 },
      { date: '2024-01-07', value: 203 }
    ]
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
          <button className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
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
              <p className="text-3xl font-bold text-gray-900">45.67 ETH</p>
              <p className="text-sm text-green-600">+12.5% за период</p>
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Новые пользователи</p>
              <p className="text-3xl font-bold text-gray-900">234</p>
              <p className="text-sm text-green-600">+8.2% за период</p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Активные контракты</p>
              <p className="text-3xl font-bold text-gray-900">89</p>
              <p className="text-sm text-green-600">+15.3% за период</p>
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
            {analyticsData.revenue.map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="bg-blue-500 rounded-t w-8"
                  style={{ height: `${(item.value / 6) * 100}%` }}
                  title={`${item.value} ETH`}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {new Date(item.date).getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Рост пользователей</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {analyticsData.userGrowth.map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="bg-green-500 rounded-t w-8"
                  style={{ height: `${(item.value / 250) * 100}%` }}
                  title={`${item.value} пользователей`}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {new Date(item.date).getDate()}
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
          {[
            { name: 'Электроника', count: 234, percent: 45 },
            { name: 'Транспорт', count: 123, percent: 24 },
            { name: 'Инструменты', count: 89, percent: 17 },
            { name: 'Спорт', count: 67, percent: 13 },
            { name: 'Дом и сад', count: 45, percent: 9 }
          ].map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">{category.name}</span>
                <span className="text-sm text-gray-500">({category.count} товаров)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${category.percent}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-900 w-10">{category.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const DashboardTab = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Общее количество пользователей"
          value={stats.totalUsers}
          icon={<Users className="text-blue-500" size={24} />}
          change="+12%"
          changeType="positive"
        />
        <StatCard
          title="Товары на модерации"
          value={stats.pendingItems}
          icon={<Package className="text-orange-500" size={24} />}
          change="+5"
          changeType="neutral"
        />
        <StatCard
          title="Активные контракты"
          value={stats.activeContracts}
          icon={<FileText className="text-green-500" size={24} />}
          change="+8%"
          changeType="positive"
        />
        <StatCard
          title="Общий доход (ETH)"
          value={stats.totalRevenue}
          icon={<DollarSign className="text-purple-500" size={24} />}
          change="+15%"
          changeType="positive"
        />
        <StatCard
          title="Спорные контракты"
          value={stats.disputedContracts}
          icon={<AlertTriangle className="text-red-500" size={24} />}
          change="-2"
          changeType="positive"
        />
        <StatCard
          title="Всего товаров"
          value={stats.totalItems}
          icon={<Package className="text-indigo-500" size={24} />}
          change="+23%"
          changeType="positive"
        />
      </div>

      {/* Недавняя активность */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Недавняя активность</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <ActivityItem
              icon={<Package className="text-blue-500" size={16} />}
              text="Новый товар добавлен пользователем john_doe"
              time="2 минуты назад"
            />
            <ActivityItem
              icon={<Users className="text-green-500" size={16} />}
              text="Новый пользователь зарегистрировался"
              time="5 минут назад"
            />
            <ActivityItem
              icon={<FileText className="text-orange-500" size={16} />}
              text="Контракт завершен успешно"
              time="15 минут назад"
            />
            <ActivityItem
              icon={<AlertTriangle className="text-red-500" size={16} />}
              text="Создан новый спор по контракту #1234"
              time="1 час назад"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ title, value, icon, change, changeType }) => {
  const changeColor = changeType === 'positive' ? 'text-green-600' : 
                     changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center">
        {icon}
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm ${changeColor}`}>
              {change}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const ActivityItem = ({ icon, text, time }) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-900">{text}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  )
}

const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', text: 'На модерации' },
    approved: { color: 'bg-green-100 text-green-800', text: 'Одобрено' },
    rejected: { color: 'bg-red-100 text-red-800', text: 'Отклонено' },
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

const ItemsModerationTab = () => {
  const [items, setItems] = useState([
    {
      id: 1,
      title: "iPhone 15 Pro Max",
      owner: "john_doe",
      category: "Электроника",
      price: 0.05,
      status: "pending",
      createdAt: "2024-01-15T10:30:00Z",
      image: "https://via.placeholder.com/100x100"
    },
    {
      id: 2,
      title: "MacBook Pro M3",
      owner: "jane_smith",
      category: "Электроника",
      price: 0.15,
      status: "pending",
      createdAt: "2024-01-14T15:20:00Z",
      image: "https://via.placeholder.com/100x100"
    },
    {
      id: 3,
      title: "Canon EOS R5",
      owner: "photo_pro",
      category: "Фототехника",
      price: 0.08,
      status: "approved",
      createdAt: "2024-01-13T12:45:00Z",
      image: "https://via.placeholder.com/100x100"
    }
  ])

  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const handleApprove = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status: 'approved' } : item
    ))
  }

  const handleReject = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status: 'rejected' } : item
    ))
  }

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.owner.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            <option value="pending">На модерации</option>
            <option value="approved">Одобрено</option>
            <option value="rejected">Отклонено</option>
          </select>
        </div>
      </div>

      {/* Список товаров */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium">Товары на модерации</h3>
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
                  Цена (ETH)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        className="h-12 w-12 rounded-lg object-cover"
                        src={item.image}
                        alt={item.title}
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.title}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.owner}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye size={16} />
                      </button>
                      {item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            className="text-red-600 hover:text-red-900"
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
      </div>
    </div>
  )
}

const CategoriesTab = () => {
  const [categories, setCategories] = useState([
    { id: 1, name: "Электроника", slug: "electronics", itemsCount: 234, isActive: true, parentId: null },
    { id: 2, name: "Смартфоны", slug: "smartphones", itemsCount: 89, isActive: true, parentId: 1 },
    { id: 3, name: "Ноутбуки", slug: "laptops", itemsCount: 67, isActive: true, parentId: 1 },
    { id: 4, name: "Транспорт", slug: "transport", itemsCount: 123, isActive: true, parentId: null },
    { id: 5, name: "Автомобили", slug: "cars", itemsCount: 45, isActive: true, parentId: 4 },
    { id: 6, name: "Инструменты", slug: "tools", itemsCount: 78, isActive: true, parentId: null }
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [newCategory, setNewCategory] = useState({ name: '', parentId: null })

  const handleAddCategory = () => {
    if (newCategory.name.trim()) {
      const id = Math.max(...categories.map(c => c.id)) + 1
      setCategories([...categories, {
        id,
        name: newCategory.name,
        slug: newCategory.name.toLowerCase().replace(/\s+/g, '-'),
        itemsCount: 0,
        isActive: true,
        parentId: newCategory.parentId || null
      }])
      setNewCategory({ name: '', parentId: null })
      setShowAddForm(false)
    }
  }

  const handleDeleteCategory = (id) => {
    if (confirm('Вы уверены, что хотите удалить эту категорию?')) {
      setCategories(categories.filter(c => c.id !== id))
    }
  }

  const toggleCategoryStatus = (id) => {
    setCategories(categories.map(c => 
      c.id === id ? { ...c, isActive: !c.isActive } : c
    ))
  }

  const parentCategories = categories.filter(c => c.parentId === null)

  const getCategoryLevel = (category) => {
    return category.parentId ? 1 : 0
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка добавления */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Управление категориями</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} />
          Добавить категорию
        </button>
      </div>

      {/* Форма добавления категории */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium mb-4">Новая категория</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название категории
              </label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите название категории"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Родительская категория
              </label>
              <select
                value={newCategory.parentId || ''}
                onChange={(e) => setNewCategory({ ...newCategory, parentId: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Корневая категория</option>
                {parentCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddCategory}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Создать
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список категорий */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium">Категории товаров</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Товаров
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium text-gray-900 ${getCategoryLevel(category) > 0 ? 'ml-6' : ''}`}>
                      {getCategoryLevel(category) > 0 && '↳ '}
                      {category.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.itemsCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      category.isActive 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {category.isActive ? 'Активна' : 'Неактивна'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Редактировать"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => toggleCategoryStatus(category.id)}
                        className={category.isActive ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                        title={category.isActive ? "Деактивировать" : "Активировать"}
                      >
                        {category.isActive ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
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

const UsersTab = () => {
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      role: "user",
      status: "active",
      verified: true,
      joinDate: "2024-01-10T10:30:00Z",
      itemsCount: 5,
      contractsCount: 12
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      role: "user",
      status: "active",
      verified: false,
      joinDate: "2024-01-08T15:20:00Z",
      itemsCount: 3,
      contractsCount: 8
    },
    {
      id: 3,
      name: "Bob Johnson",
      email: "bob@example.com",
      role: "user",
      status: "suspended",
      verified: true,
      joinDate: "2024-01-05T12:45:00Z",
      itemsCount: 0,
      contractsCount: 2
    }
  ])

  const handleSuspend = (id) => {
    setUsers(users.map(user => 
      user.id === id ? { ...user, status: user.status === 'suspended' ? 'active' : 'suspended' } : user
    ))
  }

  const handleVerify = (id) => {
    setUsers(users.map(user => 
      user.id === id ? { ...user, verified: !user.verified } : user
    ))
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
              <p className="text-2xl font-bold text-gray-900">1,234</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Shield className="text-green-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Верифицированные</p>
              <p className="text-2xl font-bold text-gray-900">987</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Ban className="text-red-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Заблокированные</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="text-purple-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Активные за месяц</p>
              <p className="text-2xl font-bold text-gray-900">567</p>
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
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {user.name}
                          {user.verified && <Shield className="text-green-500" size={14} />}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {user.role}
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
                    {user.itemsCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.contractsCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.joinDate).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleVerify(user.id)}
                        className={user.verified ? "text-gray-600 hover:text-gray-900" : "text-green-600 hover:text-green-900"}
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

export default AdminPanel