// frontend/src/pages/Items/CreateItem.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { itemsAPI } from '../../services/api/items'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/UI/Button/Button'
import ItemForm from '../../components/Forms/ItemForm/ItemForm'
import Modal from '../../components/UI/Modal/Modal'
import toast from 'react-hot-toast'
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
      console.log('Submitting item data:', formData)
      
      // Создаем товар БЕЗ изображений
      const itemDataWithoutImages = { ...formData }
      delete itemDataWithoutImages.images // Удаляем изображения из основных данных
      
      console.log('Item data for creation:', itemDataWithoutImages)
      
      const response = await itemsAPI.createItem(itemDataWithoutImages)
      console.log('Create item response:', response)
      
      // Извлекаем данные товара из ответа
      let newItem = response.data
      if (response.data.data) {
        newItem = response.data.data
      } else if (response.data.success) {
        newItem = response.data.data || response.data
      }
      
      if (!newItem || !newItem.id) {
        console.error('Invalid response structure:', response.data)
        throw new Error('Некорректный ответ сервера при создании товара')
      }

      console.log('Created item:', newItem)

      // Загружаем изображения если они есть
      if (formData.images && formData.images.length > 0) {
        try {
          console.log('Uploading images for item:', newItem.id)
          console.log('Images to upload:', formData.images)
          
          const imageFormData = new FormData()
          formData.images.forEach((image, index) => {
            imageFormData.append('files', image) // Используем 'files' как ожидает бэкенд
          })

          const imageResponse = await itemsAPI.uploadImages(newItem.id, imageFormData)
          console.log('Image upload response:', imageResponse)
          
          // Обновляем данные товара с URL изображений
          if (imageResponse.data && imageResponse.data.data) {
            newItem.images = imageResponse.data.data
          }
        } catch (imageError) {
          console.error('Error uploading images:', imageError)
          toast.error('Товар создан, но изображения не удалось загрузить')
        }
      }

      setCreatedItem(newItem)
      setIsSuccessModalOpen(true)
      toast.success('Товар успешно создан!')
      
    } catch (error) {
      console.error('Error creating item:', error)
      
      // Более детальная обработка ошибок
      let errorMessage = 'Ошибка при создании товара'
      
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
    window.location.reload() // Простой способ очистить форму
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