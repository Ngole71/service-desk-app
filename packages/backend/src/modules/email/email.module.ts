import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { User } from '@/modules/users/entities/user.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Ticket } from '@/modules/tickets/entities/ticket.entity';
import { TicketsModule } from '@/modules/tickets/tickets.module';
import { CommentsModule } from '@/modules/comments/comments.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Tenant, Ticket]),
    forwardRef(() => TicketsModule),
    forwardRef(() => CommentsModule),
  ],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
