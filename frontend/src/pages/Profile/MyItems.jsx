import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical,
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  Package,
  Grid,
  List
} from 'lucide-react'
import { itemsAPI } from '../../services/api/items'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import Card from '../../components/UI/Card/Card'
import Loader from '../../components/UI/Loader/Loader'
import Modal from '../../components/UI/Modal/Modal'
import { formatCurrency, formatDate, formatNumber } from '../../services/utils/formatting'
import styles from './MyItems.module.css'

const MyItems = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [stats, setStats] = useState({
    totalItems: 0,
    activeItems: 0,
    totalViews: 0,
    totalEarnings: 0
  })

  useEffect(() => {
    loadMyItems()
    loadStats()
  }, [searchQuery, selectedStatus])

    const loadMyItems = async () => {
    try {
        setLoading(true)
        const params = {
        search: searchQuery || undefined,
        status: selectedStatus || undefined
        }
        
        const response = await itemsAPI.getMyItems(params)
        console.log('My items response:', response)
        
        // Обрабатываем ответ от API
        const responseData = response.data
        let itemsData = []
        
        // Проверяем различные возможные структуры ответа
        if (responseData.data && responseData.data.items && Array.isArray(responseData.data.items)) {
        // Структура: response.data.data.items
        itemsData = responseData.data.items
        } else if (responseData.items && Array.isArray(responseData.items)) {
        // Структура: response.data.items
        itemsData = responseData.items
        } else if (responseData.data && Array.isArray(responseData.data)) {
        // Структура: response.data.data (массив)
        itemsData = responseData.data
        } else if (Array.isArray(responseData)) {
        // Структура: response.data (массив)
        itemsData = responseData
        }
        
        console.log('Processed items data:', itemsData) // Добавляем лог для отладки
        setItems(itemsData)
    } catch (error) {
        console.error('Error loading my items:', error)
        setItems([])
    } finally {
        setLoading(false)
    }
    }

  const loadStats = async () => {
    try {
      // Здесь можно добавить отдельный API для статистики пользователя
      // Пока используем данные из списка товаров
      if (items.length > 0) {
        const totalViews = items.reduce((sum, item) => sum + (item.views_count || 0), 0)
        const activeItems = items.filter(item => item.status === 'active').length
        
        setStats({
          totalItems: items.length,
          activeItems,
          totalViews,
          totalEarnings: 0 // Будет получено из API контрактов
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleEditItem = (item) => {
    navigate(`/items/${item.id}/edit`)
  }

  const handleDeleteItem = (item) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  const confirmDeleteItem = async () => {
    if (!selectedItem) return
    
    try {
      await itemsAPI.deleteItem(selectedItem.id)
      await loadMyItems()
      setShowDeleteModal(false)
      setSelectedItem(null)
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleToggleStatus = async (item) => {
    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active'
      await itemsAPI.updateItem(item.id, { status: newStatus })
      await loadMyItems()
    } catch (error) {
      console.error('Error updating item status:', error)
    }
  }

  const handleViewAnalytics = (item) => {
    navigate(`/items/${item.id}/analytics`)
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = !selectedStatus || item.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'active', label: 'Активные' },
    { value: 'inactive', label: 'Неактивные' },
    { value: 'rented', label: 'В аренде' },
    { value: 'pending', label: 'На модерации' }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981'
      case 'inactive': return '#6b7280'
      case 'rented': return '#3b82f6'
      case 'pending': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Активен'
      case 'inactive': return 'Неактивен'
      case 'rented': return 'В аренде'
      case 'pending': return 'На модерации'
      default: return status
    }
  }

  return (
    <div className={styles.myItemsPage}>
      <div className="container">
        {/* Заголовок и статистика */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <h1 className={styles.title}>Мои товары</h1>
              <p className={styles.subtitle}>
                Управляйте своими товарами и отслеживайте их эффективность
              </p>
            </div>
            
            <Link to="/items/create">
              <Button variant="primary" icon={<Plus size={16} />}>
                Добавить товар
              </Button>
            </Link>
          </div>

          {/* Статистика */}
          <div className={styles.statsGrid}>
            <Card className={styles.statCard}>
              <div className={styles.statIcon}>
                <Package size={24} />
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.totalItems}</div>
                <div className={styles.statLabel}>Всего товаров</div>
              </div>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statIcon}>
                <Users size={24} />
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.activeItems}</div>
                <div className={styles.statLabel}>Активных</div>
              </div>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statIcon}>
                <Eye size={24} />
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{formatNumber(stats.totalViews)}</div>
                <div className={styles.statLabel}>Просмотров</div>
              </div>
            </Card>

            <Card className={styles.statCard}>
              <div className={styles.statIcon}>
                <DollarSign size={24} />
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{formatCurrency(stats.totalEarnings)}</div>
                <div className={styles.statLabel}>Заработано</div>
              </div>
            </Card>
          </div>
        </div>

        {/* Фильтры и поиск */}
        <Card className={styles.filtersCard}>
          <div className={styles.filtersSection}>
            <div className={styles.searchSection}>
              <Input
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={18} />}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterControls}>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={styles.statusSelect}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className={styles.viewModeControls}>
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'outline'}
                  size="small"
                  onClick={() => setViewMode('grid')}
                  icon={<Grid size={16} />}
                />
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'outline'}
                  size="small"
                  onClick={() => setViewMode('list')}
                  icon={<List size={16} />}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Список товаров */}
        {loading ? (
          <div className={styles.loadingContainer}>
            <Loader size="large" text="Загрузка товаров..." />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className={`${styles.itemsGrid} ${styles[viewMode]}`}>
            {filteredItems.map(item => (
              <Card key={item.id} className={styles.itemCard}>
                <div className={styles.itemImage}>
                  <img 
                    src={item.images?.[0] || '/placeholder-image.jpg'} 
                    alt={item.title}
                    loading="lazy"
                  />
                  <div 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(item.status) }}
                  >
                    {getStatusText(item.status)}
                  </div>
                </div>

                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <h3 className={styles.itemTitle}>
                      <Link to={`/items/${item.id}`}>
                        {item.title}
                      </Link>
                    </h3>
                    <div className={styles.itemActions}>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => handleViewAnalytics(item)}
                        icon={<BarChart3 size={16} />}
                        title="Аналитика"
                      />
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => handleEditItem(item)}
                        icon={<Edit size={16} />}
                        title="Редактировать"
                      />
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => handleDeleteItem(item)}
                        icon={<Trash2 size={16} />}
                        title="Удалить"
                      />
                    </div>
                  </div>

                  <p className={styles.itemDescription}>
                    {item.description?.length > 100 
                      ? `${item.description.substring(0, 100)}...`
                      : item.description
                    }
                  </p>

                  <div className={styles.itemMeta}>
                    <div className={styles.metaItem}>
                      <DollarSign size={14} />
                      <span>{formatCurrency(item.price_per_day || item.pricePerDay)}/день</span>
                    </div>
                    <div className={styles.metaItem}>
                      <Eye size={14} />
                      <span>{item.views_count || 0} просм.</span>
                    </div>
                    <div className={styles.metaItem}>
                      <Calendar size={14} />
                      <span>{formatDate(item.created_at || item.createdAt)}</span>
                    </div>
                  </div>

                  <div className={styles.itemFooter}>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handleToggleStatus(item)}
                    >
                      {item.status === 'active' ? 'Деактивировать' : 'Активировать'}
                    </Button>
                    
                    <Link to={`/items/${item.id}`}>
                      <Button variant="primary" size="small">
                        Просмотр
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Package size={64} />
            </div>
            <h3 className={styles.emptyTitle}>
              {searchQuery || selectedStatus ? 'Товары не найдены' : 'У вас пока нет товаров'}
            </h3>
            <p className={styles.emptyDescription}>
              {searchQuery || selectedStatus 
                ? 'Попробуйте изменить параметры поиска' 
                : 'Добавьте свой первый товар для сдачи в аренду'
              }
            </p>
            <div className={styles.emptyActions}>
              {searchQuery || selectedStatus ? (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedStatus('')
                  }}
                >
                  Очистить фильтры
                </Button>
              ) : (
                <Link to="/items/create">
                  <Button variant="primary" icon={<Plus size={16} />}>
                    Добавить товар
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        )}

        {/* Модальное окно удаления */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Удалить товар"
        >
          <div className={styles.deleteModal}>
            <p>
              Вы уверены, что хотите удалить товар "{selectedItem?.title}"?
              Это действие нельзя отменить.
            </p>
            
            <div className={styles.modalActions}>
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Отмена
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteItem}
              >
                Удалить
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default MyItems