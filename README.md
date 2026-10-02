# AI Appointment Booking Assistant

A full-stack SaaS web application with an AI-powered chatbot for appointment booking, built as a senior full-stack developer technical assessment.

---

## Overview

BookAI lets users book appointments through natural conversation. The user types a message like *"Book me a dental appointment next Friday at 10am"* — the AI assistant (powered by Mistral) extracts the intent, date, time, and reason from the message. The backend validates the extracted data independently, checks for conflicts, and creates the appointment if all information is present. If anything is missing, the assistant asks a clarifying question. If the AI is unavailable, a structured fallback form appears automatically.

---

## Features

- **JWT Authentication** — Signup, login, token-based session management
- **AI Appointment Assistant** — Mistral-powered conversational booking
- **Multi-turn Chat** — Conversation history sent as context on each turn
- **Appointment Booking** — Create, view, and cancel appointments
- **Appointment Management** — Status tracking (Scheduled, Completed, Cancelled)
- **Conflict Detection** — Prevents double-booking the same date/time slot
- **Fallback Form** — Structured booking form when AI cannot complete the request
- **PostgreSQL + Prisma** — Relational database with type-safe ORM
- **Security** — Helmet, CORS, rate limiting, Zod validation, bcrypt

---

## Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Frontend   | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend    | Node.js, Express, TypeScript                |
| Database   | PostgreSQL 18, Prisma ORM                   |
| Auth       | JSON Web Tokens (JWT), bcrypt               |
| Validation | Zod                                         |
| AI         | Mistral API (`mistral-small-latest`)        |
| Security   | Helmet, CORS, express-rate-limit            |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                         │
│  /login  /signup  /chat  /appointments                       │
└───────────────────────┬─────────────────────────────────────┘
                        │  HTTPS REST
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express API  :5000                          │
│                                                             │
│  Middleware: Helmet → CORS → Compression →                  │
│             Body Parsing → Morgan → Rate Limiter            │
│                                                             │
│  Routes:  /api/auth  /api/appointments  /api/chat           │
│                                                             │
│  Services:                                                  │
│    AuthService    → bcrypt + JWT                            │
│    AppointmentService → conflict checks + CRUD              │
│    ChatService    → AI orchestration                        │
│    AiService      → Mistral API (no DB access)              │
└───────────────────────┬─────────────────────────────────────┘
                        │  Prisma ORM
                        ▼
┌─────────────────────────────────────────────────────────────┐
│             PostgreSQL  (appointment_ai database)           │
│   users · appointments · chat_sessions · chat_messages      │
└─────────────────────────────────────────────────────────────┘
                        ▲
                (AiService calls Mistral API separately)
                        │  HTTPS
                        ▼
              ┌──────────────────┐
              │   Mistral API    │
              │ mistral-small-   │
              │    latest        │
              └──────────────────┘
```

### AI Booking Flow

```
User message
    │
    ▼
POST /api/chat/sessions/:id/messages
    │
    ▼
