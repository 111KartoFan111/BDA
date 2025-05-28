# Создайте файл backend/create_test_data_docker.py

"""
Script to create test data for development with Docker database.
"""

import os
import sys
import time
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

# Добавляем путь к приложению
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

try:
    from app.core.config import settings
    from app.models.base import Base
    from app.models.user import User, UserRole, UserStatus
    from app.models.item import Item, Category, ItemStatus, ItemCondition
    from app.core.security import get_password_hash
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this script from the backend directory")
    sys.exit(1)

def get_database_url():
    """Get database URL with Docker support."""
    # Приоритет настроек:
    # 1. Переменная окружения DATABASE_URL
    # 2. Docker compose (postgres:5432)
    # 3. Local Docker (localhost:5432)
    # 4. Настройки из config
    
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    
    # Проверяем, работаем ли мы в Docker Compose
    if os.getenv("POSTGRES_HOST"):
        host = os.getenv("POSTGRES_HOST")
    elif os.path.exists("/.dockerenv"):  # Мы внутри Docker контейнера
        host = "postgres"  # имя сервиса в docker-compose
    else:
        host = "localhost"  # Локальная разработка
    
    database_url = f"postgresql://postgres:password@{host}:5432/rentchain"
    return database_url

def wait_for_database(engine, max_attempts=30):
    """Wait for database to be ready."""
    print("🔄 Ожидание готовности базы данных...")
    
    for attempt in range(max_attempts):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("✅ База данных готова!")
            return True
        except Exception as e:
            if attempt == max_attempts - 1:
                print(f"❌ Не удалось подключиться к базе данных после {max_attempts} попыток")
                print(f"Ошибка: {e}")
                return False
            print(f"Попытка {attempt + 1}/{max_attempts}...")
            time.sleep(2)
    
    return False

