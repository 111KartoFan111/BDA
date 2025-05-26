import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Users, 
  Package, 
  FileText, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { analyticsAPI } from '../../../services/api/analytics'
import { useApi } from '../../../hooks/useApi'
import Button from '../../UI/Button/Button'
import Card from '../../UI/Card/Card'
import Loader from '../../UI/Loader/Loader'
import { formatCurrency, formatNumber, formatPercent } from '../../../services/utils/formatting'
import styles from './Analytics.module.css'

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('overview')

  // API вызовы для получения данных аналитики
  const { 
    data: platformStats, 
    loading: platformLoading,
    refresh: refreshPlatform 
  } = useApi(() => analyticsAPI.getPlatformStats(selectedPeriod), [selectedPeriod])

  const { 
    data: userStats, 
    loading: userLoading 
  } = useApi(() => analyticsAPI.getUserStats(selectedPeriod), [selectedPeriod])

  const { 
    data: itemStats, 
    loading: itemLoading 
  } = useApi(() => analyticsAPI.getItemStats(selectedPeriod), [selectedPeriod])

  const { 
    data: contractStats, 
    loading: contractLoading 
  } = useApi(() => analyticsAPI.getContractStats(selectedPeriod), [selectedPeriod])

  const { 
    data: financialStats, 
    loading: financialLoading 
  } = useApi(() => analyticsAPI.getFinancialStats(selectedPeriod), [selectedPeriod])

  const periods = [
    { value: '24h', label: 'Последние 24 часа' },
    { value: '7d', label: 'Неделя' },
    { value: '30d', label: 'Месяц' },
    { value: '90d', label: '3 месяца' },
    { value: '1y', label: 'Год' }
  ]

  const isLoading = platformLoading || userLoading || itemLoading || contractLoading || financialLoading

  const handleExportData = async () => {
    try {
      await analyticsAPI.exportAnalytics('platform', { period: selectedPeriod })
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const handleRefreshData = () => {
    refreshPlatform()
  }

  // Данные для графиков
  const lineChartData = {
    labels: platformStats?.timeline?.labels || [],
    datasets: [
      {
        label: 'Новые пользователи',
        data: platformStats?.timeline?.users || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Новые товары',
        data: platformStats?.timeline?.items || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Контракты',
        data: platformStats?.timeline?.contracts || [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
      }
    ]
  }

  const barChartData = {
    labels: itemStats?.categories?.labels || [],
    datasets: [
      {
        label: 'Количество товаров',
        data: itemStats?.categories?.counts || [],
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#06b6d4'
        ],
        borderRadius: 4,
      }
    ]
  }

  const doughnutChartData = {
    labels: contractStats?.statusDistribution?.labels || [],
    datasets: [
      {
        data: contractStats?.statusDistribution?.values || [],
        backgroundColor: [
          '#10b981', // active
          '#3b82f6', // completed
          '#f59e0b', // pending
          '#ef4444', // cancelled
          '#8b5cf6'  // disputed
        ],
        borderWidth: 0,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      }
    },
    scales: {
      y: {
        beginAtZero: true,
      }
    }
  }

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      }
    }
  }

  // Карточки с ключевыми метриками
  const keyMetrics = [
    {
      title: 'Общий доход',
      value: formatCurrency(financialStats?.totalRevenue || 0),
      change: financialStats?.revenueGrowth || 0,
      icon: <DollarSign size={24} />,
      color: 'success'
    },
    {
      title: 'Активные пользователи',
      value: formatNumber(userStats?.activeUsers || 0),
      change: userStats?.userGrowth || 0,
      icon: <Users size={24} />,
      color: 'primary'
    },
    {
      title: 'Товары в аренде',
      value: formatNumber(itemStats?.rentedItems || 0),
      change: itemStats?.rentalGrowth || 0,
      icon: <Package size={24} />,
      color: 'warning'
    },
    {
      title: 'Активные контракты',
      value: formatNumber(contractStats?.activeContracts || 0),
      change: contractStats?.contractGrowth || 0,
      icon: <FileText size={24} />,
      color: 'info'
    }
  ]

  return (
    <div className={styles.analytics}>
      <div className="container">
        {/* Заголовок */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <h1 className={styles.title}>Аналитика платформы</h1>
              <p className={styles.subtitle}>
                Обзор ключевых метрик и трендов
              </p>
            </div>
            
            <div className={styles.headerActions}>
              <Button
                variant="outline"
                size="small"
                onClick={handleRefreshData}
                icon={<RefreshCw size={16} />}
                disabled={isLoading}
              >
                Обновить
              </Button>
              
              <Button
                variant="outline"
                size="small"
                onClick={handleExportData}
                icon={<Download size={16} />}
              >
                Экспорт
              </Button>
            </div>
          </div>

          {/* Фильтры */}
          <div className={styles.filters}>
            <div className={styles.periodSelector}>
              <label className={styles.filterLabel}>
                <Calendar size={16} />
                Период:
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className={styles.periodSelect}
              >
                {periods.map(period => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Loader size="large" text="Загрузка аналитики..." />
          </div>
        ) : (
          <>
            {/* Ключевые метрики */}
            <div className={styles.metricsGrid}>
              {keyMetrics.map((metric, index) => (
                <Card key={index} className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <div className={`${styles.metricIcon} ${styles[metric.color]}`}>
                      {metric.icon}
                    </div>
                    <div className={styles.metricChange}>
                      <TrendingUp 
                        size={16} 
                        className={metric.change >= 0 ? styles.positive : styles.negative}
                      />
                      <span className={metric.change >= 0 ? styles.positive : styles.negative}>
                        {formatPercent(Math.abs(metric.change))}
                      </span>
                    </div>
                  </div>
                  <div className={styles.metricContent}>
                    <div className={styles.metricValue}>{metric.value}</div>
                    <div className={styles.metricTitle}>{metric.title}</div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Графики */}
            <div className={styles.chartsGrid}>
              {/* Временной график */}
              <Card className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h3 className={styles.chartTitle}>Динамика роста</h3>
                  <p className={styles.chartSubtitle}>
                    Новые пользователи, товары и контракты
                  </p>
                </div>
                <div className={styles.chartContainer}>
                  <Line data={lineChartData} options={chartOptions} />
                </div>
              </Card>

              {/* Распределение по категориям */}
              <Card className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h3 className={styles.chartTitle}>Популярные категории</h3>
                  <p className={styles.chartSubtitle}>
                    Количество товаров по категориям
                  </p>
                </div>
                <div className={styles.chartContainer}>
                  <Bar data={barChartData} options={chartOptions} />
                </div>
              </Card>

              {/* Статусы контрактов */}
              <Card className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h3 className={styles.chartTitle}>Статусы контрактов</h3>
                  <p className={styles.chartSubtitle}>
                    Распределение контрактов по статусам
                  </p>
                </div>
                <div className={styles.chartContainer}>
                  <Doughnut data={doughnutChartData} options={doughnutOptions} />
                </div>
              </Card>
            </div>

            {/* Детальная статистика */}
            <div className={styles.detailsGrid}>
              {/* Пользователи */}
              <Card className={styles.detailCard}>
                <h3 className={styles.detailTitle}>Пользователи</h3>
                <div className={styles.detailStats}>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Всего зарегистрировано</span>
                    <span className={styles.detailValue}>
                      {formatNumber(userStats?.totalUsers || 0)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Активных за период</span>
                    <span className={styles.detailValue}>
                      {formatNumber(userStats?.activeUsers || 0)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Новых за период</span>
                    <span className={styles.detailValue}>
                      {formatNumber(userStats?.newUsers || 0)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Средний рейтинг</span>
                    <span className={styles.detailValue}>
                      {(userStats?.averageRating || 0).toFixed(1)}/5
                    </span>
                  </div>
                </div>
              </Card>

              {/* Товары */}
              <Card className={styles.detailCard}>
                <h3 className={styles.detailTitle}>Товары</h3>
                <div className={styles.detailStats}>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Всего товаров</span>
                    <span className={styles.detailValue}>
                      {formatNumber(itemStats?.totalItems || 0)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Активных</span>
                    <span className={styles.detailValue}>
                      {formatNumber(itemStats?.activeItems || 0)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>В аренде</span>
                    <span className={styles.detailValue}>
                      {formatNumber(itemStats?.rentedItems || 0)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Средняя цена</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(itemStats?.averagePrice || 0)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Финансы */}
              <Card className={styles.detailCard}>
                <h3 className={styles.detailTitle}>Финансы</h3>
                <div className={styles.detailStats}>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Общий оборот</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(financialStats?.totalVolume || 0)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Доход платформы</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(financialStats?.platformRevenue || 0)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Средний чек</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(financialStats?.averageOrderValue || 0)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailLabel}>Конверсия</span>
                    <span className={styles.detailValue}>
                      {formatPercent(financialStats?.conversionRate || 0)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Топ списки */}
            <div className={styles.topListsGrid}>
              {/* Топ пользователи */}
              <Card className={styles.topListCard}>
                <h3 className={styles.topListTitle}>Топ пользователи</h3>
                <div className={styles.topList}>
                  {(userStats?.topUsers || []).map((user, index) => (
                    <div key={user.id} className={styles.topListItem}>
                      <div className={styles.topListRank}>{index + 1}</div>
                      <div className={styles.topListInfo}>
                        <div className={styles.topListName}>{user.name}</div>
                        <div className={styles.topListMeta}>
                          {user.itemsCount} товаров • {user.rating}/5
                        </div>
                      </div>
                      <div className={styles.topListValue}>
                        {formatCurrency(user.totalEarnings)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Популярные товары */}
              <Card className={styles.topListCard}>
                <h3 className={styles.topListTitle}>Популярные товары</h3>
                <div className={styles.topList}>
                  {(itemStats?.popularItems || []).map((item, index) => (
                    <div key={item.id} className={styles.topListItem}>
                      <div className={styles.topListRank}>{index + 1}</div>
                      <div className={styles.topListInfo}>
                        <div className={styles.topListName}>{item.title}</div>
                        <div className={styles.topListMeta}>
                          {item.category} • {item.viewsCount} просмотров
                        </div>
                      </div>
                      <div className={styles.topListValue}>
                        {formatCurrency(item.pricePerDay)}/день
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Analytics