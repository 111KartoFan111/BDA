import React from 'react'
import { 
  Users, 
  Package, 
  FileText, 
  AlertTriangle,
  DollarSign
} from 'lucide-react'

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

export default DashboardTab