ChatService.sendMessage()
    │
    ├─ Save user message to DB
    │
    ├─ Load last 20 messages as history
    │
    ├─ AiService.analyze(history, message)
    │     └─ Mistral API → structured JSON response
    │           └─ Zod validation of AI output
    │
    ├─ intent = book_appointment?
    │     ├─ YES: backend re-validates date/time/reason
    │     │         ├─ all present → AppointmentService.create()
    │     │         └─ missing     → clarification message
    │     └─ NO:  use AI reply as-is
    │
    ├─ Save assistant message to DB
    │
    └─ Return { userMessage, assistantMessage, booking, fallbackForm }
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally
- A free Mistral API key from [console.mistral.ai](https://console.mistral.ai)

---

### 1. Clone / navigate to the project

```bash
cd appointment-ai-assistant
```

---

### 2. Backend setup

```bash
cd backend

# Copy environment template
cp .env.example .env
# Edit .env and fill in DATABASE_URL, JWT_SECRET, MISTRAL_API_KEY

# Install dependencies
npm install

# Run database migration (creates all tables)
npx prisma migrate dev --name init

# (Optional) Seed with sample data
npm run db:seed

# Start development server
npm run dev
# → http://localhost:5000
```

---

### 3. Frontend setup

```bash
cd frontend

# Copy environment template
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:5000

# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:3000
```

---

### 4. Verify it works

```bash
# Health check
curl http://localhost:5000/api/health

# Expected:
# { "success": true, "status": "ok", "database": "connected", ... }
```

Then open `http://localhost:3000`, create an account, and start chatting.

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `7d`) |
| `MISTRAL_API_KEY` | **Yes*** | Mistral AI key — AI falls back gracefully if missing |
| `MISTRAL_MODEL` | No | Model name (default: `mistral-small-latest`) |
| `CORS_ORIGIN` | No | Allowed frontend origin (default: `http://localhost:3000`) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: `900000`) |
| `RATE_LIMIT_MAX` | No | Max requests per window (default: `100`) |

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend — `frontend/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | Backend base URL, no trailing slash |

> **Never put `JWT_SECRET`, `DATABASE_URL`, or `MISTRAL_API_KEY` in any `NEXT_PUBLIC_*` variable.**

---

## API Reference

All responses follow: `{ success: boolean, message: string, data?: T, errors?: [...] }`

### Authentication

| Method | Path | Auth | Body | Purpose |
|--------|------|------|------|---------|
| `POST` | `/api/auth/signup` | None | `{ name, email, password }` | Create account, returns JWT |
| `POST` | `/api/auth/login` | None | `{ email, password }` | Login, returns JWT |
| `GET` | `/api/auth/me` | Bearer | — | Get current user profile |

**Password rules:** min 8 chars, 1 uppercase, 1 number  
**Status codes:** `201` created · `401` bad credentials · `409` email taken

---

### Appointments

All endpoints require `Authorization: Bearer <token>`.

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| `POST` | `/api/appointments` | `{ appointment_date, appointment_time, reason }` | Create appointment |
| `GET` | `/api/appointments` | — | List own appointments |
| `GET` | `/api/appointments/:id` | — | Get one appointment |
| `PATCH` | `/api/appointments/:id` | partial fields | Update appointment |
| `DELETE` | `/api/appointments/:id` | — | Cancel appointment |

**Date format:** `YYYY-MM-DD` · **Time format:** `HH:MM` (24-hour)  
**Status codes:** `201` created · `400` validation · `403` wrong user · `404` not found · `409` conflict

---

### Chat

All endpoints require `Authorization: Bearer <token>`.

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| `POST` | `/api/chat/sessions` | `{ title? }` | Create chat session |
| `GET` | `/api/chat/sessions` | — | List sessions |
| `GET` | `/api/chat/sessions/:id/messages` | — | Get message history |
| `POST` | `/api/chat/sessions/:id/messages` | `{ content }` | Send message (triggers AI flow) |

**`POST .../messages` response includes:**
```json
{
  "userMessage":      { "id": "...", "role": "USER",      "content": "..." },
  "assistantMessage": { "id": "...", "role": "ASSISTANT", "content": "..." },
  "analysis":         { "intent": "book_appointment", "date": "2026-12-20", ... },
  "booking":          { "status": "booked", "appointment": { ... } },
  "fallbackForm":     null,
  "aiAvailable":      true
}
```

`booking.status` values: `booked` · `incomplete` · `conflict` · `not_requested` · `ai_unavailable`

---

### Health

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/health` | None | Liveness check — DB status, uptime |

---

## Database

### Schema Overview

