import React, { useState, useEffect } from 'react'
import { Search, Filter, Grid, List, MapPin, Calendar } from 'lucide-react'
import { itemsAPI } from '../../services/api/items'
import Button from '../../components/UI/Button/Button'
import Input from '../../components/UI/Input/Input'
import Card from '../../components/UI/Card/Card'
import Loader from '../../components/UI/Loader/Loader'
import ItemCard from '../../components/Features/ItemCard/ItemCard'
import styles from './Items.module.css'

const ItemsList = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    category_id: '',
    min_price: '',
    max_price: '',
    location: '',
    available: true
  })
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('created_at')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [categories, setCategories] = useState([])
  const [error, setError] = useState(null)

  const itemsPerPage = 12

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadItems()
  }, [currentPage, sortBy, searchQuery, filters])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = {
        page: currentPage,
        size: itemsPerPage,
        sort_by: sortBy,
        sort_order: sortBy.includes('_desc') ? 'desc' : 'asc',
        query: searchQuery || undefined,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
        )
      }
      
      console.log('Loading items with params:', params)
      
      const response = await itemsAPI.getItems(params)
      console.log('Items API response:', response)
      
      // Обрабатываем ответ от API
      const responseData = response.data
      
      if (responseData.success !== false) {
        // Если это пагинированный ответ
        if (responseData.items) {
          setItems(responseData.items)
          setTotalPages(responseData.meta?.pages || Math.ceil((responseData.meta?.total || 0) / itemsPerPage))
        } 
        // Если это прямой массив данных
        else if (Array.isArray(responseData.data)) {
          setItems(responseData.data)
          setTotalPages(1)
        }
        // Если это массив в data
        else if (Array.isArray(responseData)) {
          setItems(responseData)
          setTotalPages(1)
        }
        else {
          console.warn('Unexpected response structure:', responseData)
          setItems([])
          setTotalPages(1)
        }
      } else {
        setError(responseData.message || 'Ошибка загрузки товаров')
        setItems([])
      }
    } catch (error) {
      console.error('Error loading items:', error)
      setError(error.response?.data?.message || error.message || 'Ошибка загрузки товаров')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      console.log('Loading categories...')
      const response = await itemsAPI.getCategories()
      console.log('Categories API response:', response)
      
      // Обрабатываем ответ от API
      const responseData = response.data
      
      if (responseData.success !== false) {
        let categoriesData = []
        
        // Проверяем различные возможные структуры ответа
        if (Array.isArray(responseData.data)) {
          categoriesData = responseData.data
        } else if (Array.isArray(responseData)) {
          categoriesData = responseData
        } else if (responseData.data && Array.isArray(responseData.data)) {
          categoriesData = responseData.data
        }
        
        console.log('Processed categories:', categoriesData)
        setCategories(categoriesData)
      } else {
        console.error('Categories API error:', responseData.message)
        setCategories([])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setCurrentPage(1)
  }

  const handleSortChange = (e) => {
    setSortBy(e.target.value)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      category_id: '',
      min_price: '',
      max_price: '',
      location: '',
      available: true
    })
    setSearchQuery('')
    setCurrentPage(1)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error) {
    return (
      <div className={styles.itemsPage}>
        <div className="container">
          <div className={styles.errorContainer}>
            <h2>Ошибка загрузки</h2>
            <p>{error}</p>
            <Button onClick={() => window.location.reload()}>
              Обновить страницу
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.itemsPage}>
      <div className="container">
        {/* Заголовок */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Каталог товаров</h1>
            <p className={styles.subtitle}>
              Найдите идеальный товар для аренды из нашего каталога
            </p>
          </div>
        </div>

        {/* Поиск и фильтры */}
        <Card className={styles.filtersCard}>
          <div className={styles.searchSection}>
            <Input
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={handleSearch}
              icon={<Search size={18} />}
              className={styles.searchInput}
            />
            
            <div className={styles.viewControls}>
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

          <div className={styles.filtersSection}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Категория</label>
              <select
                value={filters.category_id}
                onChange={(e) => handleFilterChange('category_id', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Все категории</option>
                {Array.isArray(categories) && categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Цена от</label>
              <Input
                type="number"
                placeholder="0"
                value={filters.min_price}
                onChange={(e) => handleFilterChange('min_price', e.target.value)}
                size="small"
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Цена до</label>
              <Input
                type="number"
                placeholder="∞"
                value={filters.max_price}
                onChange={(e) => handleFilterChange('max_price', e.target.value)}
                size="small"
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Местоположение</label>
              <Input
                placeholder="Город"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                icon={<MapPin size={16} />}
                size="small"
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Сортировка</label>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className={styles.filterSelect}
              >
                <option value="created_at">Дата добавления</option>
                <option value="price_per_day">Цена: по возрастанию</option>
                <option value="price_per_day_desc">Цена: по убыванию</option>
                <option value="rating">Рейтинг</option>
                <option value="views_count">Популярность</option>
                <option value="title">По алфавиту</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="small"
              onClick={clearFilters}
              className={styles.clearButton}
            >
              Очистить
            </Button>
          </div>
        </Card>

        {/* Результаты */}
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsCount}>
              {loading ? (
                'Загрузка...'
              ) : (
                `Найдено товаров: ${items.length}`
              )}
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <Loader size="large" text="Загрузка товаров..." />
            </div>
          ) : items.length > 0 ? (
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
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Search size={48} />
              </div>
              <h3 className={styles.emptyTitle}>Товары не найдены</h3>
              <p className={styles.emptyDescription}>
                Попробуйте изменить параметры поиска или очистить фильтры
              </p>
              <Button variant="primary" onClick={clearFilters}>
                Очистить фильтры
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ItemsList