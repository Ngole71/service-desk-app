# Service Desk Application

A modern, multi-tenant service desk application with real-time updates, email integration, and comprehensive customer support features.

## 🏗️ Architecture

This is a monorepo containing:

- **Backend**: NestJS API with TypeORM + PostgreSQL
- **Admin Portal**: React + Vite web interface for administrators and agents
- **Customer Portal**: React + Vite web interface for customers

## ✨ Key Features

### Core Features
- ✅ Multi-tenant architecture with complete data isolation
- ✅ JWT authentication with role-based access control (Admin, Agent, Customer)
- ✅ RESTful API with Swagger documentation
- ✅ PostgreSQL database with TypeORM and automatic migrations
- ✅ Real-time updates via WebSocket (Socket.IO)
- ✅ File attachment support with validation
- ✅ Customer organization management
- ✅ Internal/external comments system
- ✅ Advanced analytics and reporting
- ✅ Ticket assignment and agent load tracking
- ✅ Docker containerization
- ✅ CI/CD ready with GitHub Actions

### Email-to-Ticket Automation
- ✅ **Full SendGrid integration** for email-to-ticket conversion
- ✅ **Email Simulator** - Test email-to-ticket without SendGrid setup
- ✅ **Smart email parsing** - Automatically creates tickets from emails
- ✅ **Email reply handling** - Reply to notification emails to add comments
- ✅ **Email body cleaning** - Removes signatures and quoted text
- ✅ **Tenant routing** - Routes emails to correct tenant by subdomain
- ✅ **Auto-user creation** - Creates customer accounts from new email senders

### FAQ/Knowledge Base System
- ✅ **Admin FAQ management** - Create, edit, publish/unpublish FAQs
- ✅ **Category organization** - Organize FAQs into categories
- ✅ **Customer FAQ portal** - Self-service knowledge base
- ✅ **Search functionality** - Search FAQs by title and content
- ✅ **Rich text support** - Markdown-style formatting for FAQ content
- ✅ **Publish control** - Draft FAQs only visible to admins

### Advanced Workflow Features
- ✅ **Agent assignment requirement** - Tickets locked until agent assigned
- ✅ **Smart field disabling** - Status, priority, comments disabled without agent
- ✅ **Real-time validation** - Prevents premature ticket actions
- ✅ **Email-based ticket creation** - Customers can email to create tickets

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (optional but recommended)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd service-desk-app

# Start all services
docker-compose up -d

# Access the application:
# - Backend API: http://localhost:3000
# - Swagger docs: http://localhost:3000/api/docs
# - Admin Portal: http://localhost:3001
# - Customer Portal: http://localhost:3002
```

### Option 2: Local Development

1. **Start PostgreSQL**:
```bash
docker-compose up postgres -d
```

2. **Set up backend**:
```bash
cd packages/backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run start:dev
```

3. **Run Admin Portal**:
```bash
cd packages/admin-portal
npm install
npm run dev
# Opens at http://localhost:3003
```

4. **Run Customer Portal**:
```bash
cd packages/customer-portal
npm install
npm run dev
# Opens at http://localhost:3004
```

## 📁 Project Structure

```
service-desk-app/
├── packages/
│   ├── backend/              # NestJS API Server
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules
│   │   │   │   ├── auth/     # Authentication
│   │   │   │   ├── tickets/  # Ticket management
│   │   │   │   ├── users/    # User management
│   │   │   │   ├── customers/ # Customer organizations
│   │   │   │   ├── comments/ # Comments system
│   │   │   │   ├── email/    # Email service
│   │   │   │   └── websocket/ # Real-time updates
│   │   │   ├── common/       # Shared utilities
│   │   │   └── config/       # App configuration
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── admin-portal/         # Admin/Agent React App
│   │   ├── src/
│   │   │   ├── App.tsx       # Main component
│   │   │   └── index.css     # Tailwind styles
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── customer-portal/      # Customer React App
│       ├── src/
│       │   ├── App.tsx
│       │   └── index.css
│       ├── vite.config.ts
│       └── package.json
│
├── docker/                   # Docker configuration
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── init-db.sql
│
├── .github/                  # CI/CD workflows
├── .gitignore
├── docker-compose.yml
└── README.md
```

## 📡 API Documentation

Once the backend is running, visit `http://localhost:3000/api/docs` for interactive Swagger documentation.

### Key Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

#### Tickets
- `GET /tickets` - List tickets (filtered by role/tenant)
- `POST /tickets` - Create new ticket
- `GET /tickets/:id` - Get ticket details with comments
- `PATCH /tickets/:id` - Update ticket
- `PATCH /tickets/:id/assign/:assigneeId` - Assign ticket to agent
- `GET /tickets/stats` - Get ticket statistics

#### Comments
- `POST /tickets/:id/comments` - Add comment to ticket
- `PATCH /comments/:id` - Update comment
- `DELETE /comments/:id` - Delete comment

#### Customer Organizations
- `GET /customers` - List customer organizations
- `POST /customers` - Create customer organization
- `PATCH /customers/:id` - Update customer organization

#### Users
- `GET /users` - List users (filtered by role)
- `POST /users` - Create new user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

#### FAQs
- `GET /faqs` - List FAQs (published for customers, all for admins)
- `POST /faqs` - Create new FAQ (admin only)
- `GET /faqs/:id` - Get FAQ details
- `PATCH /faqs/:id` - Update FAQ (admin only)
- `DELETE /faqs/:id` - Delete FAQ (admin only)
- `GET /faqs/categories` - List FAQ categories
- `PATCH /faqs/:id/publish` - Publish/unpublish FAQ (admin only)

