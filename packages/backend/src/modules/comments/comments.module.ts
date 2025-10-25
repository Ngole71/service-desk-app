import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsController} from './comments.controller';
import { Comment } from './entities/comment.entity';
import { Ticket } from '@/modules/tickets/entities/ticket.entity';
import { User } from '@/modules/users/entities/user.entity';
import { WebsocketModule } from '@/modules/websocket/websocket.module';
import { EmailModule } from '@/modules/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Ticket, User]),
    WebsocketModule,
    forwardRef(() => EmailModule),
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
