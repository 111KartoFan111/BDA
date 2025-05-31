// frontend/src/components/Features/ItemSearchModal/ItemSearchModal.jsx
import React, { useState } from 'react'
import { Search, FileText } from 'lucide-react'
import Modal from '../../UI/Modal/Modal'
import Input from '../../UI/Input/Input'
import Button from '../../UI/Button/Button'
import Loader from '../../UI/Loader/Loader'
import { formatCurrency } from '../../../services/utils/formatting'
import styles from './ItemSearchModal.module.css'

const ItemSearchModal = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  items = [], 
  loading = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  
  // Фильтруем товары по поисковому запросу
  const filteredItems = Array.isArray(items) ? items.filter(item => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : []

  const handleItemSelect = (item) => {
    onSelect(item)
    setSearchQuery('') // Очищаем поиск
  }

  const handleClose = () => {
    onClose()
    setSearchQuery('') // Очищаем поиск при закрытии
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Выберите товар"
      size="large"
    >
      <div className={styles.itemSearchModal}>
        {/* Поиск */}
        <div className={styles.searchSection}>
          <Input
            placeholder="Поиск по названию или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} />}
            fullWidth
          />
        </div>

        {/* Результаты */}
        <div className={styles.resultsSection}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <Loader size="medium" text="Загрузка товаров..." />
            </div>
          ) : filteredItems.length > 0 ? (
            <div className={styles.itemsList}>
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={styles.itemCard}
                  onClick={() => handleItemSelect(item)}
                >
                  <div className={styles.itemImage}>
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.title} />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <FileText size={24} />
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.itemInfo}>
                    <h4 className={styles.itemTitle}>{item.title}</h4>
                    <p className={styles.itemDescription}>
                      {item.description?.length > 100 
                        ? `${item.description.slice(0, 100)}...` 
                        : item.description
                      }
                    </p>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemPrice}>
                        {formatCurrency(item.price_per_day || item.pricePerDay)}/день
                      </span>
                      {item.location && (
                        <span className={styles.itemLocation}>
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.selectButton}>
                    <Button size="small" variant="primary">
                      Выбрать
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={64} />
              <h3>Нет товаров</h3>
              <p>У вас пока нет активных товаров для аренды</p>
              <Button
                variant="primary"
                onClick={() => window.open('/items/create', '_blank')}
              >
                Добавить товар
              </Button>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Search size={64} />
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить поисковый запрос</p>
            </div>
          )}
        </div>

        {/* Действия */}
        <div className={styles.modalActions}>
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ItemSearchModal