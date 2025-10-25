# Database Class Diagram

This document shows the database entities and their relationships in detail.

## Visual Class Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           Tenant                                 │
├─────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                     │
│     name: string                                                 │
│     domain: string                                               │
│     isActive: boolean                                            │
│     createdAt: timestamp                                         │
│     updatedAt: timestamp                                         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ 1
                   │
                   │ *
┌──────────────────┴──────────────────────────────────────────────┐
│                           User                                   │
├─────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                     │
│     email: string (unique)                                       │
│     password: string (hashed)                                    │
│     name: string                                                 │
│     role: enum (ADMIN, AGENT, CUSTOMER)                          │
│ FK  tenantId: UUID                                               │
│ FK  customerOrgId: UUID (nullable)                               │
│     isActive: boolean                                            │
│     createdAt: timestamp                                         │
│     updatedAt: timestamp                                         │
└────┬─────────────────────┬──────────────────────────────────────┘
     │                     │
     │ creator             │ assignee
     │ 1                   │ 1
     │                     │
     │ *                   │ *
     │                     │
     │  ┌──────────────────┴──────────────────────────────────────┐
     │  │                     Ticket                               │
     │  ├─────────────────────────────────────────────────────────┤
     │  │ PK  id: UUID                                             │
     │  │     title: string                                        │
     │  │     description: text                                    │
     │  │     status: enum (OPEN, IN_PROGRESS, WAITING, CLOSED)    │
     │  │     priority: enum (LOW, MEDIUM, HIGH, URGENT)           │
     │  │ FK  creatorId: UUID                                      │
     │  │ FK  assigneeId: UUID (nullable)                          │
     │  │ FK  customerOrgId: UUID (nullable)                       │
     │  │ FK  tenantId: UUID                                       │
     │  │     createdAt: timestamp                                 │
     │  │     updatedAt: timestamp                                 │
     │  └────┬──────────────────┬──────────────────────────────────┘
     │       │ 1                │ 1
     │       │                  │
     │       │ *                │ *
     │       │                  │
     │  ┌────┴───────────┐  ┌──┴──────────────────────────────────┐
     │  │   Attachment   │  │           Comment                    │
     │  ├────────────────┤  ├─────────────────────────────────────┤
     │  │ PK  id: UUID   │  │ PK  id: UUID                         │
     │  │     filename   │  │     content: text                    │
     │  │     filepath   │  │     isInternal: boolean              │
     │  │     size       │  │ FK  ticketId: UUID                   │
     │  │     mimeType   │  │ FK  authorId: UUID                   │
     │  │ FK  ticketId   │  │ FK  tenantId: UUID                   │
     │  │     createdAt  │  │     createdAt: timestamp             │
     │  │     updatedAt  │  │     updatedAt: timestamp             │
     │  └────────────────┘  └─────────────────────────────────────┬┘
     │                                                             │
     └─────────────────────────────────────────────────────────────┘
                                                                   │
                                                                   │ author
                                                                   │ 1


┌─────────────────────────────────────────────────────────────────┐
│                        Customer                                  │
├─────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                     │
│     name: string                                                 │
│     domain: string (nullable)                                    │
│     description: text (nullable)                                 │
│ FK  tenantId: UUID                                               │
│     isActive: boolean                                            │
│     createdAt: timestamp                                         │
│     updatedAt: timestamp                                         │
└─────────────────────────────────────────────────────────────────┘
        │ 1
        │
        │ *
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                          User                                    │
│                    (customer users)                              │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                           FAQ                                    │
├─────────────────────────────────────────────────────────────────┤
│ PK  id: UUID                                                     │
│     question: string                                             │
│     answer: text                                                 │
│     category: string                                             │
│     isPublished: boolean                                         │
│ FK  tenantId: UUID                                               │
│     createdAt: timestamp                                         │
│     updatedAt: timestamp                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Relationship Details

### Tenant Relationships

```
Tenant (1) ──────► (Many) User
Tenant (1) ──────► (Many) Customer
Tenant (1) ──────► (Many) Ticket
Tenant (1) ──────► (Many) FAQ
Tenant (1) ──────► (Many) Comment
```

**Purpose**: Complete data isolation between different organizations

