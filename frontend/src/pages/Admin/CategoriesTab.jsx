import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, CheckCircle, Ban } from 'lucide-react'
import { apiRequest } from '../../services/api/base.js'
import toast from 'react-hot-toast'

const CategoriesTab = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [newCategory, setNewCategory] = useState({ name: '', parentId: null })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await apiRequest.get('/v1/categories')
      setCategories(response.data.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Ошибка загрузки категорий')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Название категории обязательно')
      return
    }

    try {
      const categoryData = {
        name: newCategory.name.trim(),
        parent_id: newCategory.parentId || null,
        is_active: true
      }

      const response = await apiRequest.post('/v1/categories', categoryData)
      setCategories([...categories, response.data.data])
      setNewCategory({ name: '', parentId: null })
      setShowAddForm(false)
      toast.success('Категория создана успешно')
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Ошибка при создании категории')
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию?')) return

    try {
      await apiRequest.delete(`/v1/categories/${id}`)
      setCategories(categories.filter(c => c.id !== id))
      toast.success('Категория удалена')
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Ошибка при удалении категории')
    }
  }

  const toggleCategoryStatus = async (id, isActive) => {
    try {
      const response = await apiRequest.patch(`/v1/categories/${id}`, {
        is_active: !isActive
      })
      setCategories(categories.map(c => 
        c.id === id ? { ...c, is_active: !isActive } : c
      ))
      toast.success('Статус категории изменен')
    } catch (error) {
      console.error('Error updating category status:', error)
      toast.error('Ошибка при изменении статуса категории')
    }
  }

  const parentCategories = categories.filter(c => !c.parent_id)

  const getCategoryLevel = (category) => {
    return category.parent_id ? 1 : 0
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка добавления */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Управление категориями</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} />
          Добавить категорию
        </button>
      </div>

      {/* Форма добавления категории */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium mb-4">Новая категория</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название категории
              </label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите название категории"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Родительская категория
              </label>
              <select
                value={newCategory.parentId || ''}
                onChange={(e) => setNewCategory({ ...newCategory, parentId: e.target.value ? e.target.value : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Корневая категория</option>
                {parentCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddCategory}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Создать
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список категорий */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium">Категории товаров</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Товаров
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium text-gray-900 ${getCategoryLevel(category) > 0 ? 'ml-6' : ''}`}>
                      {getCategoryLevel(category) > 0 && '↳ '}
                      {category.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.items_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      category.is_active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {category.is_active ? 'Активна' : 'Неактивна'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Редактировать"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => toggleCategoryStatus(category.id, category.is_active)}
                        className={category.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                        title={category.is_active ? "Деактивировать" : "Активировать"}
                      >
                        {category.is_active ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CategoriesTab