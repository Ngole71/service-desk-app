import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Comment } from '@/modules/comments/entities/comment.entity';
import { Attachment } from './attachment.entity';
import { Customer } from '@/modules/customers/entities/customer.entity';

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('tickets')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'creatorId'])
export class Ticket extends BaseEntity {
  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.tickets)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'creator_id' })
  creatorId: string;

  @ManyToOne(() => User, (user) => user.createdTickets)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'assignee_id', nullable: true })
  assigneeId: string;

  @ManyToOne(() => User, (user) => user.assignedTickets, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User;

  @Column({ name: 'customer_id', nullable: true })
  customerOrgId: string;

  @ManyToOne(() => Customer, (customer) => customer.tickets, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customerOrg: Customer;

  @OneToMany(() => Comment, (comment) => comment.ticket)
  comments: Comment[];

  @OneToMany(() => Attachment, (attachment) => attachment.ticket)
  attachments: Attachment[];
}
