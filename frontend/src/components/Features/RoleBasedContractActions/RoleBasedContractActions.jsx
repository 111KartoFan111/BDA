// frontend/src/components/Features/RoleBasedContractActions/RoleBasedContractActions.jsx
import React, { useState, useEffect } from 'react'
import { 
  User, 
  Wallet, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  Rocket,
  HandHeart,
  XCircle
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useWeb3 } from '../../../context/Web3Context'
import { useContractIntegration } from '../../../services/blockchain/contractIntegration'
import Button from '../../UI/Button/Button'
import Card from '../../UI/Card/Card'
import Modal from '../../UI/Modal/Modal'
import { formatCurrency, formatDateTime } from '../../../services/utils/formatting'
import toast from 'react-hot-toast'
import styles from './RoleBasedContractActions.module.css'

const RoleBasedContractActions = ({ contract, onContractUpdate }) => {
  const { user } = useAuth()
  const { account, isConnected, connectWallet } = useWeb3()
  const contractIntegration = useContractIntegration()
  
  const [isLoading, setIsLoading] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [selectedAction, setSelectedAction] = useState(null)
  const [contractFullInfo, setContractFullInfo] = useState(null)

  // Определяем роль пользователя
  const userRole = getUserRole(contract, user)
  
  // Загружаем полную информацию о контракте
  useEffect(() => {
    loadContractFullInfo()
  }, [contract.id])

  const loadContractFullInfo = async () => {
    try {
      const fullInfo = await contractIntegration.getContractFullInfo(contract.id)
      setContractFullInfo(fullInfo)
    } catch (error) {
      console.error('Ошибка загрузки информации о контракте:', error)
    }
  }

  // Определение роли пользователя
  function getUserRole(contract, user) {
    if (!user) return null
    
    if (contract.owner_id === user.id || contract.owner?.id === user.id) {
      return 'owner'
    }
    
    if (contract.tenant_id === user.id || contract.tenant?.id === user.id) {
      return 'tenant'
    }
    
    return null
  }

  // Выполнение действий
  const handleAction = async (action) => {
    setIsLoading(true)
    setShowActionModal(false)

    try {
      let result = null

      switch (action) {
        case 'connectWallet':
          await connectWallet()
          toast.success('Кошелек подключен!')
          break

        case 'sign':
          result = await contractIntegration.signContract(contract.id)
          toast.success('Контракт подписан!')
          break

        case 'deploy':
          result = await contractIntegration.deployToBlockchain(contract.id)
          toast.success('Контракт развернут в блокчейне!')
          break

        case 'payDeposit':
          result = await contractIntegration.payDeposit(contract.id, contract.contract_address)
          toast.success('Депозит оплачен!')
          break

        case 'complete':
          result = await contractIntegration.completeRental(contract.id, contract.contract_address)
          toast.success('Аренда завершена!')
          break

        case 'cancel':
          result = await contractIntegration.cancelRental(contract.id, contract.contract_address, 'Отменено пользователем')
          toast.success('Аренда отменена')
          break

        default:
          throw new Error('Неизвестное действие')
      }

      // Обновляем контракт в родительском компоненте
      if (onContractUpdate) {
        onContractUpdate(contract.id)
      }

      // Перезагружаем информацию
      await loadContractFullInfo()

    } catch (error) {
      console.error('Ошибка выполнения действия:', error)
      toast.error(error.message || 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  // Получение доступных действий
  const getAvailableActions = () => {
    const actions = []

    // Подключение кошелька
    if (!isConnected && userRole) {
      actions.push({
        id: 'connectWallet',
        title: 'Подключить кошелек',
        description: 'Подключите MetaMask для работы с блокчейном',
        icon: <Wallet size={20} />,
        variant: 'primary',
        priority: 1
      })
      return actions
    }

    if (!userRole) return actions

    // Подписание контракта
    if (contractIntegration.canPerformAction(contract, 'sign', userRole)) {
      actions.push({
        id: 'sign',
        title: userRole === 'owner' ? 'Подписать как владелец' : 'Подписать как арендатор',
        description: 'Цифровая подпись контракта',
        icon: <FileText size={20} />,
        variant: 'success',
        priority: 2
      })
    }

    // Деплой в блокчейн
    if (contractIntegration.canPerformAction(contract, 'deploy', userRole)) {
      actions.push({
        id: 'deploy',
        title: 'Развернуть в блокчейн',
        description: 'Создать смарт-контракт в Ethereum',
        icon: <Rocket size={20} />,
        variant: 'primary',
        priority: 3
      })
    }

    // Оплата депозита
    if (contractIntegration.canPerformAction(contract, 'payDeposit', userRole)) {
      actions.push({
        id: 'payDeposit',
        title: 'Оплатить депозит',
        description: `Депозит: ${formatCurrency(contract.deposit)} ETH`,
        icon: <DollarSign size={20} />,
        variant: 'warning',
        priority: 4
      })
    }

    // Завершение аренды
    if (contractIntegration.canPerformAction(contract, 'complete', userRole)) {
      actions.push({
        id: 'complete',
        title: 'Завершить аренду',
        description: 'Подтвердить завершение аренды',
        icon: <CheckCircle size={20} />,
        variant: 'success',
        priority: 5
      })
    }

    // Отмена
    if (contractIntegration.canPerformAction(contract, 'cancel', userRole)) {
      actions.push({
        id: 'cancel',
        title: 'Отменить',
        description: 'Отменить контракт аренды',
        icon: <XCircle size={20} />,
        variant: 'danger',
        priority: 6
      })
    }

    return actions.sort((a, b) => a.priority - b.priority)
  }

  const availableActions = getAvailableActions()
  const recommendedAction = contractIntegration.getRecommendedAction(contract, userRole)

  if (!userRole) {
    return (
      <Card className={styles.noAccessCard}>
        <div className={styles.noAccess}>
          <AlertCircle size={48} />
          <h3>Нет доступа</h3>
          <p>Вы не являетесь участником этого контракта</p>
        </div>
      </Card>
    )
  }

  return (
    <div className={styles.roleBasedActions}>
      {/* Информация о роли */}
      <Card className={styles.roleCard}>
        <div className={styles.roleHeader}>
          <div className={styles.roleIcon}>
            <User size={24} />
          </div>
          <div className={styles.roleInfo}>
            <h4 className={styles.roleTitle}>
              {userRole === 'owner' ? 'Арендодатель' : 'Арендатор'}
            </h4>
            <p className={styles.roleDescription}>
              {userRole === 'owner' 
                ? 'Вы сдаете товар в аренду' 
                : 'Вы арендуете товар'
              }
            </p>
          </div>
        </div>

        {/* Статус кошелька */}
        <div className={styles.walletStatus}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Кошелек:</span>
            <span className={`${styles.statusValue} ${isConnected ? styles.connected : styles.disconnected}`}>
              {isConnected ? (
                <>
                  <CheckCircle size={16} />
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  Не подключен
                </>
              )}
            </span>
          </div>
        </div>
      </Card>

      {/* Рекомендуемое действие */}
      {recommendedAction && (
        <Card className={styles.recommendedCard}>
          <div className={styles.recommendedHeader}>
            <HandHeart size={20} />
            <h4>Рекомендуемое действие</h4>
          </div>
          <div className={styles.recommendedContent}>
            <h5>{recommendedAction.title}</h5>
            <p>{recommendedAction.description}</p>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedAction(recommendedAction.action)
                setShowActionModal(true)
              }}
              loading={isLoading}
            >
              Выполнить
            </Button>
          </div>
        </Card>
      )}

      {/* Доступные действия */}
      {availableActions.length > 0 && (
        <Card className={styles.actionsCard}>
          <h4 className={styles.actionsTitle}>Доступные действия</h4>
          <div className={styles.actionsList}>
            {availableActions.map((action) => (
              <div key={action.id} className={styles.actionItem}>
                <div className={styles.actionInfo}>
                  <div className={styles.actionIcon}>
                    {action.icon}
                  </div>
                  <div className={styles.actionText}>
                    <h5>{action.title}</h5>
                    <p>{action.description}</p>
                  </div>
                </div>
                <Button
                  variant={action.variant}
                  size="small"
                  onClick={() => {
                    setSelectedAction(action.id)
                    setShowActionModal(true)
                  }}
                  loading={isLoading}
                  disabled={action.id === recommendedAction?.action}
                >
                  {action.id === 'cancel' ? 'Отменить' : 'Выполнить'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Информация о блокчейне */}
      {contractFullInfo?.isDeployed && (
        <Card className={styles.blockchainCard}>
          <h4 className={styles.blockchainTitle}>Смарт-контракт</h4>
          <div className={styles.blockchainInfo}>
            <div className={styles.blockchainItem}>
              <span className={styles.blockchainLabel}>Адрес:</span>
              <a 
                href={contractFullInfo.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.blockchainLink}
              >
                {contract.contract_address?.slice(0, 10)}...{contract.contract_address?.slice(-8)}
              </a>
            </div>
            {contractFullInfo.blockchain && (
              <div className={styles.blockchainItem}>
                <span className={styles.blockchainLabel}>Статус в блокчейне:</span>
                <span className={styles.blockchainValue}>
                  {contractFullInfo.blockchain.status}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Модальное окно подтверждения */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title="Подтверждение действия"
      >
        <div className={styles.confirmModal}>
          <p>Вы уверены, что хотите выполнить это действие?</p>
          {selectedAction === 'deploy' && (
            <div className={styles.deployWarning}>
              <AlertCircle size={20} />
              <p>Деплой в блокчейн требует оплаты газа и не может быть отменен.</p>
            </div>
          )}
          {selectedAction === 'payDeposit' && (
            <div className={styles.depositInfo}>
              <DollarSign size={20} />
              <p>Будет списан депозит: {formatCurrency(contract.deposit)} ETH</p>
            </div>
          )}
          <div className={styles.modalActions}>
            <Button
              variant="outline"
              onClick={() => setShowActionModal(false)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={() => handleAction(selectedAction)}
              loading={isLoading}
            >
              Подтвердить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default RoleBasedContractActions