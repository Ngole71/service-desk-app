export type UserRole = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  tenantId: string;
  creatorId: string;
  assigneeId: string | null;
  creator?: User;
  assignee?: User;
  comments?: Comment[];
  commentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  authorId: string;
  author?: User;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface CreateTicketDto {
  title: string;
  description: string;
  priority: TicketPriority;
}

export interface UpdateTicketDto {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string;
}

export interface CreateCommentDto {
  content: string;
  isInternal?: boolean;
}

export interface TicketStats {
  total: number;
  byStatus: {
    open: number;
    inProgress: number;
    waiting: number;
    closed: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
