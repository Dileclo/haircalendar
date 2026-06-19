# Hail — Веб-приложение для парикмахера

Современное веб-приложение для управления записями, клиентами и финансами парикмахера.
Стек: **Next.js 16 + TypeScript + SQLite + Recharts + Glassmorphism**

## Быстрый старт

```bash
npm install                # Установка зависимостей
npx tsx scripts/migrate.ts # Миграция BSON → SQLite (если нет hail.db)
npm run dev                # Запуск (http://localhost:3000)
```

Для доступа с iPhone/iPad: `http://[IP-компьютера]:3000`

## Структура

```
hairsapp/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Glass фон, TabBar, PWA-метатеги
│   ├── page.tsx                # Дашборд (метрики, записи на сегодня)
│   ├── globals.css             # Glassmorphism + iOS дизайн-система
│   ├── calendar/page.tsx       # Календарь (День / 3 дня / Неделя / Список)
│   ├── clients/
│   │   ├── page.tsx            # Клиенты с поиском
│   │   └── [id]/page.tsx       # Карточка клиента + история
│   ├── expenses/page.tsx       # Расходы + Продажи (табы)
│   ├── statistics/page.tsx     # Графики Recharts
│   └── api/                    # REST API (SQLite)
├── components/                 # UI компоненты (GlassCard, Modal, ...)
│   └── charts/                 # Revenue, Services, Clients, Comparison
├── lib/db.ts                   # SQLite через sql.js
├── scripts/migrate.ts          # Миграция BSON → SQLite
├── public/                     # PWA манифест + sql-wasm.wasm
├── hail.db                     # База данных SQLite (4 таблицы)
└── package.json
```

## База данных (SQLite)

| Таблица | Записей | Поля |
|---------|---------|------|
| customers | 328 | name, phone, status |
| appointments | 2 926 | customer_id, service, price, start_time, end_time, color |
| expenses | 331 | name, amount, date, receipt |
| sales | 49 | product, amount, date, receipt |

## API

```
GET/POST    /api/customers
GET/PUT/DEL /api/customers/[id]
GET/POST    /api/appointments
GET         /api/appointments/today
GET         /api/appointments/upcoming
GET/POST    /api/expenses
GET/POST    /api/sales
GET         /api/statistics/overview
GET         /api/statistics/revenue?period=month
GET         /api/statistics/services
GET         /api/statistics/clients
GET         /api/statistics/comparison
```

## Перенос на другой компьютер

Скопировать папку `hairsapp` целиком + папку `hairsalon` (BSON-файлы). На новом месте:

```bash
cd hairsapp
npm install
npx tsx scripts/migrate.ts   # если hail.db нет
npm run dev
```