```
users
  id · name · email (unique) · password_hash · created_at · updated_at

appointments
  id · user_id (FK→users) · appointment_date · appointment_time
  reason · status (SCHEDULED|CANCELLED|COMPLETED) · created_at · updated_at

chat_sessions
  id · user_id (FK→users) · title · created_at · updated_at

chat_messages
  id · session_id (FK→chat_sessions) · role (USER|ASSISTANT|SYSTEM)
  content · created_at
```

### Relationships

```
users ──< appointments     (one user → many appointments)
users ──< chat_sessions    (one user → many sessions)
chat_sessions ──< chat_messages  (one session → many messages)
```

### Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `users` | `email` (unique) | Fast login lookup |
| `appointments` | `(user_id, appointment_date)` | User calendar queries |
| `appointments` | `status` | Filter by status |
| `appointments` | `appointment_date` | Date range queries |
| `chat_sessions` | `user_id` | Session listing |
| `chat_messages` | `(session_id, created_at)` | Chronological history |

### Constraints

- `users.email` — UNIQUE
- `appointments.user_id` → `users.id` ON DELETE CASCADE
- `chat_sessions.user_id` → `users.id` ON DELETE CASCADE
- `chat_messages.session_id` → `chat_sessions.id` ON DELETE CASCADE
- `appointments.status` — enum check
- `chat_messages.role` — enum check

---

## AI Integration

### How it works

1. `AiService.analyze(history, userMessage)` sends the last 10 conversation turns + the new message to Mistral with a system prompt instructing JSON output.

2. Mistral returns a structured JSON object:
   ```json
   {
     "intent": "book_appointment",
     "reply": "...",
     "date": "2026-12-20",
     "time": "10:00",
     "reason": "dental checkup",
     "missing": []
   }
   ```

3. The response is validated through a **Zod schema** — malformed, incomplete, or unexpected output is rejected and replaced with a safe fallback.

4. `ChatService` re-validates date/time/reason independently (backend never trusts AI output blindly):
   - Date must match `YYYY-MM-DD` and be in the future
   - Time must match `HH:MM` (24-hour)
   - Reason must be ≥ 3 characters

5. If all fields pass, `AppointmentService.create()` is called — the AI never touches the database.

### Why AI does not access the database

Separation of concerns and security. `AiService` is a pure HTTP service — it calls Mistral and returns validated data. `ChatService` orchestrates the decision, and `AppointmentService` handles all database writes. This means:
- A compromised AI response cannot create/modify records directly
- Business rules (conflict detection, ownership) are always enforced

### Error handling

| Failure | Response |
|---------|----------|
| No API key | Graceful fallback message + form |
| Network timeout (15s) | Graceful fallback message |
| Non-2xx from Mistral | Graceful fallback message |
| Non-JSON response | Graceful fallback message |
| Zod validation failure | Graceful fallback message |
| Past date extracted | Nullified, added to `missing` |

---

## Security

| Mechanism | Implementation |
|-----------|---------------|
| **Password hashing** | bcrypt, cost factor 12 |
| **Authentication** | JWT, verified on every protected request |
| **No password in responses** | `toSafeUser()` strips `passwordHash` before returning |
| **Email enumeration protection** | Constant-time compare even when user not found |
| **CORS** | Locked to `CORS_ORIGIN` env variable only |
| **Security headers** | Helmet (XSS, HSTS, CSP, etc.) |
| **Rate limiting** | 100 req/15min global · 10 req/15min on auth routes |
| **Request validation** | Zod schemas on all request bodies |
| **Ownership checks** | Every data access verifies `userId` matches token |
| **Body size limit** | 10kb max to prevent payload attacks |
| **No secrets in frontend** | `NEXT_PUBLIC_*` contains only the backend URL |
| **No secrets committed** | `.env` and `.env.local` in `.gitignore` |

---

## Design Decisions & Tradeoffs

### PostgreSQL over NoSQL
Appointments and chat history have clear relational structure (users → appointments, sessions → messages). Foreign keys and constraints guarantee data integrity. A document store would sacrifice referential integrity for no benefit here.