### User Relationships

```
User (1) ──────► (Many) Ticket [as creator]
User (1) ──────► (Many) Ticket [as assignee]
User (1) ──────► (Many) Comment [as author]
Customer (1) ──────► (Many) User [customer users]
```

**Purpose**: Track who created tickets, who they're assigned to, and who wrote comments

### Ticket Relationships

```
Ticket (1) ──────► (Many) Comment
Ticket (1) ──────► (Many) Attachment
Customer (1) ──────► (Many) Ticket
```

**Purpose**: Keep all related information together

## Entity Details

### Tenant Entity

**File**: `packages/backend/src/modules/tenants/entities/tenant.entity.ts`

```typescript
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  domain: string;

  @Column({ default: true })
  isActive: boolean;

  // Relationships
  @OneToMany(() => User, user => user.tenant)
  users: User[];

  @OneToMany(() => Ticket, ticket => ticket.tenant)
  tickets: Ticket[];
}
```

### User Entity

**File**: `packages/backend/src/modules/users/entities/user.entity.ts`

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;  // Hashed with bcrypt

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['ADMIN', 'AGENT', 'CUSTOMER'] })
  role: string;

  // Foreign Keys
  @ManyToOne(() => Tenant, tenant => tenant.users)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customerOrgId' })
  customerOrg?: Customer;

  // Relationships
  @OneToMany(() => Ticket, ticket => ticket.creator)
  createdTickets: Ticket[];

  @OneToMany(() => Ticket, ticket => ticket.assignee)
  assignedTickets: Ticket[];

  @OneToMany(() => Comment, comment => comment.author)
  comments: Comment[];
}
```

### Ticket Entity

**File**: `packages/backend/src/modules/tickets/entities/ticket.entity.ts`

```typescript
@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: ['OPEN', 'IN_PROGRESS', 'WAITING', 'CLOSED'],
    default: 'OPEN'
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  })
  priority: string;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customerOrgId' })
  customerOrg?: Customer;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @OneToMany(() => Comment, comment => comment.ticket)
  comments: Comment[];

  @OneToMany(() => Attachment, attachment => attachment.ticket)
  attachments: Attachment[];
}
```

### Comment Entity

**File**: `packages/backend/src/modules/comments/entities/comment.entity.ts`

```typescript
@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  isInternal: boolean;  // Internal notes only visible to staff

  // Relationships
  @ManyToOne(() => Ticket, ticket => ticket.comments)
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
```

### Customer Entity

**File**: `packages/backend/src/modules/customers/entities/customer.entity.ts`

```typescript
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  domain?: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @OneToMany(() => User, user => user.customerOrg)
  users: User[];

  @OneToMany(() => Ticket, ticket => ticket.customerOrg)
  tickets: Ticket[];
}
```

### FAQ Entity

**File**: `packages/backend/src/modules/faqs/entities/faq.entity.ts`

```typescript
@Entity('faqs')
export class FAQ {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  question: string;

  @Column('text')
  answer: string;

  @Column()
  category: string;

  @Column({ default: false })
  isPublished: boolean;  // Draft vs published

  // Relationships
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
```

### Attachment Entity

**File**: `packages/backend/src/modules/tickets/entities/attachment.entity.ts`

```typescript
@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  filepath: string;

  @Column()
  size: number;

  @Column()
  mimeType: string;

  // Relationships
  @ManyToOne(() => Ticket, ticket => ticket.attachments)
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;
}
```

## Database Constraints

### Primary Keys (PK)
- All tables use UUID as primary key
- Auto-generated by PostgreSQL

### Foreign Keys (FK)
```sql
-- User table
ALTER TABLE users ADD CONSTRAINT fk_user_tenant
  FOREIGN KEY (tenantId) REFERENCES tenants(id);

ALTER TABLE users ADD CONSTRAINT fk_user_customer
  FOREIGN KEY (customerOrgId) REFERENCES customers(id);

-- Ticket table
ALTER TABLE tickets ADD CONSTRAINT fk_ticket_creator
  FOREIGN KEY (creatorId) REFERENCES users(id);

ALTER TABLE tickets ADD CONSTRAINT fk_ticket_assignee
  FOREIGN KEY (assigneeId) REFERENCES users(id);

