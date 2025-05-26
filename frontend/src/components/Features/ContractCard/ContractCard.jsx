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
  const {
    id,
    item,
    tenant,
    owner,
    startDate,
    endDate,
    totalPrice,
    status,
    createdAt,
    contractAddress,
    isOwner
  } = contract

  const getStatusIcon = (status) => {
    switch (status) {
      case CONTRACT_STATUS.ACTIVE:
        return <CheckCircle size={16} className={styles.statusIconActive} />
      case CONTRACT_STATUS.COMPLETED:
        return <CheckCircle size={16} className={styles.statusIconCompleted} />
      case CONTRACT_STATUS.CANCELLED:
        return <XCircle size={16} className={styles.statusIconCancelled} />
      case CONTRACT_STATUS.DISPUTED:
        return <AlertCircle size={16} className={styles.statusIconDisputed} />
      case CONTRACT_STATUS.PENDING:
        return <Clock size={16} className={styles.statusIconPending} />
      default:
        return <Clock size={16} className={styles.statusIconDefault} />
    }
  }

  const getStatusText = (status) => {
    const statusMap = {
      [CONTRACT_STATUS.DRAFT]: 'Черновик',
      [CONTRACT_STATUS.PENDING]: 'Ожидает подписания',
      [CONTRACT_STATUS.SIGNED]: 'Подписан',
      [CONTRACT_STATUS.ACTIVE]: 'Активный',
      [CONTRACT_STATUS.COMPLETED]: 'Завершен',
      [CONTRACT_STATUS.CANCELLED]: 'Отменен',
      [CONTRACT_STATUS.DISPUTED]: 'Спор',
      [CONTRACT_STATUS.EXPIRED]: 'Истек'
    }
    return statusMap[status] || status
  }

  const getStatusClass = (status) => {
    switch (status) {
      case CONTRACT_STATUS.ACTIVE:
        return styles.statusActive
      case CONTRACT_STATUS.COMPLETED:
        return styles.statusCompleted
      case CONTRACT_STATUS.CANCELLED:
        return styles.statusCancelled
      case CONTRACT_STATUS.DISPUTED:
        return styles.statusDisputed
      case CONTRACT_STATUS.PENDING:
        return styles.statusPending
      default:
        return styles.statusDefault
    }
  }

  const canPerformActions = status === CONTRACT_STATUS.PENDING || status === CONTRACT_STATUS.ACTIVE

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
            {item?.title || 'Товар удален'}
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
              {formatDate(startDate)} - {formatDate(endDate)}
              <span className={styles.duration}>
                ({formatRentalDuration(startDate, endDate)})
              </span>
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>
              <DollarSign size={16} />
              Стоимость
            </span>
            <span className={styles.detailValue}>
              {formatCurrency(totalPrice)}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>
              <Clock size={16} />
              Создан
            </span>
            <span className={styles.detailValue}>
              {formatDate(createdAt)}
            </span>
          </div>

          {contractAddress && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                <ExternalLink size={16} />
                Блокчейн
              </span>
              <a
                href={`https://sepolia.etherscan.io/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.blockchainLink}
              >
                {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
              </a>
            </div>
          )}
        </div>

        {/* Превью товара */}
        {item && (
          <div className={styles.itemPreview}>
            <div className={styles.itemImage}>
              {item.images?.[0] ? (
                <img src={item.images[0]} alt={item.title} />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <User size={24} />
                </div>
              )}
            </div>
            <div className={styles.itemInfo}>
              <div className={styles.itemTitle}>{item.title}</div>
              <div className={styles.itemPrice}>
                {formatCurrency(item.pricePerDay)}/день
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Действия */}
      <div className={styles.cardActions}>
        <Link to={`/contracts/${id}`} className={styles.viewButton}>
          <Button variant="outline" size="small" fullWidth>
            Подробнее
          </Button>
        </Link>

        {canPerformActions && onAction && (
          <div className={styles.actionButtons}>
            {status === CONTRACT_STATUS.PENDING && isOwner && (
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

            {status === CONTRACT_STATUS.ACTIVE && (
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