### Prisma ORM
Type-safe database access eliminates a class of runtime bugs. Auto-generated migrations keep schema and code in sync. The tradeoff is Prisma's abstraction over raw SQL — acceptable for this scope.

### REST API over GraphQL
REST is simpler to implement, easier to test with curl, and well-understood. GraphQL's flexibility is unnecessary for this scope's fixed set of operations.

### Service-based backend architecture
Controllers are thin (request/response only). Services contain business logic. This separation makes the codebase testable and maintainable — each service can be tested or replaced independently.

### Mistral for AI
Free tier available, reliable JSON mode, reasonable latency. `response_format: { type: "json_object" }` forces structured output, reducing parse failures.

### Structured AI output with Zod validation
Asking the AI for JSON with a specific schema + validating it with Zod means the backend never processes raw, unstructured LLM output. The AI is treated as an unreliable external service, not a trusted data source.

### JWT (stateless) over sessions
No session store needed. Simpler horizontal scaling. Tradeoff: tokens cannot be revoked before expiry — acceptable for a prototype with short (7d) expiry.

### Fallback form
The AI failing should never block the user from booking. When AI is unavailable or extracts incomplete data, a pre-filled form appears automatically.

---

## Known Limitations & Future Improvements

| Area | Current | Future |
|------|---------|--------|
| Token revocation | Not implemented | Redis-based blocklist or refresh tokens |
| Real-time chat | Request/response polling | WebSocket / Server-Sent Events |
| Email notifications | None | Nodemailer / SendGrid for booking confirmations |
| Calendar integration | None | Google Calendar / Outlook sync |
| Timezone handling | Server timezone assumed | `luxon` + user timezone preference |
| Admin dashboard | None | Staff-facing appointment management |
| Multi-tenancy | Single tenant | `business_id` column already in DB schema design |
| Observability | Console logging | OpenTelemetry / Datadog / Sentry |
| Test suite | Manual curl scripts | Jest + Supertest for backend, Playwright for E2E |
| Role-based access | All users are `"user"` | Admin/staff roles with route guards |
| File uploads | None | Appointment attachments (prescriptions, etc.) |

---

## Deployment

The project is **deployment-ready** but **not deployed** (no live URL exists for this assessment).

### Production checklist

**Backend**
- [ ] Set `NODE_ENV=production`
- [ ] Use a strong `JWT_SECRET` (48+ random bytes)
- [ ] Set `DATABASE_URL` to production PostgreSQL connection string
- [ ] Set `MISTRAL_API_KEY` to your production API key
- [ ] Set `CORS_ORIGIN` to your production frontend URL
- [ ] Run `npx prisma migrate deploy` (not `migrate dev`)
- [ ] Use a process manager (PM2 or systemd) or containerize

**Frontend**
- [ ] Set `NEXT_PUBLIC_API_URL` to your production backend URL
- [ ] Run `npm run build` and serve with `npm start` or a CDN

### Build commands

```bash
# Backend
cd backend
npm run build       # compiles TypeScript → dist/
npm start           # runs dist/server.js

# Frontend
cd frontend
npm run build       # Next.js production build
npm start           # serves the production build
```

### Docker (optional, not included)

A `Dockerfile` per service and a `docker-compose.yml` can be added. The services are stateless (backend) and use environment-variable-based config — standard containerization applies.

### Environment variable management

Use a secrets manager (AWS Secrets Manager, Doppler, Vault) for production. Never commit `.env` files. The `.env.example` files contain only `CHANGE_ME` placeholders.

---

## npm Scripts

### Backend (`cd backend`)

| Script | Command |
|--------|---------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production server |
| `npm run type-check` | TypeScript check without emit |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Run migrations (development) |
| `npm run db:migrate:prod` | Run migrations (production) |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |

### Frontend (`cd frontend`)

| Script | Command |
|--------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript check without emit |
