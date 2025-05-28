## Запуск фронтенда

```bash
cd frontend
npm i
npm run dev
```
## Запуск бэкенда

```bash
cd backend
docker compose down -v
docker compose up --build
python3 myscript.py
```


## Цель модели

Предсказать **вероятность того, что товар будет арендован** на основе его характеристик и исторических данных.

## Архитектура модели

### Тип модели: Логистическая регрессия

```python
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

model = LogisticRegression(random_state=42)
```

**Почему логистическая регрессия?**

- Простая и интерпретируемая
- Быстрая в обучении и предсказании
- Хорошо работает с небольшими датасетами
- Выдает вероятности (0-1)

## Входные признаки (Features)

Модель использует **8 признаков** для каждого товара:

```python
def _prepare_item_features(self, item: Item) -> List[float]:
    days_since_created = (datetime.utcnow() - item.created_at).days
    price_normalized = float(item.price_per_day) / 100.0
    rating_score = float(item.rating) if item.rating else 0.0
    views_normalized = min(item.views_count / 100.0, 10.0)

    has_images = 1.0 if item.images else 0.0
    is_featured = 1.0 if item.is_featured else 0.0
    has_description = 1.0 if item.description and len(item.description) > 50 else 0.0

    return [
        price_normalized,
        rating_score,
        views_normalized,
        days_since_created,
        has_images,
        is_featured,
        has_description,
        float(item.total_reviews)
    ]
```

### Описание признаков

1. `price_normalized` — Цена товара, деленная на 100
2. `rating_score` — Средний рейтинг товара (0-5 звезд)
3. `views_normalized` — Количество просмотров (макс. 1000), нормализованное
4. `days_since_created` — Количество дней с момента создания объявления
5. `has_images` — Есть ли фотографии (0 или 1)
6. `is_featured` — Является ли товар рекомендуемым (0 или 1)
7. `has_description` — Есть ли описание >50 символов (0 или 1)
8. `total_reviews` — Количество отзывов о товаре

## Целевая переменная (Target)

```python
was_rented = self.db.query(Contract).filter(
    Contract.item_id == item.id,
    Contract.status.in_([ContractStatus.COMPLETED, ContractStatus.ACTIVE])
).count() > 0

labels.append(1 if was_rented else 0)
```

- `1` — товар был успешно арендован
- `0` — товар не был арендован

## Процесс обучения

### 1. Сбор данных

```python
def _train_rental_prediction_model(self) -> float:
    items = self.db.query(Item).filter(
        Item.created_at <= datetime.utcnow() - timedelta(days=7)
    ).all()

    if len(items) < 10:
        raise ValueError("Not enough data for training")
```

### 2. Подготовка данных

```python
features = []
labels = []

for item in items:
    item_features = self._prepare_item_features(item)
    features.append(item_features)

    was_rented = check_if_rented(item)
    labels.append(1 if was_rented else 0)
```

### 3. Разделение на обучающую и тестовую выборки

```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
```

### 4. Масштабирование признаков

```python
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

### 5. Обучение модели

```python
model = LogisticRegression(random_state=42)
model.fit(X_train_scaled, y_train)

accuracy = model.score(X_test_scaled, y_test)
```

### 6. Сохранение модели

```python
import joblib

joblib.dump(model, "models/rental_prediction_model.pkl")
joblib.dump(scaler, "models/rental_prediction_scaler.pkl")
```

## Получение предсказаний

### API эндпоинт

```python
@router.get("/ml/predictions")
async def get_ml_predictions(
    item_id: Optional[uuid.UUID] = None,
    category_id: Optional[uuid.UUID] = None,
    limit: int = 20
):
    predictions = analytics_service.get_ml_predictions(item_id, category_id, limit)
    return Response(data=predictions)
```

### Процесс предсказания

```python
def get_ml_predictions(self, item_id=None, category_id=None, limit=20):
    model = joblib.load("models/rental_prediction_model.pkl")
    scaler = joblib.load("models/rental_prediction_scaler.pkl")

    items = get_items_for_prediction(item_id, category_id, limit)

    predictions = []
    for item in items:
        features = self._prepare_item_features(item)
        features_scaled = scaler.transform([features])
        probability = model.predict_proba(features_scaled)[0][1]

        predictions.append({
            "item_id": item.id,
            "title": item.title,
            "rental_probability": float(probability),
            "confidence": get_confidence_level(probability)
        })

    return sorted(predictions, key=lambda x: x["rental_probability"], reverse=True)
```

## Интерпретация результатов

### Уровни уверенности

```python
def get_confidence_level(probability):
    if probability > 0.7:
        return "high"
    elif probability > 0.4:
        return "medium"
    else:
        return "low"
```

### Пример ответа API

```json
{
  "data": [
    {
      "item_id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Canon EOS R5 Professional Camera",
      "rental_probability": 0.85,
      "confidence": "high",
      "features": {
        "price_per_day": 50.0,
        "views_count": 120,
        "rating": 4.8,
        "days_since_created": 5
      }
    }
  ]
}
```

## Переобучение модели

### Автоматическое переобучение

```python
@celery_app.task
def retrain_ml_model():
    analytics_service = AnalyticsService(db)
    accuracy = analytics_service._train_rental_prediction_model()
    return {"status": "success", "accuracy": accuracy}
```

### Ручное переобучение через API

```python
@router.post("/ml/retrain")
async def retrain_ml_models(
    model_type: str = "rental_prediction"
):
    result = analytics_service.retrain_ml_models(model_type)
    return Response(data=result)
```

### Когда переобучать

- Каждые 24 часа (автоматически)
- При накоплении новых данных (>100 новых аренд)
- При снижении качества предсказаний
- Вручную через админ-панель

## Практическое применение

### 1. Рекомендации владельцам

```python
low_probability_items = [item for item in predictions if item["rental_probability"] < 0.3]

recommendations = {
    "add_photos": not item.has_images,
    "improve_description": len(item.description) < 50,
    "adjust_price": item.price_per_day > average_price_in_category,
    "add_to_featured": item.rating > 4.0
}
```

### 2. Персонализированные рекомендации

```python
popular_items = [item for item in predictions if item["rental_probability"] > 0.6]
```

### 3. Ценовые рекомендации

```python
price_impact = analyze_price_sensitivity(model, scaler)
```

## Метрики качества

### Основные метрики

- Accuracy
- Precision
- Recall
- F1-Score

### Мониторинг качества

```python
def evaluate_model_performance():
    return {
        "accuracy": 0.78,
        "precision": 0.72,
        "recall": 0.81,
        "f1_score": 0.76,
        "training_samples": 1250,
        "last_trained": "2024-01-15T10:30:00Z"
    }
```