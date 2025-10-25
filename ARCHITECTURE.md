# Service Desk Application - Architecture Guide

**For Developers New to Full-Stack Development**

This guide explains how the entire application works, from frontend to backend to database.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Database Schema & Relationships](#database-schema--relationships)
5. [Backend Architecture (NestJS)](#backend-architecture-nestjs)
6. [Frontend Architecture (React)](#frontend-architecture-react)
7. [API Documentation (Swagger)](#api-documentation-swagger)
8. [Key Files & Their Purpose](#key-files--their-purpose)
9. [Data Flow Examples](#data-flow-examples)
10. [Common Patterns Used](#common-patterns-used)

---

## System Overview

The Service Desk Application is a **multi-tenant support ticketing system** built using:
- **Backend**: NestJS (TypeScript) - RESTful API
- **Frontend**: React (TypeScript) - Two separate portals
- **Database**: PostgreSQL with TypeORM
- **Real-time**: WebSocket (Socket.IO)
- **Authentication**: JWT (JSON Web Tokens)

### What is Multi-Tenant?

Multi-tenant means multiple organizations (tenants) share the same application but their data is completely isolated. For example:
- Company A can only see their tickets
- Company B can only see their tickets
- Each company has their own users, customers, and tickets

---

## Technology Stack

### Backend Technologies

```
NestJS (Framework)
├── TypeScript (Programming Language)
├── TypeORM (Database ORM - talks to PostgreSQL)
├── PostgreSQL (Database)
├── JWT (Authentication)
├── Socket.IO (Real-time updates)
├── Swagger (API Documentation)
└── Bcrypt (Password hashing)
```

### Frontend Technologies

```
React (UI Framework)
├── TypeScript (Programming Language)
├── Vite (Build tool - faster than Create React App)
├── Tailwind CSS (Styling)
├── Axios (HTTP client - talks to backend)
└── Socket.IO Client (Real-time updates)
```

---

## Application Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└────────────┬──────────────────────────────┬─────────────────┘
             │                              │
             ▼                              ▼
┌────────────────────────┐    ┌────────────────────────────┐
│   Admin/Agent Portal   │    │    Customer Portal         │
│   (React - Port 3001)  │    │   (React - Port 3004)      │
│                        │    │                            │
│  - Ticket Management   │    │  - Create Tickets          │
│  - User Management     │    │  - View Own Tickets        │
│  - FAQ Management      │    │  - FAQ Portal              │
│  - Analytics           │    │  - Email Simulator         │
└────────────┬───────────┘    └──────────┬─────────────────┘
             │                           │
             │  HTTP/REST + WebSocket    │
             ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (NestJS)                        │
│                    Port 3000                                 │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth       │  │   Tickets    │  │   Users      │     │
│  │   Module     │  │   Module     │  │   Module     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   FAQs       │  │   Email      │  │   Comments   │     │
│  │   Module     │  │   Module     │  │   Module     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Customers   │  │  WebSocket   │                        │
│  │  Module      │  │  Gateway     │                        │
│  └──────────────┘  └──────────────┘                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│                    Port 5433                                 │
│                                                              │
│  Tables: tenants, users, customers, tickets, comments,      │
│          faqs, attachments                                   │
└─────────────────────────────────────────────────────────────┘
```

### External Integrations

```
┌─────────────────┐
│    SendGrid     │  ──►  Email-to-Ticket
│  (Email Service)│       Webhook Integration
└─────────────────┘
```

---

## Database Schema & Relationships

### Entity Relationship Diagram (ERD)

```
┌──────────────┐
│   Tenants    │◄─────────────────────┐
│──────────────│                      │
│ id           │                      │
│ name         │                      │
│ domain       │                      │
│ isActive     │                      │
└──────┬───────┘                      │
       │ 1                            │
       │                              │ Many-to-One
       │ Many                         │
       ▼                              │
┌──────────────┐          ┌───────────┴──────┐
│    Users     │          │    Customers     │
│──────────────│          │──────────────────│
│ id           │          │ id               │
│ email        │◄─────────┤ name             │
│ password     │ Many     │ domain           │
│ name         │          │ description      │
│ role         │          │ isActive         │
│ tenantId     │          │ tenantId         │
└──────┬───────┘          └──────────────────┘
       │ 1
       │
       │ Many
       ▼
┌──────────────┐
│   Tickets    │
│──────────────│
│ id           │
│ title        │
│ description  │
│ status       │──┐
│ priority     │  │
│ creatorId    │  │ Many
│ assigneeId   │  │
│ customerOrgId│  ▼
│ tenantId     │  ┌──────────────┐
└──────┬───────┘  │   Comments   │
       │ 1        │──────────────│
       │          │ id           │
       │ Many     │ content      │
       ▼          │ isInternal   │
┌──────────────┐  │ authorId     │
│ Attachments  │  │ ticketId     │
│──────────────│  └──────────────┘
│ id           │
│ filename     │
│ size         │
│ mimeType     │
│ ticketId     │
└──────────────┘

┌──────────────┐
│     FAQs     │
│──────────────│
│ id           │
│ question     │
│ answer       │
│ category     │
│ isPublished  │
│ tenantId     │
└──────────────┘
```

### Key Relationships Explained

1. **Tenant → Users** (One-to-Many)
   - One tenant can have many users
   - Each user belongs to exactly one tenant

2. **Tenant → Customers** (One-to-Many)
   - One tenant can have many customer organizations
   - Each customer organization belongs to one tenant

3. **Customer → Users** (One-to-Many)
   - One customer organization can have many users
   - Each customer user belongs to one customer organization

4. **User → Tickets** (Two relationships)
   - As **creator**: User can create many tickets
   - As **assignee**: Agent/Admin can be assigned many tickets

5. **Ticket → Comments** (One-to-Many)
   - One ticket can have many comments
   - Each comment belongs to one ticket

6. **Ticket → Attachments** (One-to-Many)
   - One ticket can have many file attachments
   - Each attachment belongs to one ticket

---

## Backend Architecture (NestJS)

### Module-Based Architecture

NestJS uses a **modular architecture**. Each feature is organized into modules.

```
packages/backend/src/
│
├── modules/
│   ├── auth/          ← Login, Register, JWT
│   ├── tickets/       ← Ticket CRUD
│   ├── users/         ← User management
│   ├── customers/     ← Customer organizations
│   ├── comments/      ← Ticket comments
│   ├── faqs/          ← FAQ management
│   ├── email/         ← Email-to-ticket
│   └── websocket/     ← Real-time updates
│
├── common/
│   ├── decorators/    ← Custom decorators (@Roles, @CurrentUser)
│   ├── guards/        ← Auth guards (JWT, Role-based)
│   ├── interceptors/  ← Tenant isolation
│   └── entities/      ← Base entity class
│
├── config/            ← Database configuration
│
└── main.ts            ← Application entry point
```

### Anatomy of a Module

Each module typically has:

```
tickets/
├── tickets.module.ts       ← Module definition (imports, exports)
├── tickets.controller.ts   ← HTTP endpoints (routes)
├── tickets.service.ts      ← Business logic
├── entities/
│   └── ticket.entity.ts    ← Database model
└── dto/
    ├── create-ticket.dto.ts  ← Data validation for creating
    ├── update-ticket.dto.ts  ← Data validation for updating
    └── query-tickets.dto.ts  ← Query parameters
```

### How a Request Flows Through the Backend

```
1. HTTP Request comes in
   ↓
2. Controller receives it
   ↓
3. Guards check authentication & permissions
   ↓
4. Interceptor adds tenant context
   ↓
5. DTO validates the data
   ↓
6. Service performs business logic
   ↓
7. Repository talks to database (TypeORM)
   ↓
8. Response sent back to client
```

### Example: Creating a Ticket

**File: `tickets.controller.ts`**
```typescript
@Post()  // POST /tickets
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER', 'ADMIN', 'AGENT')
async create(
  @Body() createTicketDto: CreateTicketDto,
  @CurrentUser() user: User,
) {
  return this.ticketsService.create(createTicketDto, user);
}
```

**What happens:**
1. `@Post()` - This is a POST request
2. `@UseGuards()` - Check if user is logged in and has correct role
3. `@Body()` - Get data from request body, validate with DTO
4. `@CurrentUser()` - Get logged-in user from JWT token
5. Call `ticketsService.create()` - Service handles the logic

**File: `tickets.service.ts`**
```typescript
async create(createTicketDto: CreateTicketDto, user: User) {
  // Create ticket entity
  const ticket = this.ticketsRepository.create({
    ...createTicketDto,
    creatorId: user.id,
    tenantId: user.tenantId,  // Tenant isolation!
  });

  // Save to database
  const savedTicket = await this.ticketsRepository.save(ticket);

  // Emit real-time event via WebSocket
  this.eventsGateway.emitTicketCreated(savedTicket, user.tenantId);

  return savedTicket;
}
```

---

## Frontend Architecture (React)

### Project Structure

```
packages/admin-portal/src/
│
├── main.tsx              ← App entry point
├── App.tsx               ← Main component with routing
├── index.css             ← Global styles (Tailwind)
│
├── context/
│   └── AuthContext.tsx   ← User authentication state
│
├── hooks/
│   └── useSocket.ts      ← WebSocket connection hook
│
├── lib/
│   └── api.ts            ← Axios HTTP client setup
│
├── pages/
│   ├── Login.tsx         ← Login page
│   └── Dashboard.tsx     ← Main dashboard (unused in current app)
│
└── types/
    └── index.ts          ← TypeScript interfaces
```

### How React Components Work

React components are like **building blocks**. Each component is a function that returns HTML (JSX).

**Simple Example:**
```typescript
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// Usage:
<Greeting name="John" />
// Renders: <h1>Hello, John!</h1>
```

### State Management with Hooks

React hooks let you add state to components.

**Common Hooks:**
1. `useState` - Store data that changes
2. `useEffect` - Run code when component loads or updates
3. `useContext` - Share data across components

**Example from our app:**
```typescript
const [tickets, setTickets] = useState<Ticket[]>([]);
const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

useEffect(() => {
  // Load tickets when component mounts
  loadTickets();
}, []);

const loadTickets = async () => {
  const response = await api.get('/tickets');
  setTickets(response.data);
};
```

### How Frontend Talks to Backend

**File: `lib/api.ts`**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',  // Backend URL
});

// Add JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**Usage in components:**
```typescript
// GET request
const response = await api.get('/tickets');
const tickets = response.data;

// POST request
await api.post('/tickets', {
  title: 'New ticket',
  description: 'Help needed',
});

// PATCH request
await api.patch(`/tickets/${ticketId}`, {
  status: 'CLOSED',
});
```

### Authentication Flow

```
1. User enters email & password in Login.tsx
   ↓
2. POST to /auth/login
   ↓
3. Backend validates credentials
   ↓
4. Backend returns JWT token
   ↓
5. Frontend stores token in localStorage
   ↓
6. Frontend redirects to dashboard
   ↓
7. All future requests include token in header
```

---

## API Documentation (Swagger)

**YES! Swagger is already built-in!**

### Accessing Swagger Documentation

When your backend is running, visit:
**http://localhost:3000/api/docs**

### What Swagger Gives You

1. **Interactive API Documentation**
   - See all available endpoints
   - View request/response formats
   - Try API calls directly in browser

2. **Automatic Testing**
   - Click "Try it out" on any endpoint
   - Fill in parameters
   - Execute the request
   - See the response

### Example Swagger Endpoint

```typescript
@ApiOperation({ summary: 'Create a new ticket' })
@ApiResponse({
  status: 201,
  description: 'Ticket successfully created',
  type: Ticket
})
@Post()
async create(@Body() createTicketDto: CreateTicketDto) {
  // ...
}
```

This generates documentation automatically!

---

## Key Files & Their Purpose

### Backend Key Files

| File | Purpose | When to Edit |
|------|---------|-------------|
| `main.ts` | App entry point, CORS, Swagger setup | Adding global middleware |
| `app.module.ts` | Import all modules | Adding new features |
| `*.controller.ts` | HTTP endpoints (routes) | Adding new API endpoints |
| `*.service.ts` | Business logic | Changing how features work |
| `*.entity.ts` | Database models | Changing database structure |
| `*.dto.ts` | Request validation | Changing API inputs |
| `*.guard.ts` | Authentication/Authorization | Changing access rules |

### Frontend Key Files

| File | Purpose | When to Edit |
|------|---------|-------------|
| `App.tsx` | Main app, routing, UI | Adding features, changing layout |
| `AuthContext.tsx` | User login state | Changing auth logic |
| `api.ts` | HTTP client setup | Changing API URL, headers |
| `useSocket.ts` | WebSocket connection | Changing real-time features |
| `types/index.ts` | TypeScript types | Adding new data types |

---

## Data Flow Examples

### Example 1: Creating a Ticket

```
┌─────────────────┐
│  Customer Portal│
│  (React)        │
└────────┬────────┘
         │
         │ 1. User fills form & clicks "Create Ticket"
         │
         ▼
┌─────────────────────────────────────────┐
│  Form submission in Dashboard.tsx       │
│  const handleCreateTicket = async () => {
│    await api.post('/tickets', {        │
│      title, description, priority       │
│    });                                  │
│  }                                      │
└────────┬────────────────────────────────┘
         │
         │ 2. HTTP POST /tickets
         │
         ▼
┌─────────────────────────────────────────┐
│  Backend: tickets.controller.ts         │
│  @Post()                                │
│  create(@Body() dto, @CurrentUser user) │
└────────┬────────────────────────────────┘
         │
         │ 3. Call service
         │
         ▼
┌─────────────────────────────────────────┐
│  Backend: tickets.service.ts            │
│  - Validate data                        │
│  - Create ticket in database            │
│  - Emit WebSocket event                 │
└────────┬────────────────────────────────┘
         │
         │ 4. Save to database
         │
         ▼
┌─────────────────────────────────────────┐
│  PostgreSQL Database                    │
│  INSERT INTO tickets (...)              │
└────────┬────────────────────────────────┘
         │
         │ 5. Return new ticket
         │
         ▼
┌─────────────────────────────────────────┐
│  WebSocket Gateway                      │
│  - Emit "ticketCreated" event           │
└────────┬────────────────────────────────┘
         │
         │ 6. Real-time notification
         │
         ▼
┌─────────────────────────────────────────┐
│  Admin Portal (React)                   │
│  - Receives WebSocket event             │
│  - Updates ticket list automatically    │
└─────────────────────────────────────────┘
```

### Example 2: Email-to-Ticket Flow

```
1. Customer sends email to support@demo.yourcompany.com
   ↓
2. SendGrid receives email, triggers webhook
   ↓
3. POST to /webhooks/email/sendgrid
   ↓
4. EmailService parses email:
   - Extract sender, subject, body
   - Clean quoted text & signatures
   - Check for ticket ID in subject
   ↓
5. If ticket ID found:
   - Add as comment to existing ticket
   Else:
   - Create new ticket
   - Auto-create user if needed
   ↓
6. Save to database
   ↓
7. WebSocket notifies admin portal
```

---

## Common Patterns Used

### 1. Dependency Injection (NestJS)

Instead of creating dependencies yourself, NestJS injects them:

```typescript
@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    private eventsGateway: EventsGateway,
  ) {}
  // NestJS automatically provides these dependencies!
}
```

### 2. Decorators

Decorators are functions that add metadata:

```typescript
@Controller('tickets')  // This is a controller for /tickets
export class TicketsController {

  @Get()  // Handle GET /tickets
  findAll() {
    // ...
  }

  @Post()  // Handle POST /tickets
  @UseGuards(JwtAuthGuard)  // Require authentication
  @Roles('ADMIN')  // Require ADMIN role
  create() {
    // ...
  }
}
```

### 3. Guards (Security)

Guards check if a request should be allowed:

```typescript
@Injectable()
export class JwtAuthGuard {
  canActivate(context) {
    // Check if user has valid JWT token
    const token = extractToken(context);
    return validateToken(token);
  }
}
```

### 4. Interceptors (Tenant Isolation)

Interceptors run before/after request handlers:

```typescript
@Injectable()
export class TenantInterceptor {
  intercept(context, next) {
    // Add tenantId filter to all database queries
    const user = getUser(context);
    addTenantFilter(user.tenantId);
    return next.handle();
  }
}
```

### 5. DTOs (Data Transfer Objects)

DTOs validate incoming data:

```typescript
export class CreateTicketDto {
  @IsString()
  @MinLength(5)
  title: string;  // Must be a string, min 5 characters

  @IsString()
  description: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority: string;  // Must be one of these values
}
```

### 6. React Context (State Sharing)

Share data across components without passing props:

```typescript
// Create context
const AuthContext = createContext();

// Provide to app
<AuthContext.Provider value={{ user, login, logout }}>
  <App />
</AuthContext.Provider>

// Use in any component
function SomeComponent() {
  const { user, logout } = useContext(AuthContext);
  return <div>Hello {user.name}</div>;
}
```

---

## Security Features

### 1. JWT Authentication

```
User logs in → Backend creates JWT token → Token contains user ID & role
                                         ↓
Frontend stores token → All requests include token → Backend verifies token
```

### 2. Role-Based Access Control (RBAC)

```typescript
@Roles('ADMIN')  // Only admins can access this endpoint
@Get('admin-only')
adminOnlyEndpoint() {
  // ...
}
```

### 3. Tenant Isolation

Every database query automatically filters by tenantId:

```typescript
// User's tenantId = "abc-123"
const tickets = await ticketsRepository.find();
// Automatically becomes:
// SELECT * FROM tickets WHERE "tenantId" = 'abc-123'
```

### 4. Password Hashing

Passwords are never stored in plain text:

```typescript
import * as bcrypt from 'bcrypt';

// When user registers:
const hashedPassword = await bcrypt.hash(password, 10);

// When user logs in:
const isValid = await bcrypt.compare(password, hashedPassword);
```

---

## Real-Time Updates (WebSocket)

### How WebSocket Works

Traditional HTTP: Request → Response (one-time)
WebSocket: Persistent connection (two-way, real-time)

### Backend (Gateway)

```typescript
@WebSocketGateway()
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  emitTicketCreated(ticket: Ticket, tenantId: string) {
    // Send to all clients in this tenant's room
    this.server
      .to(`tenant:${tenantId}`)
      .emit('ticketCreated', ticket);
  }
}
```

### Frontend (Hook)

```typescript
const socket = io('http://localhost:3000');

// Join tenant room
socket.emit('join', `tenant:${user.tenantId}`);

// Listen for new tickets
socket.on('ticketCreated', (ticket) => {
  // Add to ticket list
  setTickets(prev => [ticket, ...prev]);
});
```

---

## Development Workflow

### 1. Adding a New Feature

Example: Add "Ticket Tags" feature

**Backend:**
```
1. Create entity: tags.entity.ts
2. Create DTO: create-tag.dto.ts
3. Create service: tags.service.ts
4. Create controller: tags.controller.ts
5. Create module: tags.module.ts
6. Import in app.module.ts
7. Test in Swagger
```

**Frontend:**
```
1. Add type in types/index.ts
2. Add API calls in component
3. Add UI for tags
4. Test in browser
```

### 2. Debugging Tips

**Backend:**
- Check logs in terminal
- Use Swagger to test endpoints
- Check database with `psql` or pgAdmin
- Add `console.log()` in services

**Frontend:**
- Check browser console (F12)
- Check Network tab for API calls
- Add `console.log()` in components
- Use React DevTools

### 3. Common Issues

**CORS errors:**
- Add origin to CORS_ORIGIN in backend .env

**401 Unauthorized:**
- Check if JWT token is valid
- Check if token is being sent in header

**Data not showing:**
- Check if tenantId is correct
- Check if user has correct role
- Check if data exists in database

---

## Next Steps for Learning

### To Better Understand NestJS:
1. Read: [NestJS Documentation](https://docs.nestjs.com)
2. Learn: TypeScript decorators
3. Study: Dependency Injection pattern

### To Better Understand React:
1. Read: [React Documentation](https://react.dev)
2. Learn: Hooks (useState, useEffect, useContext)
3. Study: Component lifecycle

### To Better Understand TypeORM:
1. Read: [TypeORM Documentation](https://typeorm.io)
2. Learn: Entity relationships
3. Study: Query building

---

## Quick Reference: Common Commands

### Backend
```bash
npm run start:dev      # Start development server
npm run build          # Build for production
npm run migration:generate  # Create database migration
```

### Frontend
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
```

### Database
```bash
psql -U postgres -d service_desk  # Connect to database
\dt                               # List tables
\d tickets                        # Show table structure
```

---

## Glossary

- **API**: Application Programming Interface - how frontend talks to backend
- **CRUD**: Create, Read, Update, Delete - basic database operations
- **DTO**: Data Transfer Object - validates request data
- **Entity**: Database model/table
- **Guard**: Security check before allowing access
- **JWT**: JSON Web Token - secure way to identify users
- **Module**: Group of related features
- **ORM**: Object-Relational Mapping - write database queries using objects
- **Repository**: Handles database operations for an entity
- **Service**: Contains business logic
- **WebSocket**: Two-way real-time communication

---

**Questions?** Check the inline code comments or ask for clarification on specific parts!
