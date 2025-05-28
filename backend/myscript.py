#!/usr/bin/env python3
"""
Скрипт для настройки базы данных через Docker:
- Добавление основных категорий
- Изменение роли пользователя user@example.com на admin
"""

import sys
import os
import subprocess
import time
from datetime import datetime
import uuid

# Добавляем путь к приложению
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.item import Category
from app.models.user import User, UserRole, UserStatus
from app.core.security import get_password_hash


def check_docker_services():
    """Проверка и запуск Docker services."""
    
    print("🐳 Проверка Docker services...")
    
    try:
        # Проверяем, запущен ли docker-compose
        result = subprocess.run(['docker-compose', 'ps'], 
                              capture_output=True, text=True, cwd='.')
        
        if 'db' not in result.stdout or 'Up' not in result.stdout:
            print("   ⚠️  База данных не запущена, запускаем...")
            
            # Запускаем только базу данных и Redis
            subprocess.run(['docker-compose', 'up', '-d', 'db', 'redis'], 
                         check=True, cwd='.')
            
            print("   ⏳ Ожидание запуска базы данных...")
            time.sleep(10)  # Даем время на запуск
            
        print("   ✅ Docker services готовы")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Ошибка Docker: {e}")
        print("\n🔧 Попробуйте:")
        print("   1. Убедитесь, что Docker запущен")
        print("   2. Выполните: docker-compose up -d db redis")
        return False
    except FileNotFoundError:
        print("   ❌ docker-compose не найден")
        print("\n🔧 Установите Docker и docker-compose")
        return False


def get_docker_database_url():
    """Получение URL для подключения к Docker базе данных."""
    
    # Для подключения извне Docker используем localhost с портом
    return "postgresql://postgres:password@localhost:5432/rentchain"


