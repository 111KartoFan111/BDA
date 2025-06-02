// frontend/src/pages/Contracts/ContractsList.jsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Filter, Search, Plus, Calendar } from 'lucide-react'
import { contractsAPI } from '../../services/api/contracts'
import { useAuth } from '../../context/AuthContext'
import { usePaginatedApi } from '../../hooks/useApi'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import Card from '../../components/UI/Card/Card'
import Loader from '../../components/UI/Loader/Loader'
import ContractCard from '../../components/Features/ContractCard/ContractCard'
import { CONTRACT_STATUS } from '../../services/utils/constants'
import toast from 'react-hot-toast'
import styles from './Contracts.module.css'

const ContractsList = () => {
  const { isAuthenticated, user } = useAuth() // ИСПРАВЛЕНИЕ: Добавлен user для отладки
  
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    type: '' // 'owner' | 'tenant' | ''
  })
  
  const [sortBy, setSortBy] = useState('created_at')
  const [showFilters, setShowFilters] = useState(false)

  // Функция для очистки пустых параметров
  const getCleanParams = (filters, sortBy) => {
    const params = {}
    
    // Добавляем только непустые параметры
    if (filters.status && filters.status.trim()) {
      params.status = filters.status.trim()
    }
    if (filters.search && filters.search.trim()) {
      params.search = filters.search.trim()
    }
    if (filters.dateFrom && filters.dateFrom.trim()) {
      params.dateFrom = filters.dateFrom.trim()
    }
    if (filters.dateTo && filters.dateTo.trim()) {
      params.dateTo = filters.dateTo.trim()
    }
    if (filters.type && filters.type.trim()) {
      params.type = filters.type.trim()
    }
    if (sortBy && sortBy.trim()) {
      params.sort = sortBy.trim()
    }
    
    return params
  }

  const {
    items: contracts,
    loading,
    error,
    currentPage,
    totalPages,
    fetchPage,
    refresh
  } = usePaginatedApi(contractsAPI.getUserContracts, {
    itemsPerPage: 12,
    params: getCleanParams(filters, sortBy)
  })

  useEffect(() => {
    if (isAuthenticated) {
      fetchPage(1)
    }
  }, [isAuthenticated, filters, sortBy])

  // ИСПРАВЛЕНИЕ: Добавлена отладочная информация
  useEffect(() => {
    console.log('Current user:', user)
    console.log('Contracts loaded:', contracts)
    if (contracts.length > 0) {
      console.log('Sample contract:', contracts[0])
    }
  }, [contracts, user])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSortChange = (e) => {
    setSortBy(e.target.value)
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      search: '',
      dateFrom: '',
      dateTo: '',
      type: ''
    })
  }

  const handlePageChange = (page) => {
    fetchPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ИСПРАВЛЕНИЕ: Полностью переписанная функция обработки действий
  const handleContractAction = async (action, contract) => {
    try {
      console.log('Contract action:', action, 'for contract:', contract.id)
      console.log('Contract data:', contract)
      console.log('User role - isOwner:', user?.id === contract.owner_id, 'isTenant:', user?.id === contract.tenant_id)
      
      switch (action) {
        case 'approve':
        case 'sign':
          // ИСПРАВЛЕНИЕ: Правильное формирование подписи
          const signatureData = {
            signature: `digital_signature_${user?.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
          console.log('Signing with data:', signatureData)
          
          await contractsAPI.signContract(contract.id, signatureData)
          toast.success('Контракт успешно подписан!')
          break
          
        case 'reject':
        case 'cancel':
          console.log('Cancelling contract:', contract.id)
          await contractsAPI.cancelContract(contract.id, 'Отклонено пользователем')
          toast.success('Контракт отменен')
          break
          
        case 'complete':
          console.log('Completing contract:', contract.id)
          await contractsAPI.completeContract(contract.id)
          toast.success('Контракт завершен')
          break
          
        case 'extend':
          toast.info('Функция продления будет доступна позже')
          break
          
        default:
          toast.error(`Неизвестное действие: ${action}`)
          return
      }
      
      // Обновляем список после действия
      console.log('Refreshing contracts list...')
      refresh()
      
    } catch (error) {
      console.error('Contract action error:', error)
      console.error('Error response:', error.response)
      
      // Детальная обработка ошибок
      let errorMessage = 'Ошибка при выполнении действия'
      
      if (error.response?.status === 422) {
        // Ошибки валидации
        if (error.response.data?.detail) {
          if (Array.isArray(error.response.data.detail)) {
            const errorMessages = error.response.data.detail.map(err => err.msg || err.message || err).join(', ')
            errorMessage = `Ошибки валидации: ${errorMessages}`
          } else {
            errorMessage = error.response.data.detail
          }
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message
        } else {
          errorMessage = 'Ошибка валидации данных'
        }
      } else if (error.response?.status === 405) {
        errorMessage = 'Операция недоступна для данного контракта'
      } else if (error.response?.status === 404) {
        errorMessage = 'Контракт не найден'
      } else if (error.response?.status === 403) {
        errorMessage = 'У вас нет прав для выполнения этого действия'
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || error.response.data?.detail || 'Некорректный запрос'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    }
  }

  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: CONTRACT_STATUS.PENDING, label: 'Ожидает подписания' },
    { value: CONTRACT_STATUS.ACTIVE, label: 'Активные' },
    { value: CONTRACT_STATUS.COMPLETED, label: 'Завершенные' },
    { value: CONTRACT_STATUS.CANCELLED, label: 'Отмененные' },
    { value: CONTRACT_STATUS.DISPUTED, label: 'Спорные' }
  ]

  const sortOptions = [
    { value: 'created_at', label: 'Дата создания' },
    { value: 'start_date', label: 'Дата начала' },
    { value: 'end_date', label: 'Дата окончания' },
    { value: 'total_price', label: 'Стоимость' }
  ]

  const typeOptions = [
    { value: '', label: 'Все контракты' },
    { value: 'owner', label: 'Я владелец' },
    { value: 'tenant', label: 'Я арендатор' }
  ]

  if (!isAuthenticated) {
    return (
      <div className={styles.authRequired}>
        <div className={styles.authContent}>
          <FileText size={64} />
          <h2>Требуется авторизация</h2>
          <p>Войдите в систему, чтобы просматривать ваши контракты</p>
          <Link to="/login">
            <Button variant="primary">Войти в систему</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.contractsPage}>
      <div className="container">
        {/* Заголовок */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <h1 className={styles.title}>Мои контракты</h1>
              <p className={styles.subtitle}>
                Управляйте вашими договорами аренды
              </p>
            </div>
            
            <div className={styles.headerActions}>
              <Link to="/contracts/create">
                <Button
                  variant="primary"
                  icon={<Plus size={16} />}
                >
                  Создать контракт
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Фильтры и поиск */}
        <Card className={styles.filtersCard}>
          <div className={styles.filtersHeader}>
            <div className={styles.searchSection}>
              <Input
                placeholder="Поиск по названию товара..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                icon={<Search size={18} />}
                className={styles.searchInput}
              />
            </div>
            
            <div className={styles.filterActions}>
              <Button
                variant="outline"
                size="small"
                onClick={() => setShowFilters(!showFilters)}
                icon={<Filter size={16} />}
              >
                Фильтры
              </Button>
              
              <Button
                variant="outline"
                size="small"
                onClick={clearFilters}
              >
                Очистить
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className={styles.filtersSection}>
              <div className={styles.filterRow}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Статус</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className={styles.filterSelect}
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Тип</label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className={styles.filterSelect}
                  >
                    {typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>С даты</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className={styles.filterInput}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>По дату</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className={styles.filterInput}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Сортировка</label>
                  <select
                    value={sortBy}
                    onChange={handleSortChange}
                    className={styles.filterSelect}
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Результаты */}
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsCount}>
              {loading ? (
                'Загрузка...'
              ) : (
                `Найдено контрактов: ${contracts.length}`
              )}
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <Loader size="large" text="Загрузка контрактов..." />
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <h3>Ошибка загрузки</h3>
              <p>{error}</p>
              <Button onClick={refresh}>Попробовать снова</Button>
            </div>
          ) : contracts.length > 0 ? (
            <>
              <div className={styles.contractsGrid}>
                {contracts.map(contract => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onAction={handleContractAction}
                  />
                ))}
              </div>

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Назад
                  </Button>
                  
                  <div className={styles.paginationPages}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'primary' : 'ghost'}
                        size="small"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Вперед
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FileText size={64} />
              </div>
              <h3 className={styles.emptyTitle}>Контракты не найдены</h3>
              <p className={styles.emptyDescription}>
                {filters.search || filters.status || filters.type
                  ? 'Попробуйте изменить параметры поиска'
                  : 'У вас пока нет контрактов. Найдите товар для аренды или создайте предложение.'
                }
              </p>
              <div className={styles.emptyActions}>
                <Link to="/contracts/create">
                  <Button variant="primary" icon={<Plus size={16} />}>
                    Создать контракт
                  </Button>
                </Link>
                <Link to="/items">
                  <Button className={styles.walletButton} variant="outline">
                    Найти товары
                  </Button>
                </Link>
                <Link to="/items/create">
                  <Button variant="ghost">
                    Добавить товар
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ContractsList