def create_test_data():
    """Create test data for development."""
    
    # Получаем URL базы данных
    database_url = get_database_url()
    print(f"🔗 Используем базу данных: {database_url}")
    
    # Создаем подключение
    try:
        engine = create_engine(database_url, echo=False)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as e:
        print(f"❌ Ошибка создания подключения: {e}")
        return False
    
    # Ждем готовности базы данных
    if not wait_for_database(engine):
        return False
    
    db = SessionLocal()
    
    try:
        print("🏗️  Создание тестовых данных...")
        
        # Создаем таблицы
        print("📋 Создание таблиц...")
        Base.metadata.create_all(bind=engine)
        print("✅ Таблицы созданы!")
        
        # Проверяем, есть ли уже данные
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"⚠️  В базе уже есть {existing_users} пользователей")
            response = input("Продолжить и добавить тестовые данные? (y/N): ")
            if response.lower() != 'y':
                print("Отмена...")
                return True
        
        # 1. Создаем тестовых пользователей
        print("👥 Создание пользователей...")
        
        # Проверяем, существует ли админ
        admin_exists = db.query(User).filter(User.email == "admin@rentchain.com").first()
        if not admin_exists:
            admin_user = User(
                email="admin@rentchain.com",
                first_name="Admin",
                last_name="User",
                password_hash=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                is_email_verified=True,
                is_verified=True
            )
            db.add(admin_user)
            print("✅ Создан администратор: admin@rentchain.com / admin123")
        else:
            admin_user = admin_exists
            print("ℹ️  Администратор уже существует")
        
        # Обычные пользователи
        users_data = [
            {
                "email": "john@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "location": "New York",
                "bio": "I love renting and sharing!"
            },
            {
                "email": "jane@example.com", 
                "first_name": "Jane",
                "last_name": "Smith",
                "location": "Los Angeles",
                "bio": "Photographer and traveler"
            },
            {
                "email": "mike@example.com",
                "first_name": "Mike",
                "last_name": "Johnson",
                "location": "Chicago",
                "bio": "Tech enthusiast and maker"
            }
        ]
        
        created_users = []
        for user_data in users_data:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing:
                user = User(
                    password_hash=get_password_hash("password123"),
                    role=UserRole.USER,
                    status=UserStatus.ACTIVE,
                    is_email_verified=True,
                    is_verified=True,
                    **user_data
                )
                db.add(user)
                created_users.append(user)
                print(f"✅ Создан пользователь: {user_data['email']} / password123")
            else:
                created_users.append(existing)
                print(f"ℹ️  Пользователь {user_data['email']} уже существует")
        
        db.commit()
        
        # 2. Создаем категории
        print("📂 Создание категорий...")
        
        categories_data = [
            {
                "name": "Electronics",
                "slug": "electronics",
                "description": "Electronic devices and gadgets",
                "icon": "laptop"
            },
            {
                "name": "Cameras & Photo",
                "slug": "cameras-photo",
                "description": "Digital cameras, lenses, and photo equipment",
                "icon": "camera"
            },
            {
                "name": "Tools & Equipment",
                "slug": "tools-equipment", 
                "description": "Construction tools, power tools, and equipment",
                "icon": "wrench"
            },
            {
                "name": "Vehicles",
                "slug": "vehicles",
                "description": "Cars, bikes, scooters, boats",
                "icon": "car"
            },
            {
                "name": "Home & Garden",
                "slug": "home-garden",
                "description": "Home appliances, garden tools, furniture",
                "icon": "home"
            },
            {
                "name": "Sports & Outdoors",
                "slug": "sports-outdoors",
                "description": "Sports equipment, camping gear, outdoor activities",
                "icon": "activity"
            }
        ]
        
        created_categories = []
        for cat_data in categories_data:
            existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
            if not existing:
                category = Category(is_active=True, **cat_data)
                db.add(category)
                created_categories.append(category)
                print(f"✅ Создана категория: {cat_data['name']}")
            else:
                created_categories.append(existing)
                print(f"ℹ️  Категория {cat_data['name']} уже существует")
        
        db.commit()
        
        # 3. Создаем товары
        print("📦 Создание товаров...")
        
        items_data = [
            {
                "title": "Canon EOS R5 Professional Camera",
                "description": "Professional full-frame mirrorless camera with 45MP sensor. Perfect for photography and videography. Includes battery, charger, and 64GB SD card.",
                "category": "cameras-photo",
                "owner": "jane@example.com",
                "price_per_day": "50.00",
                "deposit": "500.00",
                "condition": ItemCondition.LIKE_NEW,
                "brand": "Canon",
                "model": "EOS R5",
                "year": 2023,
                "location": "Los Angeles, CA",
                "tags": ["camera", "professional", "photography", "video", "canon"],
                "min_rental_days": 1,
                "max_rental_days": 7,
                "images": ["/images/canon-r5-1.jpg", "/images/canon-r5-2.jpg"],
                "views_count": 45,
                "favorites_count": 12
            },
            {
                "title": "MacBook Pro 16-inch M2 Max",
                "description": "Latest MacBook Pro with M2 Max chip, 32GB RAM, 1TB SSD. Ideal for video editing, development, and creative work. Includes charger and USB-C hub.",
                "category": "electronics",
                "owner": "john@example.com",
                "price_per_day": "80.00",
                "deposit": "1000.00",
                "condition": ItemCondition.GOOD,
                "brand": "Apple",
                "model": "MacBook Pro 16",
                "year": 2023,
                "location": "New York, NY",
                "tags": ["laptop", "apple", "macbook", "development", "editing"],
                "min_rental_days": 2,
                "max_rental_days": 14,
                "images": ["/images/macbook-1.jpg"],
                "views_count": 78,
                "favorites_count": 23
            },
            {
                "title": "DeWalt 20V MAX Cordless Drill Kit",
                "description": "Professional cordless drill with complete bit set and carrying case. Includes 2 batteries and fast charger. Perfect for home improvement projects.",
                "category": "tools-equipment",
                "owner": "mike@example.com",
                "price_per_day": "25.00",
                "deposit": "100.00",
                "condition": ItemCondition.GOOD,
                "brand": "DeWalt",
                "model": "DCD771C2",
                "location": "Chicago, IL",
                "tags": ["drill", "tools", "construction", "diy", "dewalt"],
                "min_rental_days": 1,
                "max_rental_days": 5,
                "views_count": 34,
                "favorites_count": 8
            },
            {
                "title": "Trek Electric Mountain Bike",
                "description": "High-performance electric mountain bike with 50-mile range. Perfect for outdoor adventures and commuting. Includes helmet and bike lock.",
                "category": "vehicles",
                "owner": "john@example.com",
                "price_per_day": "60.00",
                "deposit": "200.00",
                "condition": ItemCondition.LIKE_NEW,
                "brand": "Trek",
                "model": "Rail 7",
                "year": 2023,
                "location": "New York, NY",
                "tags": ["bike", "electric", "mountain", "outdoor", "adventure"],
                "min_rental_days": 1,
                "max_rental_days": 7,
                "views_count": 89,
                "favorites_count": 31
            },
            {
                "title": "KitchenAid Artisan Stand Mixer",
                "description": "Professional stand mixer perfect for baking. Includes dough hook, wire whip, and flat beater. Great for events and home baking.",
                "category": "home-garden",
                "owner": "jane@example.com",
                "price_per_day": "15.00",
                "deposit": "50.00",
                "condition": ItemCondition.GOOD,
                "brand": "KitchenAid",
                "model": "Artisan",
                "location": "Los Angeles, CA",
                "tags": ["mixer", "baking", "kitchen", "appliance", "kitchenaid"],
                "min_rental_days": 1,
                "max_rental_days": 3,
                "views_count": 23,
                "favorites_count": 6
            },
            {
                "title": "GoPro HERO11 Black Action Camera",
                "description": "Latest GoPro with 5.3K video recording. Waterproof up to 33ft. Includes mounting accessories and extra batteries.",
                "category": "cameras-photo",
                "owner": "mike@example.com",
                "price_per_day": "30.00",
                "deposit": "150.00",
                "condition": ItemCondition.GOOD,
                "brand": "GoPro",
                "model": "HERO11 Black",
                "year": 2023,
                "location": "Chicago, IL",
                "tags": ["gopro", "action", "camera", "waterproof", "sports"],
                "min_rental_days": 1,
                "max_rental_days": 10,
                "views_count": 67,
                "favorites_count": 19
            }
        ]
        
        # Создаем словари для быстрого поиска
        categories_dict = {cat.slug: cat for cat in created_categories}
        users_dict = {user.email: user for user in [admin_user] + created_users}
        
        created_items = []
        for item_data in items_data:
            # Находим категорию и владельца
            category = categories_dict.get(item_data["category"])
            owner = users_dict.get(item_data["owner"])
            
            if not category:
                print(f"❌ Категория не найдена: {item_data['category']}")
                continue
            
            if not owner:
                print(f"❌ Владелец не найден: {item_data['owner']}")
                continue
            
            # Генерируем slug
            slug = item_data["title"].lower().replace(" ", "-")
            slug = "".join(c for c in slug if c.isalnum() or c == "-")[:50]
            
            # Проверяем, существует ли товар
            existing = db.query(Item).filter(Item.slug == slug).first()
            if existing:
                print(f"ℹ️  Товар {item_data['title']} уже существует")
                created_items.append(existing)
                continue
            
            item = Item(
                title=item_data["title"],
                description=item_data["description"],
                category_id=category.id,
                owner_id=owner.id,
                price_per_day=Decimal(item_data["price_per_day"]),
                deposit=Decimal(item_data["deposit"]),
                condition=item_data["condition"],
                brand=item_data.get("brand"),
                model=item_data.get("model"),
                year=item_data.get("year"),
                location=item_data["location"],
                tags=item_data["tags"],
                min_rental_days=item_data["min_rental_days"],
                max_rental_days=item_data["max_rental_days"],
                slug=slug,
                status=ItemStatus.ACTIVE,
                is_approved=True,
                is_available=True,
                is_featured=(len(created_items) < 3),  # Первые 3 товара - рекомендуемые
                images=item_data.get("images", []),
                views_count=item_data.get("views_count", 0),
                favorites_count=item_data.get("favorites_count", 0),
                available_from=datetime.utcnow(),
                available_to=datetime.utcnow() + timedelta(days=30)
            )
            
            db.add(item)
            created_items.append(item)
            print(f"✅ Создан товар: {item_data['title']}")
        
        db.commit()
        
        print(f"\n🎉 Успешно создано:")
        print(f"   👥 Пользователи: {len(created_users) + 1} (включая админа)")
        print(f"   📂 Категории: {len(created_categories)}")
        print(f"   📦 Товары: {len(created_items)}")
        
        print(f"\n🔑 Тестовые аккаунты:")
        print(f"   Админ: admin@rentchain.com / admin123")
        print(f"   Пользователи: john@example.com, jane@example.com, mike@example.com / password123")
        
        print(f"\n🌐 Теперь можно тестировать API:")
        print(f"   GET http://localhost:8000/api/v1/items")
        print(f"   GET http://localhost:8000/api/v1/categories")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка создания тестовых данных: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = create_test_data()
    if success:
        print("\n✅ Готово! Тестовые данные созданы.")
    else:
        print("\n❌ Произошла ошибка при создании тестовых данных.")
        sys.exit(1)