def create_categories(db):
    """Создание основных категорий."""
    
    print("📁 Создание категорий...")
    
    categories_data = [
        {
            "name": "Электроника",
            "slug": "electronics",
            "description": "Электронные устройства и гаджеты",
            "icon": "📱",
            "children": [
                {"name": "Смартфоны", "slug": "smartphones", "description": "Мобильные телефоны", "icon": "📱"},
                {"name": "Ноутбуки", "slug": "laptops", "description": "Портативные компьютеры", "icon": "💻"},
                {"name": "Планшеты", "slug": "tablets", "description": "Планшетные компьютеры", "icon": "📱"},
                {"name": "Камеры", "slug": "cameras", "description": "Фото и видео камеры", "icon": "📷"},
                {"name": "Аудио", "slug": "audio", "description": "Наушники, колонки", "icon": "🎧"},
            ]
        },
        {
            "name": "Транспорт",
            "slug": "transport",
            "description": "Транспортные средства",
            "icon": "🚗",
            "children": [
                {"name": "Автомобили", "slug": "cars", "description": "Легковые автомобили", "icon": "🚗"},
                {"name": "Мотоциклы", "slug": "motorcycles", "description": "Мотоциклы и скутеры", "icon": "🏍️"},
                {"name": "Велосипеды", "slug": "bicycles", "description": "Велосипеды всех типов", "icon": "🚲"},
                {"name": "Электросамокаты", "slug": "e-scooters", "description": "Электрические самокаты", "icon": "🛴"},
            ]
        },
        {
            "name": "Инструменты",
            "slug": "tools",
            "description": "Инструменты и оборудование",
            "icon": "🔨",
            "children": [
                {"name": "Электроинструменты", "slug": "power-tools", "description": "Дрели, пилы, шлифовальные машины", "icon": "⚡"},
                {"name": "Ручные инструменты", "slug": "hand-tools", "description": "Молотки, отвертки, ключи", "icon": "🔧"},
                {"name": "Садовые инструменты", "slug": "garden-tools", "description": "Инструменты для сада", "icon": "🌱"},
            ]
        },
        {
            "name": "Спорт и отдых",
            "slug": "sports-recreation",
            "description": "Спортивное оборудование",
            "icon": "⚽",
            "children": [
                {"name": "Фитнес", "slug": "fitness", "description": "Тренажеры и фитнес оборудование", "icon": "💪"},
                {"name": "Водные виды спорта", "slug": "water-sports", "description": "Каяки, доски для серфинга", "icon": "🏄"},
                {"name": "Кемпинг", "slug": "camping", "description": "Палатки, туристическое снаряжение", "icon": "🏕️"},
            ]
        },
        {
            "name": "Дом и сад",
            "slug": "home-garden",
            "description": "Товары для дома и сада",
            "icon": "🏠",
            "children": [
                {"name": "Бытовая техника", "slug": "appliances", "description": "Пылесосы, кухонная техника", "icon": "🔌"},
                {"name": "Мебель", "slug": "furniture", "description": "Столы, стулья, диваны", "icon": "🪑"},
                {"name": "Садовая техника", "slug": "garden-equipment", "description": "Газонокосилки, триммеры", "icon": "🌿"},
            ]
        }
    ]
    
    created_count = 0
    
    for cat_data in categories_data:
        # Проверяем родительскую категорию
        existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
        if existing:
            print(f"   ⚠️  Категория '{cat_data['name']}' уже существует")
            parent_id = existing.id
        else:
            # Создаем родительскую категорию
            parent_category = Category(
                id=uuid.uuid4(),
                name=cat_data["name"],
                slug=cat_data["slug"],
                description=cat_data["description"],
                icon=cat_data["icon"],
                level=0,
                sort_order=created_count,
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            db.add(parent_category)
            db.flush()
            parent_id = parent_category.id
            created_count += 1
            print(f"   ✅ Создана категория: {cat_data['name']}")
        
        # Создаем дочерние категории
        if "children" in cat_data:
            for i, child_data in enumerate(cat_data["children"]):
                existing_child = db.query(Category).filter(Category.slug == child_data["slug"]).first()
                if existing_child:
                    print(f"      ⚠️  Подкатегория '{child_data['name']}' уже существует")
                    continue
                
                child_category = Category(
                    id=uuid.uuid4(),
                    name=child_data["name"],
                    slug=child_data["slug"],
                    description=child_data["description"],
                    icon=child_data["icon"],
                    parent_id=parent_id,
                    level=1,
                    sort_order=i,
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                
                db.add(child_category)
                created_count += 1
                print(f"      ✅ Создана подкатегория: {child_data['name']}")
    
    db.commit()
    print(f"📁 Всего создано категорий: {created_count}")


def setup_users(db):
    """Настройка пользователей."""
    
    print("👤 Настройка пользователей...")
    
    users_data = [
        {
            "email": "user@example.com",
            "password": "password123",
            "first_name": "Test",
            "last_name": "User",
            "role": UserRole.ADMIN
        },
        {
            "email": "admin@rentchain.com", 
            "password": "admin123",
            "first_name": "Admin",
            "last_name": "RentChain",
            "role": UserRole.ADMIN
        }
    ]
    
    for user_data in users_data:
        user = db.query(User).filter(User.email == user_data["email"]).first()
        
        if not user:
            # Создаем нового пользователя
            user = User(
                id=uuid.uuid4(),
                email=user_data["email"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"],
                status=UserStatus.ACTIVE,
                is_email_verified=True,
                is_verified=True,
                created_at=datetime.utcnow()
            )
            db.add(user)
            print(f"   ✅ Создан: {user_data['email']} (пароль: {user_data['password']})")
        else:
            # Обновляем существующего
            user.role = user_data["role"]
            user.status = UserStatus.ACTIVE
            user.is_verified = True
            user.updated_at = datetime.utcnow()
            print(f"   ✅ Обновлен: {user_data['email']} -> роль: {user_data['role'].value}")
    
    db.commit()


def main():
    """Основная функция."""
    
    print("🚀 Настройка RentChain через Docker")
    print("=" * 50)
    
    try:
        # Проверяем Docker services
        if not check_docker_services():
            return False
        
        # Подключаемся к базе данных
        print("\n🔗 Подключение к базе данных...")
        database_url = get_docker_database_url()
        print(f"   URL: {database_url}")
        
        engine = create_engine(database_url, echo=False)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # Проверяем подключение
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("   ✅ Подключение успешно")
        
        # Создаем таблицы
        print("\n🗄️  Создание таблиц...")
        Base.metadata.create_all(bind=engine)
        print("   ✅ Таблицы созданы/обновлены")
        
        # Работаем с данными
        db = SessionLocal()
        try:
            create_categories(db)
            print()
            setup_users(db)
            
            print("\n" + "=" * 50)
            print("✅ НАСТРОЙКА ЗАВЕРШЕНА!")
            print()
            print("📋 Учетные записи:")
            print("   📧 user@example.com / password123 (admin)")
            print("   📧 admin@rentchain.com / admin123 (admin)")
            print()
            print("📁 Создана иерархия категорий")
            print()
            print("🚀 Запуск полного приложения:")
            print("   docker-compose up")
            print()
            print("📚 API документация:")
            print("   http://localhost:8000/docs")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)