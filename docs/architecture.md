# Architecture — AI Appointment Booking Assistant

## Folder Structure

```
appointment-ai-assistant/
├── backend/                    Express + TypeScript API
│   ├── src/
│   │   ├── app.ts              Express app configuration + middleware stack
│   │   ├── server.ts           Entry point, DB connect, graceful shutdown
│   │   ├── config/
│   │   │   └── env.ts          Typed + validated environment variables
│   │   ├── middleware/
│   │   │   ├── authenticate.ts JWT Bearer token guard
│   │   │   ├── errorHandler.ts Global error handler (Prisma-aware)
│   │   │   ├── notFound.ts     404 catch-all
│   │   │   ├── rateLimiter.ts  express-rate-limit config
│   │   │   └── validate.ts     Zod middleware factory
│   │   ├── routes/
│   │   │   ├── index.ts        Route registry
│   │   │   ├── health.ts       GET /api/health
│   │   │   ├── auth.ts         POST /api/auth/signup|login, GET /api/auth/me
│   │   │   ├── appointments.ts CRUD /api/appointments
│   │   │   └── chat.ts         /api/chat/sessions + messages
│   │   ├── controllers/        Thin request handlers — delegate to services
│   │   ├── services/
│   │   │   ├── auth.service.ts  bcrypt, JWT, user lookup
│   │   │   ├── appointment.service.ts  CRUD + conflict detection
│   │   │   ├── chat.service.ts  AI orchestration + booking flow
│   │   │   └── ai.service.ts    Mistral API — no DB access
│   │   ├── validators/         Zod schemas (auth, appointment, chat)
│   │   ├── utils/
│   │   │   ├── logger.ts       Structured logger
│   │   │   └── response.ts     Standardized JSON response helpers
│   │   ├── types/index.ts      AuthenticatedRequest interface
│   │   └── db/prisma.ts        Singleton Prisma client
│   ├── prisma/
│   │   ├── schema.prisma       Data model + enums + indexes
│   │   ├── seed.ts             Development seed data
│   │   └── migrations/         Applied migration SQL
│   ├── .env.example            Template with CHANGE_ME placeholders
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx          Root layout + AuthGuard
│   │   ├── globals.css         Tailwind base + dark theme
│   │   ├── page.tsx            Landing page
│   │   ├── login/page.tsx      Sign in
│   │   ├── signup/page.tsx     Create account
│   │   ├── chat/page.tsx       AI chat interface
│   │   └── appointments/page.tsx  Appointment list
│   ├── components/
│   │   ├── ui/                 Button, Input, ErrorMessage, EmptyState, LoadingSpinner
│   │   ├── layout/             Navbar, AuthGuard
│   │   ├── auth/               AuthCard wrapper
│   │   ├── chat/               ChatMessage, TypingIndicator, BookingConfirmation
│   │   └── appointments/       AppointmentCard, BookingForm
│   ├── hooks/
│   │   └── useAuth.ts          Token + user state from localStorage
│   ├── lib/
│   │   ├── api.ts              Centralized API client (authApi, chatApi, appointmentsApi)
│   │   └── utils.ts            cn(), formatDate(), storage helpers
│   ├── types/index.ts          Shared TypeScript interfaces
│   ├── .env.example
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
│
├── database/
│   ├── schema.sql              Raw PostgreSQL DDL (reference — Prisma is source of truth)
│   └── seed.sql                Sample SQL seed data
│
├── docs/
│   └── architecture.md         This file
│
├── .gitignore
└── README.md
```

## Request Lifecycle

```
1. Browser → Next.js page component
2. Component calls lib/api.ts function
3. lib/api.ts attaches Bearer token from localStorage
4. fetch() → Express server
5. Helmet + CORS + rate limiter → route
6. authenticate middleware verifies JWT → sets req.user
7. Zod validate middleware checks req.body
8. Controller receives typed request
9. Service executes business logic
10. Prisma executes parameterized SQL
11. PostgreSQL returns result
12. Service returns typed data
13. Controller calls sendSuccess/sendCreated
14. Standardized JSON → browser
15. Component updates React state
```

## Security Layers

```
Request
  │
  ├── Helmet        → X-Frame-Options, HSTS, XSS-Protection, CSP headers
  ├── CORS          → Origin must match CORS_ORIGIN env variable
  ├── Rate Limit    → 100/15min global, 10/15min on /api/auth/*
  ├── Body Parser   → 10kb max, JSON only
  ├── authenticate  → JWT.verify() with JWT_SECRET from env
  ├── validate      → Zod schema — rejects unknown fields
  └── Service       → ownership check (userId from token only)
```

## Data Flow — AI Booking

```
POST /api/chat/sessions/:id/messages  { content: "dental appointment Friday 10am" }
  │
  ├─ authenticate middleware → req.user.id from JWT
  │
  ├─ ChatService.sendMessage(sessionId, userId, content)
  │     │
  │     ├─ findOwnedSessionOrThrow → 403 if wrong user
  │     │
  │     ├─ prisma.chatMessage.create  { role: USER }
  │     │
  │     ├─ prisma.chatMessage.findMany  (last 20 messages as history)
  │     │
  │     ├─ AiService.analyze(history, content)
  │     │     ├─ Build system prompt + history + user message
  │     │     ├─ POST https://api.mistral.ai/v1/chat/completions
  │     │     │     response_format: { type: "json_object" }
  │     │     ├─ JSON.parse → Zod validation
  │     │     └─ Returns { success, analysis: { intent, date, time, reason, missing } }
  │     │
  │     ├─ intent === "book_appointment"?
  │     │     ├─ Backend re-validates: date format, future date, time format, reason length
  │     │     ├─ Missing fields → clarify message, return fallbackForm
  │     │     └─ All present → AppointmentService.create(userId, { ... })
  │     │                           └─ conflict check → 409 if slot taken
  │     │                           └─ prisma.appointment.create
  │     │
  │     ├─ prisma.chatMessage.create  { role: ASSISTANT }
  │     │
  │     └─ Return SendMessageResult
  │
  └─ 201 { userMessage, assistantMessage, booking, fallbackForm, aiAvailable }
```
