import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Ticket } from '@/modules/tickets/entities/ticket.entity';
import { Faq } from '@/modules/faqs/entities/faq.entity';
import { Customer } from '@/modules/customers/entities/customer.entity';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  subdomain: string;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Customer, (customer) => customer.tenant)
  customers: Customer[];

  @OneToMany(() => Ticket, (ticket) => ticket.tenant)
  tickets: Ticket[];

  @OneToMany(() => Faq, (faq) => faq.tenant)
  faqs: Faq[];
}
