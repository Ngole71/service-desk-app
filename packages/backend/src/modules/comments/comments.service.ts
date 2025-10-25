import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Ticket } from '@/modules/tickets/entities/ticket.entity';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { EventsGateway } from '@/modules/websocket/events.gateway';
import { EmailService } from '@/modules/email/email.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private eventsGateway: EventsGateway,
    private emailService: EmailService,
  ) {}

  async create(
    ticketId: string,
    createCommentDto: CreateCommentDto,
    user: User,
  ): Promise<Comment> {
    // Verify ticket exists and user has access
    const ticket = await this.ticketsRepository.findOne({
      where: { id: ticketId, tenantId: user.tenantId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Customers can only comment on their own tickets
    if (user.role === UserRole.CUSTOMER && ticket.creatorId !== user.id) {
      throw new ForbiddenException('You can only comment on your own tickets');
    }

    // Customers cannot create internal comments
    if (user.role === UserRole.CUSTOMER && createCommentDto.isInternal) {
      throw new ForbiddenException('Customers cannot create internal comments');
    }

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      ticketId,
      authorId: user.id,
      isInternal: createCommentDto.isInternal || false,
    });

    const savedComment = await this.commentsRepository.save(comment);

    // Fetch the comment with author details
    const fullComment = await this.commentsRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author'],
    });

    // Emit real-time event
    this.eventsGateway.emitCommentCreated(
      fullComment,
      ticketId,
      user.tenantId,
    );

    // Notify ticket creator if comment is from someone else
    if (ticket.creatorId !== user.id) {
      this.eventsGateway.emitNotification(ticket.creatorId, {
        type: 'new_comment',
        ticketId,
        message: `New comment on ticket: ${ticket.title}`,
        from: user.name,
      });

      // Send email notification to ticket creator
      const creator = await this.userRepository.findOne({ where: { id: ticket.creatorId } });
      if (creator) {
        await this.emailService.sendCommentNotification(fullComment, ticket, creator);
      }
    }

    // Notify assignee if exists and different from commenter
    if (ticket.assigneeId && ticket.assigneeId !== user.id && ticket.assigneeId !== ticket.creatorId) {
      this.eventsGateway.emitNotification(ticket.assigneeId, {
        type: 'new_comment',
        ticketId,
        message: `New comment on assigned ticket: ${ticket.title}`,
        from: user.name,
      });

      // Send email notification to assignee
      const assignee = await this.userRepository.findOne({ where: { id: ticket.assigneeId } });
      if (assignee) {
        await this.emailService.sendCommentNotification(fullComment, ticket, assignee);
      }
    }

    return fullComment;
  }

  async findByTicket(ticketId: string, user: User): Promise<Comment[]> {
    // Verify ticket exists and user has access
    const ticket = await this.ticketsRepository.findOne({
      where: { id: ticketId, tenantId: user.tenantId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Customers can only view comments on their own tickets
    if (user.role === UserRole.CUSTOMER && ticket.creatorId !== user.id) {
      throw new ForbiddenException('You can only view comments on your own tickets');
    }

    const query = this.commentsRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .where('comment.ticketId = :ticketId', { ticketId })
      .orderBy('comment.createdAt', 'ASC');

    // Customers cannot see internal comments
    if (user.role === UserRole.CUSTOMER) {
      query.andWhere('comment.isInternal = :isInternal', { isInternal: false });
    }

    return query.getMany();
  }

  async remove(id: string, user: User): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['ticket', 'author'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Verify tenant isolation
    if (comment.ticket.tenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Only admins or comment authors can delete comments
    if (user.role !== UserRole.ADMIN && comment.authorId !== user.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentsRepository.remove(comment);
  }
}
