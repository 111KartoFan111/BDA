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
    category: '',
    minPrice: '',
    maxPrice: '',
    location: '',
    available: true
  })
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('created_at')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [categories, setCategories] = useState([])

  const itemsPerPage = 12

  useEffect(() => {
    loadItems()
    loadCategories()
  }, [currentPage, sortBy, searchQuery, filters])

  const loadItems = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sort: sortBy,
        search: searchQuery,
        ...filters
      }
      
      const response = await itemsAPI.getItems(params)
      setItems(response.data.items || [])
      setTotalPages(response.data.totalPages || 1)
    } catch (error) {
      console.error('Error loading items:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await itemsAPI.getCategories()
      setCategories(response.data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
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
      category: '',
      minPrice: '',
      maxPrice: '',
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
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Все категории</option>
                {categories.map(category => (
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
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                size="small"
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Цена до</label>
              <Input
                type="number"
                placeholder="∞"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
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
                <option value="price_asc">Цена: по возрастанию</option>
                <option value="price_desc">Цена: по убыванию</option>
                <option value="rating">Рейтинг</option>
                <option value="popular">Популярность</option>
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