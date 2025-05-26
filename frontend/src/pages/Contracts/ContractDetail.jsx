import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  DollarSign, 
  User,
  MessageCircle,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Flag
} from 'lucide-react'
import { contractsAPI } from '../../services/api/contracts'
import { useAuth } from '../../context/AuthContext'
import { useWeb3 } from '../../context/Web3Context'
import { useApi } from '../../hooks/useApi'
import Button from '../../components/UI/Button/Button'
import Card from '../../components/UI/Card/Card'
import Loader from '../../components/UI/Loader/Loader'
import Modal from '../../components/UI/Modal/Modal'
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime,
  formatWalletAddress 
} from '../../services/utils/formatting'
import { CONTRACT_STATUS } from '../../services/utils/constants'
import styles from './Contracts.module.css'

const ContractDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createRentalContract, getContractInfo } = useWeb3()
  
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState(null)
  const [actionReason, setActionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [contractInfo, setContractInfo] = useState(null)

  const { 
    data: contract, 
    loading, 
    error,
    refresh 
  } = useApi(() => contractsAPI.getContract(id), [id])

  const { 
    data: contractHistory 
  } = useApi(() => contractsAPI.getContractHistory(id), [id])

  const { 
    data: messages,
    refresh: refreshMessages 
  } = useApi(() => contractsAPI.getMessages(id), [id])

  useEffect(() => {
    if (contract?.contractAddress) {
      loadBlockchainInfo()
    }
  }, [contract])

  const loadBlockchainInfo = async () => {
    try {
      const info = await getContractInfo(contract.contractAddress)
      if (info.success) {
        setContractInfo(info.data)
      }
    } catch (error) {
      console.error('Error loading blockchain info:', error)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case CONTRACT_STATUS.ACTIVE:
        return <CheckCircle size={20} className={styles.statusIconActive} />
      case CONTRACT_STATUS.COMPLETED:
        return <CheckCircle size={20} className={styles.statusIconCompleted} />
      case CONTRACT_STATUS.CANCELLED:
        return <AlertCircle size={20} className={styles.statusIconCancelled} />
      case CONTRACT_STATUS.DISPUTED:
        return <Flag size={20} className={styles.statusIconDisputed} />
      case CONTRACT_STATUS.PENDING:
        return <Clock size={20} className={styles.statusIconPending} />
      default:
        return <FileText size={20} className={styles.statusIconDefault} />
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

  const handleAction = (action) => {
    setSelectedAction(action)
    setActionReason('')
    setIsActionModalOpen(true)
  }

  const executeAction = async () => {
    if (!selectedAction) return
    
    setIsProcessing(true)
    
    try {
      switch (selectedAction) {
        case 'sign':
          await contractsAPI.signContract(id)
          break
        case 'deploy':
          await deployToBlockchain()
          break
        case 'complete':
          await contractsAPI.completeContract(id)
          break
        case 'cancel':
          await contractsAPI.cancelContract(id, actionReason)
          break
        case 'dispute':
          await contractsAPI.createDispute(id, {
            reason: actionReason,
            description: actionReason
          })
          break
        default:
          break
      }
      
      refresh()
      setIsActionModalOpen(false)
    } catch (error) {
      console.error('Action error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const deployToBlockchain = async () => {
    try {
      const result = await createRentalContract({
        tenant: contract.tenant.walletAddress,
        itemId: contract.item.id,
        amount: contract.totalPrice,
        duration: Math.ceil((new Date(contract.endDate) - new Date(contract.startDate)) / (1000 * 60 * 60 * 24)),
        deposit: contract.deposit || 0
      })
      
      if (result.success) {
        await contractsAPI.activateContract(id, result.data.contractAddress, result.data.transactionHash)
      }
    } catch (error) {
      console.error('Blockchain deployment error:', error)
      throw error
    }
  }

  const downloadContract = async () => {
    try {
      await contractsAPI.exportToPdf(id)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size="large" text="Загрузка контракта..." />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className={styles.errorContainer}>
        <h2>Контракт не найден</h2>
        <p>Запрашиваемый контракт не существует или у вас нет прав для его просмотра.</p>
        <Button onClick={() => navigate('/contracts')}>
          Вернуться к списку
        </Button>
      </div>
    )
  }

  const isOwner = user?.id === contract.owner?.id
  const isTenant = user?.id === contract.tenant?.id
  const canSign = contract.status === CONTRACT_STATUS.PENDING && isTenant
  const canDeploy = contract.status === CONTRACT_STATUS.SIGNED && isOwner && !contract.contractAddress
  const canComplete = contract.status === CONTRACT_STATUS.ACTIVE && (isOwner || isTenant)
  const canCancel = [CONTRACT_STATUS.PENDING, CONTRACT_STATUS.SIGNED].includes(contract.status)
  const canDispute = contract.status === CONTRACT_STATUS.ACTIVE

  return (
    <div className={styles.contractDetailPage}>
      <div className="container">
        {/* Навигация */}
        <div className={styles.breadcrumbs}>
          <Button
            variant="ghost"
            onClick={() => navigate('/contracts')}
            icon={<ArrowLeft size={16} />}
          >
            Назад к контрактам
          </Button>
        </div>

        {/* Заголовок */}
        <div className={styles.contractHeader}>
          <div className={styles.headerInfo}>
            <h1 className={styles.contractTitle}>
              Контракт #{contract.id.slice(0, 8)}...
            </h1>
            <div className={styles.contractStatus}>
              {getStatusIcon(contract.status)}
              <span>{getStatusText(contract.status)}</span>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <Button
              variant="outline"
              size="small"
              onClick={downloadContract}
              icon={<Download size={16} />}
            >
              Скачать PDF
            </Button>
          </div>
        </div>

        <div className={styles.contractContent}>
          {/* Основная информация */}
          <div className={styles.mainSection}>
            {/* Информация о товаре */}
            <Card className={styles.itemCard}>
              <h3 className={styles.sectionTitle}>Арендуемый товар</h3>
              <div className={styles.itemInfo}>
                <div className={styles.itemImage}>
                  {contract.item.images?.[0] ? (
                    <img src={contract.item.images[0]} alt={contract.item.title} />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <FileText size={24} />
                    </div>
                  )}
                </div>
                <div className={styles.itemDetails}>
                  <h4 className={styles.itemTitle}>
                    <Link to={`/items/${contract.item.id}`}>
                      {contract.item.title}
                    </Link>
                  </h4>
                  <p className={styles.itemDescription}>
                    {contract.item.description}
                  </p>
                  <div className={styles.itemMeta}>
                    <span>Категория: {contract.item.category}</span>
                    <span>Цена: {formatCurrency(contract.item.pricePerDay)}/день</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Детали контракта */}
            <Card className={styles.detailsCard}>
              <h3 className={styles.sectionTitle}>Детали аренды</h3>
              <div className={styles.contractDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>
                    <Calendar size={16} />
                    Период аренды
                  </span>
                  <span className={styles.detailValue}>
                    {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                  </span>
                </div>

                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>
                    <DollarSign size={16} />
                    Общая стоимость
                  </span>
                  <span className={styles.detailValue}>
                    {formatCurrency(contract.totalPrice)}
                  </span>
                </div>

                {contract.deposit > 0 && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>
                      <DollarSign size={16} />
                      Залог
                    </span>
                    <span className={styles.detailValue}>
                      {formatCurrency(contract.deposit)}
                    </span>
                  </div>
                )}

                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>
                    <Clock size={16} />
                    Создан
                  </span>
                  <span className={styles.detailValue}>
                    {formatDateTime(contract.createdAt)}
                  </span>
                </div>

                {contract.contractAddress && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>
                      <ExternalLink size={16} />
                      Блокчейн
                    </span>
                    <a
                      href={`https://sepolia.etherscan.io/address/${contract.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.blockchainLink}
                    >
                      {formatWalletAddress(contract.contractAddress)}
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {/* Участники */}
            <Card className={styles.participantsCard}>
              <h3 className={styles.sectionTitle}>Участники</h3>
              <div className={styles.participants}>
                <div className={styles.participant}>
                  <div className={styles.participantHeader}>
                    <User size={20} />
                    <h4>Владелец</h4>
                  </div>
                  <div className={styles.participantInfo}>
                    <div className={styles.participantName}>
                      {contract.owner.firstName} {contract.owner.lastName}
                    </div>
                    <div className={styles.participantMeta}>
                      {contract.owner.email}
                    </div>
                  </div>
                </div>

                <div className={styles.participant}>
                  <div className={styles.participantHeader}>
                    <User size={20} />
                    <h4>Арендатор</h4>
                  </div>
                  <div className={styles.participantInfo}>
                    <div className={styles.participantName}>
                      {contract.tenant.firstName} {contract.tenant.lastName}
                    </div>
                    <div className={styles.participantMeta}>
                      {contract.tenant.email}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Боковая панель */}
          <div className={styles.sidebar}>
            {/* Действия */}
            <Card className={styles.actionsCard}>
              <h3 className={styles.sectionTitle}>Действия</h3>
              <div className={styles.actionsList}>
                {canSign && (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => handleAction('sign')}
                  >
                    Подписать контракт
                  </Button>
                )}

                {canDeploy && (
                  <Button
                    variant="success"
                    fullWidth
                    onClick={() => handleAction('deploy')}
                  >
                    Развернуть в блокчейн
                  </Button>
                )}

                {canComplete && (
                  <Button
                    variant="success"
                    fullWidth
                    onClick={() => handleAction('complete')}
                  >
                    Завершить аренду
                  </Button>
                )}

                {canCancel && (
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => handleAction('cancel')}
                  >
                    Отменить контракт
                  </Button>
                )}

                {canDispute && (
                  <Button
                    variant="warning"
                    fullWidth
                    onClick={() => handleAction('dispute')}
                    icon={<Flag size={16} />}
                  >
                    Открыть спор
                  </Button>
                )}

                <Button
                  variant="outline"
                  fullWidth
                  icon={<MessageCircle size={16} />}
                >
                  Написать сообщение
                </Button>
              </div>
            </Card>

            {/* История */}
            {contractHistory && contractHistory.length > 0 && (
              <Card className={styles.historyCard}>
                <h3 className={styles.sectionTitle}>История</h3>
                <div className={styles.historyList}>
                  {contractHistory.map((event, index) => (
                    <div key={index} className={styles.historyItem}>
                      <div className={styles.historyDate}>
                        {formatDateTime(event.createdAt)}
                      </div>
                      <div className={styles.historyEvent}>
                        {event.description}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Модальное окно действий */}
        <Modal
          isOpen={isActionModalOpen}
          onClose={() => setIsActionModalOpen(false)}
          title={`Подтверждение действия`}
        >
          <div className={styles.actionModal}>
            <p className={styles.actionDescription}>
              Вы уверены, что хотите выполнить это действие?
            </p>
            
            {(selectedAction === 'cancel' || selectedAction === 'dispute') && (
              <div className={styles.reasonField}>
                <label>Причина:</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Укажите причину..."
                  rows={3}
                  className={styles.reasonTextarea}
                />
              </div>
            )}
            
            <div className={styles.modalActions}>
              <Button
                variant="outline"
                onClick={() => setIsActionModalOpen(false)}
                disabled={isProcessing}
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={executeAction}
                loading={isProcessing}
              >
                Подтвердить
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default ContractDetail