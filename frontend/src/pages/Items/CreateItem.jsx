import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { itemsAPI } from '../../services/api/items'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/UI/Button/Button'
import ItemForm from '../../components/Forms/ItemForm/ItemForm'
import Modal from '../../components/UI/Modal/Modal'
import styles from './Items.module.css'

const CreateItem = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [createdItem, setCreatedItem] = useState(null)

  // Проверяем аутентификацию
  if (!isAuthenticated) {
    navigate('/login')
    return null
  }

  const handleSubmit = async (formData) => {
    setIsLoading(true)
    
    try {
      // Создаем товар
      const response = await itemsAPI.createItem({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        pricePerDay: formData.pricePerDay,
        deposit: formData.deposit,
        location: formData.location,
        availableFrom: formData.availableFrom,
        availableTo: formData.availableTo,
        minRentalDays: formData.minRentalDays,
        maxRentalDays: formData.maxRentalDays,
        terms: formData.terms
      })

      const newItem = response.data

      // Загружаем изображения если они есть
      if (formData.images && formData.images.length > 0) {
        const imageFormData = new FormData()
        formData.images.forEach((image, index) => {
          imageFormData.append(`images`, image)
        })

        try {
          await itemsAPI.uploadImages(newItem.id, imageFormData)
        } catch (imageError) {
          console.error('Error uploading images:', imageError)
          // Продолжаем даже если изображения не загрузились
        }
      }

      setCreatedItem(newItem)
      setIsSuccessModalOpen(true)
    } catch (error) {
      console.error('Error creating item:', error)
      // Ошибка уже обработана в useAuth через toast
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false)
    if (createdItem) {
      navigate(`/items/${createdItem.id}`)
    } else {
      navigate('/items')
    }
  }

  const handleViewItem = () => {
    if (createdItem) {
      navigate(`/items/${createdItem.id}`)
    }
  }

  const handleCreateAnother = () => {
    setIsSuccessModalOpen(false)
    setCreatedItem(null)
    // Остаемся на странице создания
  }

  return (
    <div className={styles.createItemPage}>
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
          <h1 className={styles.title}>Добавить товар</h1>
          <p className={styles.subtitle}>
            Создайте объявление о сдаче товара в аренду
          </p>
        </div>

        {/* Форма создания товара */}
        <div className={styles.formContainer}>
          <ItemForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>

        {/* Модальное окно успеха */}
        <Modal
          isOpen={isSuccessModalOpen}
          onClose={handleSuccessClose}
          title="Товар успешно создан!"
          closeOnOverlayClick={false}
          showCloseButton={false}
        >
          <div className={styles.successModal}>
            <div className={styles.successIcon}>
              <CheckCircle size={48} />
            </div>
            
            <div className={styles.successContent}>
              <h3 className={styles.successTitle}>
                Поздравляем!
              </h3>
              <p className={styles.successMessage}>
                Ваш товар "{createdItem?.title}" был успешно создан и опубликован. 
                Теперь другие пользователи могут найти его и отправить запрос на аренду.
              </p>
              
              <div className={styles.successTips}>
                <h4>Что дальше?</h4>
                <ul>
                  <li>Добавьте качественные фотографии для привлечения арендаторов</li>
                  <li>Регулярно обновляйте календарь доступности</li>
                  <li>Быстро отвечайте на запросы аренды</li>
                  <li>Поддерживайте высокий рейтинг качественным сервисом</li>
                </ul>
              </div>
            </div>

            <div className={styles.successActions}>
              <Button
                variant="primary"
                onClick={handleViewItem}
                fullWidth
              >
                Посмотреть товар
              </Button>
              <Button
                variant="outline"
                onClick={handleCreateAnother}
                fullWidth
              >
                Добавить еще товар
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default CreateItem