#### Email Webhooks
- `POST /webhooks/email/sendgrid` - SendGrid inbound email webhook
- `POST /webhooks/email/test` - Test webhook endpoint

## 🗄️ Database Schema

### Core Entities

- **Tenants**: Multi-tenant isolation
- **Users**: Authentication and authorization (Admin, Agent, Customer roles)
- **Customers**: Customer organizations
- **Tickets**: Support tickets with status/priority/assignment
- **Comments**: Ticket comments (public and internal notes)
- **Attachments**: File attachments with metadata
- **FAQs**: Knowledge base articles with categories and publish status

### Relationships

- Tenants → Users (one-to-many)
- Tenants → Tickets (one-to-many)
- Tenants → Customers (one-to-many)
- Users → Tickets (creator, assignee)
- Customers → Users (one-to-many)
- Customers → Tickets (one-to-many)
- Tickets → Comments (one-to-many)
- Tickets → Attachments (one-to-many)

## 👥 User Roles

### Admin
- Full system access
- Manage users and customer organizations
- View all tickets across all customers
- Assign tickets to agents
- Access analytics and reports

### Agent
- View and manage all tickets
- Assign tickets
- Add internal notes
- Access customer information

### Customer
- Create and view own tickets
- Add comments to own tickets
- View own customer organization details
- Upload attachments

## 🎨 Features by Portal

### Admin Portal
- **Dashboard** with analytics (ticket stats, priority distribution, agent load)
- **Ticket management** with advanced filtering and real-time updates
- **Agent assignment workflow** - Tickets locked until agent assigned
- **User management** - Create/edit/delete users with role assignment
- **Customer organization management** - Manage customer accounts
- **FAQ management** - Create, edit, categorize, and publish FAQs
- **Internal comments system** - Private notes visible only to staff
- **File attachment support** - Upload and download ticket attachments
- **Real-time WebSocket updates** - See new tickets instantly

### Customer Portal
- **Ticket creation** - Simple, intuitive ticket submission
- **View own tickets** - See all tickets with real-time status
- **FAQ portal** - Self-service knowledge base with search
- **Email Simulator** - Test email-to-ticket flow without SendGrid
- **Comments and attachments** - Communicate with support team
- **Real-time updates** - Instant notification of ticket changes
- **Clean interface** - User-friendly, responsive design

## 🛠️ Development

### Backend Development

```bash
cd packages/backend

# Run in development mode
npm run start:dev

# Run tests
npm run test

# Generate migration
npm run migration:generate -- MigrationName

# Run migrations
npm run migration:run

# Lint code
npm run lint
```

### Frontend Development

```bash
cd packages/admin-portal  # or customer-portal

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Utility Scripts

```bash
# Reset admin password (from backend directory)
node reset-admin-password.js

# Clean up test data (from backend directory)
node cleanup-test-data.js
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up -d --build

# Stop and remove volumes (clears database)
docker-compose down -v
```

## 🌐 Environment Variables

See `packages/backend/.env.example` for all available configuration options:

- **Application**: NODE_ENV, PORT, APP_URL
- **Database**: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
- **JWT**: JWT_SECRET, JWT_EXPIRATION
- **Email**: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
- **File Upload**: MAX_FILE_SIZE, UPLOAD_DIRECTORY
- **CORS**: CORS_ORIGIN

## 📝 Default Credentials

After initial setup, a default admin user is created:

```
Email: admin@demo.com
Password: Admin123!
```

**⚠️ Important**: Change this password immediately in production!

## 🚢 Deployment

### Production Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Update admin password
- [ ] Configure SendGrid for email
- [ ] Set up CORS_ORIGIN for your domain
- [ ] Configure database backups
- [ ] Set up SSL/TLS certificates
- [ ] Review and adjust file upload limits
- [ ] Enable production logging
- [ ] Set NODE_ENV=production

### Docker Deployment

```bash
# Build images
docker-compose build

# Start in production mode
docker-compose -f docker-compose.yml up -d
```

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Password hashing with bcrypt
- SQL injection protection via TypeORM
- XSS protection via input validation
- CORS configuration
- File upload validation

## 🧪 Testing

```bash
# Run backend tests
npm run test --workspace=packages/backend

# Run tests with coverage
npm run test:cov --workspace=packages/backend

# Run e2e tests
npm run test:e2e --workspace=packages/backend
```

## 📚 Documentation

- **[Email Simulator Guide](./EMAIL_SIMULATOR_GUIDE.md)** - Complete guide for testing email-to-ticket
- **[Email-to-Ticket Setup](./packages/backend/docs/EMAIL_TO_TICKET_SETUP.md)** - Production SendGrid configuration
- **[API Documentation](http://localhost:3000/api/docs)** - Interactive Swagger docs (when backend is running)

## 🧪 Testing Scripts

The project includes comprehensive test scripts:

```bash
# Test FAQ API endpoints
node test-faq-api.js

# Test email-to-ticket functionality
node test-email-to-ticket.js

# Full end-to-end test suite
node test-e2e-suite.js
```

## 📈 Future Enhancements

- Mobile application (React Native)
- Enhanced analytics and custom reporting
- SLA management and tracking
- Automated ticket routing based on keywords
- Live chat integration
- Multi-language support
- Advanced file preview (PDF, images inline)
- Ticket templates and canned responses
- Customer satisfaction surveys
- Knowledge base article suggestions

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

Private - All rights reserved

---

Built with ❤️ using NestJS, React, PostgreSQL, and Docker
