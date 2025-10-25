import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Ticket } from '@/modules/tickets/entities/ticket.entity';

@Entity('customers')
export class Customer extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  emailConnector: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.customers)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => User, (user) => user.customer)
  users: User[];

  @OneToMany(() => Ticket, (ticket) => ticket.customerOrg)
  tickets: Ticket[];
}
