import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from './entities/ticket.entity';
import { Attachment } from './entities/attachment.entity';
import { User } from '@/modules/users/entities/user.entity';
import { WebsocketModule } from '@/modules/websocket/websocket.module';
import { EmailModule } from '@/modules/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Attachment, User]),
    WebsocketModule,
    forwardRef(() => EmailModule),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
