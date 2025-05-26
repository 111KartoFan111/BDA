import React, { useState, useEffect } from 'react'
import { Grid, List, Filter, Sort } from 'lucide-react'
import { itemsAPI } from '../../../services/api/items'
import { usePaginatedApi } from '../../../hooks/useApi'
import Button from '../../UI/Button/Button'
import Loader from '../../UI/Loader/Loader'
import ItemCard from '../ItemCard/ItemCard'
import styles from './ItemList.module.css'

const ItemList = ({ 
  filters = {}, 
  searchQuery = '', 
  viewMode = 'grid',
  onViewModeChange,
  showFilters = true,
  showSort = true,
  itemsPerPage = 12 
}) => {
  const [sortBy, setSortBy] = useState('created_at')
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  
  const {
    items,
    loading,
    error,
    currentPage,
    totalPages,
    hasMore,
    fetchPage,
    loadMore
  } = usePaginatedApi(itemsAPI.getItems, {
    itemsPerPage,
    params: {
      ...filters,
      search: searchQuery,
      sort: sortBy
    }
  })

  useEffect(() => {
    fetchPage(1)
  }, [filters, searchQuery, sortBy])

  const handleSortChange = (newSort) => {
    setSortBy(newSort)
  }

  const handlePageChange = (page) => {
    fetchPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sortOptions = [
    { value: 'created_at', label: 'Дата добавления' },
    { value: 'price_asc', label: 'Цена: по возрастанию' },
    { value: 'price_desc', label: 'Цена: по убыванию' },
    { value: 'rating', label: 'Рейтинг' },
    { value: 'popular', label: 'Популярность' },
    { value: 'title', label: 'По алфавиту' }
  ]

  const viewModes = [
    { mode: 'grid', icon: <Grid size={16} />, label: 'Сетка' },
    { mode: 'list', icon: <List size={16} />, label: 'Список' }
  ]

  if (loading && currentPage === 1) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size="large" text="Загрузка товаров..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>
          <h3>Ошибка загрузки товаров</h3>
          <p>{error}</p>
          <Button onClick={() => fetchPage(1)}>
            Попробовать снова
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.itemList}>
      {/* Панель управления */}
      <div className={styles.controlPanel}>
        <div className={styles.leftControls}>
          <div className={styles.resultsInfo}>
            Найдено товаров: {items.length}
          </div>
          
          {showFilters && (
            <Button
              variant="outline"
              size="small"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              icon={<Filter size={16} />}
            >
              Фильтры
            </Button>
          )}
        </div>

        <div className={styles.rightControls}>
          {showSort && (
            <div className={styles.sortControl}>
              <label className={styles.sortLabel}>
                <Sort size={16} />
                Сортировка:
              </label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className={styles.sortSelect}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onViewModeChange && (
            <div className={styles.viewModeControl}>
              {viewModes.map(({ mode, icon, label }) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'primary' : 'outline'}
                  size="small"
                  onClick={() => onViewModeChange(mode)}
                  icon={icon}
                  title={label}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Список товаров */}
      {items.length > 0 ? (
        <>
          <div className={`${styles.itemsGrid} ${styles[viewMode]}`}>
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                className={viewMode === 'list' ? styles.listItem : ''}
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
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page
                  if (totalPages <= 5) {
                    page = i + 1
                  } else if (currentPage <= 3) {
                    page = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i
                  } else {
                    page = currentPage - 2 + i
                  }
                  
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'primary' : 'ghost'}
                      size="small"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  )
                })}
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

          {/* Кнопка "Загрузить еще" для бесконечной прокрутки */}
          {hasMore && (
            <div className={styles.loadMoreContainer}>
              <Button
                variant="outline"
                onClick={loadMore}
                loading={loading}
              >
                Загрузить еще
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Grid size={48} />
          </div>
          <h3 className={styles.emptyTitle}>Товары не найдены</h3>
          <p className={styles.emptyDescription}>
            {searchQuery || Object.keys(filters).length > 0
              ? 'Попробуйте изменить параметры поиска или очистить фильтры'
              : 'В данный момент нет доступных товаров'
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default ItemList