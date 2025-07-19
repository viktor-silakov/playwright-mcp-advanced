# Настройка Extension Mode для AI Агентов

Это руководство покажет, как настроить Playwright MCP в extension режиме для работы с AI агентами типа **Cursor**, **Claude Desktop**, **VS Code** и другими MCP клиентами.

## 🎯 Что даёт Extension Mode для AI агентов

- **Контроль реального браузера** - AI может управлять вашим настоящим Chrome браузером
- **Совместное использование вкладок** - AI видит те же страницы, что и вы
- **Безопасность** - Полный контроль над тем, какие вкладки доступны AI
- **Интерактивность** - AI может навигировать, кликать, заполнять формы в реальном времени

## 📋 Пошаговая настройка

### Шаг 1: Запуск MCP сервера в Extension режиме

```bash
# Запускаем сервер на стандартном порту 3000
node cli.js --extension --port 3000 --browser chromium

# Или на кастомном порту
node cli.js --extension --port 8080 --browser chromium
```

**Важно**: Запомните порт - он понадобится для конфигурации AI агента.

### Шаг 2: Установка Chrome расширения

1. Откройте Chrome браузер
2. Перейдите на `chrome://extensions/`
3. Включите **"Режим разработчика"** (Developer mode)
4. Нажмите **"Загрузить распакованное расширение"**
5. Выберите папку `extension/` из проекта
6. Расширение появится в списке с иконкой

### Шаг 3: Подключение расширения к серверу

1. **Кликните на иконку расширения** в панели Chrome
2. В поле **"Bridge URL"** введите: `ws://localhost:3000/extension`
3. Нажмите **"Connect"**
4. Статус должен измениться на **"Connected"** ✅

### Шаг 4: Конфигурация AI агентов

## 🤖 Cursor IDE

### Конфигурация для Cursor

1. Откройте настройки Cursor: `Cmd/Ctrl + ,`
2. Найдите секцию **"MCP Servers"**
3. Добавьте новый сервер:

