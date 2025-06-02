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
import { useAuth } from '../../../context/AuthContext' // ИСПРАВЛЕНИЕ: Добавлен импорт
import Button from '../../UI/Button/Button'
import styles from './ContractCard.module.css'

const ContractCard = ({ contract, variant = 'default', onAction }) => {
  const { user } = useAuth() // ИСПРАВЛЕНИЕ: Используем хук авторизации
  
  // ИСПРАВЛЕНИЕ: Адаптируем поля под формат бэкенда
  const {
    id,
    item,
    tenant_id,
    owner_id,
    tenant,
    owner,
    start_date,
    end_date,
    total_price,
    deposit,
    status,
    created_at,
    contract_address,
    tenant_signature,
    owner_signature,
  } = contract

  // Используем данные из контракта или создаем заглушки
  const tenantData = tenant || { 
    id: tenant_id,
    first_name: 'Арендатор',
    last_name: '',
    email: 'tenant@example.com'
  }
  
  const ownerData = owner || { 
    id: owner_id,
    first_name: 'Владелец',
    last_name: '',
    email: 'owner@example.com'
  }

  const itemData = item || {
    id: contract.item_id,
    title: 'Товар',
    images: [],
    price_per_day: '0'
  }

  // ИСПРАВЛЕНИЕ: Правильно определяем роль пользователя
  const isOwner = user?.id === owner_id
  const isTenant = user?.id === tenant_id

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

  // ИСПРАВЛЕНИЕ: Правильная логика для отображения кнопок
  const canSign = status === 'pending' && (
    (isOwner && !owner_signature) || (isTenant && !tenant_signature)
  )
  
  const canComplete = status === 'active' && (isOwner || isTenant)
  const canCancel = ['pending', 'signed'].includes(status) && (isOwner || isTenant)
  
  const canPerformActions = canSign || canComplete || canCancel

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
              {isOwner 
                ? `${tenantData?.first_name} ${tenantData?.last_name}`.trim() 
                : `${ownerData?.first_name} ${ownerData?.last_name}`.trim()
              }
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
                {formatCurrency(itemData.price_per_day)}/день
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Действия */}
      <div className={styles.cardActions}>
        {canPerformActions && onAction && (
          <div className={styles.actionButtons}>
            {canSign && (
              <>
                <Button
                  variant="success"
                  size="small"
                  onClick={() => onAction('sign', contract)}
                >
                  Подписать контракт
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => onAction('cancel', contract)}
                >
                  Отклонить
                </Button>
              </>
            )}

            {canComplete && (
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