import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Ticket } from './ticket.entity';

@Entity('attachments')
export class Attachment extends BaseEntity {
  @Column()
  filename: string;

  @Column()
  filepath: string;

  @Column()
  mimetype: string;

  @Column()
  size: number;

  @Column({ name: 'ticket_id' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;
}
