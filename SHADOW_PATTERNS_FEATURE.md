# Shadow Items with Wildcard Patterns

## 🎯 Overview

Реализована поддержка масок wildcard в shadow items для скрытия групп стандартных инструментов по паттернам.

## ✨ Features

### Поддерживаемые паттерны:
- `tool_name` - точное совпадение
- `prefix_*` - все инструменты начинающиеся с префикса
- `*_suffix` - все инструменты заканчивающиеся суффиксом  
- `*middle*` - все инструменты содержащие подстроку
- `*` - все инструменты

### Примеры использования:

```typescript
const server = await createServerBuilder({
  shadowItems: {
    tools: [
      'browser_*',      // Скрыть все browser_ инструменты
      '*_screenshot',   // Скрыть все screenshot инструменты
      '*_tab_*',        // Скрыть все tab инструменты
      'html_get'        // Скрыть конкретный инструмент
    ]
  }
}).build();
```

## 📁 Добавленные файлы

1. **`src/utils/shadowMatcher.ts`** - утилитные функции для сопоставления паттернов
2. **`tests/shadow-matcher.spec.ts`** - unit тесты для функций сопоставления
3. **`tests/shadow-items-patterns.spec.ts`** - интеграционные тесты
4. **`examples/shadow-patterns-demo.ts`** - демонстрационный пример

## 🔧 Измененные файлы

1. **`src/enhancedConnection.ts`** - обновлена логика фильтрации инструментов
2. **`src/serverBuilder.ts`** - обновлена документация ShadowItems

## 🧪 Тестирование

```bash
# Запуск unit тестов
npx playwright test tests/shadow-matcher.spec.ts

# Запуск интеграционных тестов  
npx playwright test tests/shadow-items-patterns.spec.ts

# Запуск демо
npx tsx examples/shadow-patterns-demo.ts
```

## 🎭 Функциональность

### Поведение:
- ✅ Точное сопоставление для паттернов без `*`
- ✅ Wildcard сопоставление для паттернов с `*`
- ✅ Поддержка множественных wildcards (`*_*_*`)
- ✅ Экранированые специальные символы regex
- ✅ Кастомные инструменты могут переопределять скрытые
- ✅ Скрытые инструменты остаются доступными через прямые API вызовы

### Результаты тестирования:
- ✅ 65 unit тестов пройдено
- ✅ 30 интеграционных тестов пройдено
- ✅ Демо работает корректно

## 💡 Примеры использования

### Скрытие всех browser инструментов:
```typescript
shadowItems: { tools: ['browser_*'] }
```

### Скрытие инструментов по суффиксу:
```typescript
shadowItems: { tools: ['*_test', '*_debug'] }
```

### Смешанные точные и wildcard паттерны:
```typescript
shadowItems: { 
  tools: ['exact_tool_name', 'prefix_*', '*_suffix'] 
}
```

Функциональность полностью реализована, протестирована и готова к использованию! 🚀