ALTER TABLE tickets ADD CONSTRAINT fk_ticket_tenant
  FOREIGN KEY (tenantId) REFERENCES tenants(id);

-- Comment table
ALTER TABLE comments ADD CONSTRAINT fk_comment_ticket
  FOREIGN KEY (ticketId) REFERENCES tickets(id);

ALTER TABLE comments ADD CONSTRAINT fk_comment_author
  FOREIGN KEY (authorId) REFERENCES users(id);

-- Attachment table
ALTER TABLE attachments ADD CONSTRAINT fk_attachment_ticket
  FOREIGN KEY (ticketId) REFERENCES tickets(id);
```

### Unique Constraints
```sql
-- Tenants
UNIQUE (name)
UNIQUE (domain)

-- Users
UNIQUE (email)
```

### Indexes

Recommended indexes for performance:

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenantId);

-- Ticket queries
CREATE INDEX idx_tickets_tenant ON tickets(tenantId);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_creator ON tickets(creatorId);
CREATE INDEX idx_tickets_assignee ON tickets(assigneeId);
CREATE INDEX idx_tickets_created ON tickets(createdAt);

-- Comment queries
CREATE INDEX idx_comments_ticket ON comments(ticketId);

-- FAQ queries
CREATE INDEX idx_faqs_tenant ON faqs(tenantId);
CREATE INDEX idx_faqs_published ON faqs(isPublished);
```

## Cascade Behaviors

### ON DELETE

```typescript
// When a Tenant is deleted:
- All Users are deleted (CASCADE)
- All Tickets are deleted (CASCADE)
- All Comments are deleted (CASCADE)
- All FAQs are deleted (CASCADE)

// When a Ticket is deleted:
- All Comments are deleted (CASCADE)
- All Attachments are deleted (CASCADE)

// When a User is deleted:
- Tickets they created: assigneeId set to NULL
- Tickets assigned to them: assigneeId set to NULL
- Comments remain (author set to NULL or kept for audit)
```

**Note**: In production, consider soft deletes (isDeleted flag) instead of hard deletes for audit trails.

## Sample Data Relationships

### Example 1: Complete Ticket Flow

```
Tenant: "Acme Corp" (id: tenant-1)
  ↓
User: "admin@acme.com" (id: user-1, role: ADMIN)
User: "agent@acme.com" (id: user-2, role: AGENT)
User: "customer@acme.com" (id: user-3, role: CUSTOMER)
  ↓
Customer: "Acme Inc" (id: customer-1)
  ↓
Ticket: "Login Issue" (id: ticket-1)
  - creator: user-3 (customer@acme.com)
  - assignee: user-2 (agent@acme.com)
  - customerOrg: customer-1
  - tenant: tenant-1
  ↓
Comment 1: "I can't login" (author: user-3)
Comment 2: "Let me help" (author: user-2)
Comment 3: "Internal note: Reset password" (author: user-2, isInternal: true)
  ↓
Attachment: "screenshot.png" (ticket: ticket-1)
```

### Example 2: Multi-Tenant Isolation

```
Tenant 1: "Acme Corp"
  - User: admin@acme.com
  - Ticket: #1, #2, #3
  - FAQ: "How to reset password?"

Tenant 2: "Beta Inc"
  - User: admin@beta.com
  - Ticket: #1, #2  (completely separate from Acme's tickets!)
  - FAQ: "How to reset password?" (separate from Acme's FAQ!)
```

**Important**: Even though ticket IDs might overlap, tenantId ensures complete isolation.

## TypeORM Relationships Cheat Sheet

```typescript
// One-to-Many (User → Tickets)
@OneToMany(() => Ticket, ticket => ticket.creator)
createdTickets: Ticket[];

// Many-to-One (Ticket → User)
@ManyToOne(() => User)
@JoinColumn({ name: 'creatorId' })
creator: User;

// Self-referencing (User → User for hierarchy)
@ManyToOne(() => User, { nullable: true })
@JoinColumn({ name: 'managerId' })
manager?: User;

@OneToMany(() => User, user => user.manager)
subordinates: User[];
```

---

**This diagram represents the current database schema as implemented in the application.**
