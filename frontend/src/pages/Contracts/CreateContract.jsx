// frontend/src/pages/Contracts/CreateContract.jsx
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle, FileText } from 'lucide-react'
import { contractsAPI } from '../../services/api/contracts'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/UI/Button/Button'
import ContractForm from '../../components/Forms/ContractForm/ContractForm'
import Modal from '../../components/UI/Modal/Modal'
import toast from 'react-hot-toast'
import styles from './Contracts.module.css'

const CreateContract = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [createdContract, setCreatedContract] = useState(null)

  // Получаем предзаполненные данные из состояния навигации (если переходили с товара)
  const prefilledData = location.state?.contractData || {}

  // Проверяем аутентификацию
  if (!isAuthenticated) {
    navigate('/login')
    return null
  }

  const handleSubmit = async (formData) => {
    setIsLoading(true)
    
    try {
      console.log('Creating contract with data:', formData)
      
      // Подготавливаем данные для API
      const contractData = {
        item_id: formData.itemId,
        tenant_email: formData.tenantEmail,
        start_date: formData.startDate,
        end_date: formData.endDate,
        total_price: formData.totalPrice,
        message: formData.message,
        special_terms: formData.specialTerms,
        // Дополнительные поля для контекста
        total_days: formData.totalDays,
        item_title: formData.itemInfo?.title
      }
      
      console.log('Sending contract data to API:', contractData)
      
      const response = await contractsAPI.createContract(contractData)
      console.log('Create contract response:', response)
      
      // Извлекаем данные контракта из ответа
      let newContract = response.data
      if (response.data.data) {
        newContract = response.data.data
      } else if (response.data.success) {
        newContract = response.data.data || response.data
      }
      
      if (!newContract || !newContract.id) {
        console.error('Invalid response structure:', response.data)
        throw new Error('Некорректный ответ сервера при создании контракта')
      }

      console.log('Created contract:', newContract)

      setCreatedContract(newContract)
      setIsSuccessModalOpen(true)
      toast.success('Предложение аренды отправлено!')
      
    } catch (error) {
      console.error('Error creating contract:', error)
      
      // Более детальная обработка ошибок
      let errorMessage = 'Ошибка при создании контракта'
      
      if (error.response?.status === 422) {
        console.error('Validation error details:', error.response.data)
        
        if (error.response.data?.details) {
          const validationErrors = error.response.data.details
          if (Array.isArray(validationErrors)) {
            const errorMessages = validationErrors.map(err => {
              const field = err.loc?.slice(-1)[0] || 'поле'
              return `${field}: ${err.msg}`
            })
            errorMessage = `Ошибки валидации: ${errorMessages.join(', ')}`
          }
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'Товар или пользователь не найден'
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Некорректные данные запроса'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false)
    if (createdContract) {
      navigate(`/contracts/${createdContract.id}`)
    } else {
      navigate('/contracts')
    }
  }

  const handleViewContract = () => {
    if (createdContract) {
      navigate(`/contracts/${createdContract.id}`)
    }
  }

  const handleCreateAnother = () => {
    setIsSuccessModalOpen(false)
    setCreatedContract(null)
    // Остаемся на странице создания
    window.location.reload() // Простой способ очистить форму
  }

  const handleViewContracts = () => {
    navigate('/contracts')
  }

  return (
    <div className={styles.createContractPage}>
      <div className="container">
        {/* Хлебные крошки */}
        <div className={styles.breadcrumbs}>
          <Button
            variant="ghost"
            onClick={handleCancel}
            icon={<ArrowLeft size={16} />}
          >
            Назад
          </Button>
        </div>

        {/* Заголовок */}
        <div className={styles.header}>
          <h1 className={styles.title}>Создать контракт аренды</h1>
          <p className={styles.subtitle}>
            Отправьте предложение аренды выбранному пользователю
          </p>
        </div>

        {/* Форма создания контракта */}
        <div className={styles.formContainer}>
          <ContractForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
            prefilledData={prefilledData}
          />
        </div>

        {/* Модальное окно успеха */}
        <Modal
          isOpen={isSuccessModalOpen}
          onClose={handleSuccessClose}
          title="Предложение отправлено!"
          closeOnOverlayClick={false}
          showCloseButton={false}
        >
          <div className={styles.successModal}>
            <div className={styles.successIcon}>
              <CheckCircle size={48} />
            </div>
            
            <div className={styles.successContent}>
              <h3 className={styles.successTitle}>
                Отлично!
              </h3>
              <p className={styles.successMessage}>
                Ваше предложение аренды было успешно отправлено. 
                Арендатор получит уведомление и сможет принять или отклонить предложение.
              </p>
              
              <div className={styles.contractInfo}>
                <div className={styles.infoItem}>
                  <FileText size={16} />
                  <span>Контракт #{createdContract?.id?.slice(0, 8)}...</span>
                </div>
                {createdContract?.tenant_email && (
                  <div className={styles.infoItem}>
                    <span>Арендатор: {createdContract.tenant_email}</span>
                  </div>
                )}
              </div>
              
              <div className={styles.successTips}>
                <h4>Что дальше?</h4>
                <ul>
                  <li>Арендатор получит уведомление о вашем предложении</li>
                  <li>Вы можете отслеживать статус в разделе "Мои контракты"</li>
                  <li>При принятии предложения будет создан смарт-контракт</li>
                  <li>Все изменения статуса придут вам в уведомлениях</li>
                </ul>
              </div>
            </div>

            <div className={styles.successActions}>
              <Button
                variant="primary"
                onClick={handleViewContract}
                fullWidth
                disabled={!createdContract}
              >
                Посмотреть контракт
              </Button>
              <Button
                variant="outline"
                onClick={handleViewContracts}
                fullWidth
              >
                Мои контракты
              </Button>
              <Button
                variant="ghost"
                onClick={handleCreateAnother}
                fullWidth
              >
                Создать еще один контракт
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default CreateContract