```json
{
  "mcpServers": {
    "playwright-extension": {
      "command": "node",
      "args": [
        "/path/to/playwright-mcp-advanced/cli.js",
        "--extension",
        "--port", "3000",
        "--browser", "chromium"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Альтернативный способ (через URL):**

```json
{
  "mcpServers": {
    "playwright-extension": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

### Использование в Cursor

После подключения вы можете использовать команды:

```
@playwright Открой страницу https://github.com и сделай скриншот
@playwright Найди на странице форму поиска и заполни её текстом "playwright"
@playwright Получи HTML содержимое текущей страницы
@playwright Сделай снепшот страницы для анализа структуры
```

## 🖥️ Claude Desktop

### Конфигурация для Claude Desktop

Отредактируйте файл конфигурации Claude Desktop:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "playwright-extension": {
      "command": "node",
      "args": [
        "/Users/username/Projects/playwright-mcp-advanced/cli.js",
        "--extension",
        "--port", "3000",
        "--browser", "chromium"
      ]
    }
  }
}
```

### Использование в Claude Desktop

```
Можешь открыть страницу https://example.com в браузере?
Сделай скриншот текущей страницы
Найди все ссылки на странице и покажи их список
Заполни форму на странице следующими данными: имя "John", email "john@example.com"
```

## 🆚 VS Code

### Расширение MCP для VS Code

1. Установите расширение **"MCP Client"** в VS Code
2. Откройте Command Palette (`Cmd/Ctrl + Shift + P`)
3. Выполните команду **"MCP: Configure Servers"**
4. Добавьте конфигурацию:

```json
{
  "playwright-extension": {
    "command": "node",
    "args": [
      "/path/to/playwright-mcp-advanced/cli.js",
      "--extension",
      "--port", "3000",
      "--browser", "chromium"
    ]
  }
}
```

## 🔧 Продвинутая настройка

### Автозапуск сервера

Создайте скрипт для автозапуска:

**macOS/Linux** (`start-extension-server.sh`):
```bash
#!/bin/bash
cd /path/to/playwright-mcp-advanced
node cli.js --extension --port 3000 --browser chromium &
echo "MCP Extension server started on port 3000"
echo "Extension URL: ws://localhost:3000/extension"
```

**Windows** (`start-extension-server.bat`):
```batch
@echo off
cd /d "C:\path\to\playwright-mcp-advanced"
start node cli.js --extension --port 3000 --browser chromium
echo MCP Extension server started on port 3000
echo Extension URL: ws://localhost:3000/extension
```

### Настройка переменных окружения

Создайте `.env` файл:
```env
MCP_EXTENSION_PORT=3000
MCP_EXTENSION_BROWSER=chromium
MCP_EXTENSION_HOST=localhost
```

Используйте в конфигурации:
```json
{
  "mcpServers": {
    "playwright-extension": {
      "command": "node",
      "args": [
        "/path/to/playwright-mcp-advanced/cli.js",
        "--extension",
        "--port", "${MCP_EXTENSION_PORT}",
        "--browser", "${MCP_EXTENSION_BROWSER}"
      ]
    }
  }
}
```

## 🎮 Практические сценарии использования

### Веб-разработка

```
AI, открой мой локальный сервер http://localhost:3000
Сделай скриншот главной страницы
Проверь, корректно ли отображается форма регистрации
Заполни тестовые данные и отправь форму
```

### Тестирование UI

```
Открой продакшн версию сайта https://myapp.com
Сравни текущую страницу с дизайн-макетом
Найди все кнопки на странице и проверь их состояния
Протестируй адаптивность - измени размер окна на мобильный
```

### Исследование конкурентов

```
Открой сайт конкурента https://competitor.com
Проанализируй структуру их главной страницы
Сделай скриншоты ключевых разделов
Извлеки информацию о ценах и услугах
```

### Автоматизация задач

```
Открой админ-панель https://admin.mysite.com
Войди в систему используя мои сохранённые данные
Проверь статистику за сегодня
Сделай экспорт отчёта в CSV
```

## 🛡️ Безопасность и лучшие практики

### Контроль доступа

1. **Выбирайте вкладки осознанно** - подключайте только нужные вкладки
2. **Мониторьте действия** - следите за командами AI в логах сервера
3. **Используйте тестовые аккаунты** - не давайте доступ к продакшн данным
4. **Регулярно отключайтесь** - закрывайте соединение после работы

### Рекомендации

- Запускайте сервер только когда нужен
- Используйте разные порты для разных проектов
- Делайте бекапы важных данных перед автоматизацией
- Тестируйте команды на безопасных сайтах

## ⚡ Устранение неполадок

### Сервер не запускается
```bash
# Проверьте, что порт свободен
lsof -i :3000

# Попробуйте другой порт
node cli.js --extension --port 3001 --browser chromium
```

### Расширение не подключается
1. Проверьте URL: `ws://localhost:3000/extension`
2. Убедитесь, что сервер запущен и показывает "CDP relay server started"
3. Перезагрузите расширение в `chrome://extensions/`

### AI агент не видит команды
1. Перезапустите AI клиент (Cursor/Claude Desktop)
2. Проверьте правильность пути в конфигурации
3. Убедитесь, что сервер запущен и доступен

## 📚 Доступные команды для AI

AI агенты могут использовать все Playwright команды:

- `browser_navigate` - Навигация на страницы
- `browser_snapshot` - Снепшот содержимого
- `browser_get_html_content` - Получение HTML
- `browser_take_screenshot` - Скриншоты
- `browser_click` - Клики по элементам  
- `browser_type` - Ввод текста
- `browser_resize` - Изменение размера окна
- `browser_wait_for` - Ожидание элементов
- И многие другие...

---

**🚀 Готово!** Теперь ваши AI агенты могут управлять реальным браузером через MCP extension режим. 