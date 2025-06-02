import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Calendar, 
  DollarSign, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { formatCurrency, formatDate, formatRentalDuration } from '../../../services/utils/formatting'
import { CONTRACT_STATUS } from '../../../services/utils/constants'
import Button from '../../UI/Button/Button'
import styles from './ContractCard.module.css'

const ContractCard = ({ contract, variant = 'default', onAction }) => {
  // ИСПРАВЛЕНИЕ: Адаптируем поля под формат бэкенда
  const {
    id,
    item, // может отсутствовать - нужно обработать
    tenant_id,
    owner_id,
    start_date,
    end_date,
    total_price,
    deposit,
    status,
    created_at,
    contract_address,
    // Определяем роль пользователя (в реальном приложении получаем из контекста)
  } = contract

  // Временные заглушки для недостающих данных
  const tenant = { 
    id: tenant_id,
    name: 'Арендатор', // В реальном приложении должны быть данные пользователя
    email: 'tenant@example.com'
  }
  
  const owner = { 
    id: owner_id,
    name: 'Владелец',
    email: 'owner@example.com'
  }

  const itemData = item || {
    id: contract.item_id,
    title: 'Товар',
    images: [],
    pricePerDay: '0'
  }

  // Определяем является ли текущий пользователь владельцем (заглушка)
  const isOwner = true // В реальном приложении: user?.id === owner_id

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={16} className={styles.statusIconActive} />
      case 'completed':
        return <CheckCircle size={16} className={styles.statusIconCompleted} />
      case 'cancelled':
        return <XCircle size={16} className={styles.statusIconCancelled} />
      case 'disputed':
        return <AlertCircle size={16} className={styles.statusIconDisputed} />
      case 'pending':
        return <Clock size={16} className={styles.statusIconPending} />
      default:
        return <Clock size={16} className={styles.statusIconDefault} />
    }
  }

  const getStatusText = (status) => {
    const statusMap = {
      'draft': 'Черновик',
      'pending': 'Ожидает подписания',
      'signed': 'Подписан',
      'active': 'Активный',
      'completed': 'Завершен',
      'cancelled': 'Отменен',
      'disputed': 'Спор',
      'expired': 'Истек'
    }
    return statusMap[status] || status
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return styles.statusActive
      case 'completed':
        return styles.statusCompleted
      case 'cancelled':
        return styles.statusCancelled
      case 'disputed':
        return styles.statusDisputed
      case 'pending':
        return styles.statusPending
      default:
        return styles.statusDefault
    }
  }

  const canPerformActions = status === 'pending' || status === 'active'

  const cardClasses = [
    styles.contractCard,
    styles[variant],
    getStatusClass(status)
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClasses}>
      {/* Заголовок карточки */}
      <div className={styles.cardHeader}>
        <div className={styles.contractInfo}>
          <h3 className={styles.contractTitle}>
            {itemData?.title || 'Товар удален'}
          </h3>
          <div className={styles.contractId}>
            Контракт #{id.slice(0, 8)}...
          </div>
        </div>
        
        <div className={styles.statusBadge}>
          {getStatusIcon(status)}
          <span>{getStatusText(status)}</span>
        </div>
      </div>

      {/* Основная информация */}
      <div className={styles.cardContent}>
        <div className={styles.contractDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>
              <User size={16} />
              {isOwner ? 'Арендатор' : 'Владелец'}
            </span>
            <span className={styles.detailValue}>
              {isOwner ? tenant?.name : owner?.name}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>
              <Calendar size={16} />
              Период аренды
            </span>
            <span className={styles.detailValue}>
              {formatDate(start_date)} - {formatDate(end_date)}
              <span className={styles.duration}>
                ({formatRentalDuration(start_date, end_date)})
              </span>
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>
              <DollarSign size={16} />
              Стоимость
            </span>
            <span className={styles.detailValue}>
              {formatCurrency(total_price)}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>
              <Clock size={16} />
              Создан
            </span>
            <span className={styles.detailValue}>
              {formatDate(created_at)}
            </span>
          </div>

          {contract_address && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                <ExternalLink size={16} />
                Блокчейн
              </span>
              <a
                href={`https://sepolia.etherscan.io/address/${contract_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.blockchainLink}
              >
                {contract_address.slice(0, 6)}...{contract_address.slice(-4)}
              </a>
            </div>
          )}
        </div>

        {/* Превью товара */}
        {itemData && (
          <div className={styles.itemPreview}>
            <div className={styles.itemImage}>
              {itemData.images?.[0] ? (
                <img src={itemData.images[0]} alt={itemData.title} />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <User size={24} />
                </div>
              )}
            </div>
            <div className={styles.itemInfo}>
              <div className={styles.itemTitle}>{itemData.title}</div>
              <div className={styles.itemPrice}>
                {formatCurrency(itemData.pricePerDay)}/день
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Действия */}
      <div className={styles.cardActions}>
        {canPerformActions && onAction && (
          <div className={styles.actionButtons}>
            {status === 'pending' && isOwner && (
              <>
                <Button
                  variant="success"
                  size="small"
                  onClick={() => onAction('approve', contract)}
                >
                  Одобрить
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => onAction('reject', contract)}
                >
                  Отклонить
                </Button>
              </>
            )}

            {status === 'active' && (
              <>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => onAction('complete', contract)}
                >
                  Завершить
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => onAction('extend', contract)}
                >
                  Продлить
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ContractCard