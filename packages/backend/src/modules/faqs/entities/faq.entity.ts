import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';

@Entity('faqs')
export class Faq extends BaseEntity {
  @Column()
  question: string;

  @Column('text')
  answer: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  isPublished: boolean;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.faqs)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
