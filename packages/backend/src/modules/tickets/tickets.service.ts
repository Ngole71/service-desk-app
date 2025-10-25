import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Attachment } from './entities/attachment.entity';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { EventsGateway } from '@/modules/websocket/events.gateway';
import { EmailService } from '@/modules/email/email.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(Attachment)
    private attachmentRepository: Repository<Attachment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private eventsGateway: EventsGateway,
    private emailService: EmailService,
  ) {}

  async create(createTicketDto: CreateTicketDto, user: User): Promise<Ticket> {
    const ticket = this.ticketsRepository.create({
      ...createTicketDto,
      creatorId: user.id,
      tenantId: user.tenantId,
      customerOrgId: user.customerId, // Associate ticket with user's customer organization
    });

    const savedTicket = await this.ticketsRepository.save(ticket);

    // Emit real-time event
    this.eventsGateway.emitTicketCreated(savedTicket, user.tenantId);

    // Send email notification to ticket creator
    await this.emailService.sendTicketCreatedEmail(savedTicket, user);

    return savedTicket;
  }

  async findAll(query: QueryTicketsDto, user: User) {
    const { status, priority, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.creator', 'creator')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('ticket.customerOrg', 'customerOrg')
      .loadRelationCountAndMap('ticket.commentsCount', 'ticket.comments')
      .where('ticket.tenantId = :tenantId', { tenantId: user.tenantId });

    // Customers can only see their own tickets
    if (user.role === UserRole.CUSTOMER) {
      queryBuilder.andWhere('ticket.creatorId = :userId', { userId: user.id });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('ticket.status = :status', { status });
    }

    // Filter by priority
    if (priority) {
      queryBuilder.andWhere('ticket.priority = :priority', { priority });
    }

    const [tickets, total] = await queryBuilder
      .orderBy('ticket.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: User): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['creator', 'assignee', 'customerOrg', 'comments', 'comments.author', 'attachments'],
      order: {
        comments: {
          createdAt: 'DESC',
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Customers can only view their own tickets
    if (user.role === UserRole.CUSTOMER && ticket.creatorId !== user.id) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  /**
   * Find ticket by short ID (first 8 characters of UUID)
   * Used for email reply detection: [#669a2c1f] -> full ticket ID
   */
  async findByShortId(shortId: string): Promise<Ticket | null> {
    if (!shortId || shortId.length < 8) {
      return null;
    }

    // Query tickets where ID starts with the short ID
    // Cast UUID to text for LIKE comparison
    const ticket = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .where('CAST(ticket.id AS TEXT) LIKE :pattern', { pattern: `${shortId}%` })
      .getOne();

    return ticket;
  }

  async update(
    id: string,
    updateTicketDto: UpdateTicketDto,
    user: User,
  ): Promise<Ticket> {
    const ticket = await this.findOne(id, user);
    const oldStatus = ticket.status;
    const oldPriority = ticket.priority;

    // Track changes for email notification
    const changes: string[] = [];

    // Customers can only update title and description of their own tickets
    if (user.role === UserRole.CUSTOMER) {
      if (ticket.creatorId !== user.id) {
        throw new ForbiddenException(
          'You can only update your own tickets',
        );
      }

      // Remove fields customers cannot update
      const { status, priority, assigneeId, ...allowedFields } = updateTicketDto;
      Object.assign(ticket, allowedFields);
    } else {
      // Admins and Agents can update all fields
      if (updateTicketDto.status && updateTicketDto.status !== oldStatus) {
        changes.push(`Status changed from ${oldStatus} to ${updateTicketDto.status}`);
      }
      if (updateTicketDto.priority && updateTicketDto.priority !== oldPriority) {
        changes.push(`Priority changed from ${oldPriority} to ${updateTicketDto.priority}`);
      }
      if (updateTicketDto.assigneeId) {
        changes.push('Ticket reassigned');
      }
      Object.assign(ticket, updateTicketDto);
    }

    const updatedTicket = await this.ticketsRepository.save(ticket);

    // Emit real-time event
    this.eventsGateway.emitTicketUpdated(updatedTicket, user.tenantId);

    // Send email notification to ticket creator if there are changes
    if (changes.length > 0 && ticket.creatorId !== user.id) {
      const creator = await this.userRepository.findOne({ where: { id: ticket.creatorId } });
      if (creator) {
        await this.emailService.sendTicketUpdatedEmail(updatedTicket, creator, changes);
      }
    }

    return updatedTicket;
  }

  async remove(id: string, user: User): Promise<void> {
    // Only admins can delete tickets
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete tickets');
    }

    const ticket = await this.findOne(id, user);
    await this.ticketsRepository.remove(ticket);
  }

  async assignTicket(
    id: string,
    assigneeId: string,
    user: User,
  ): Promise<Ticket> {
    // Only admins and agents can assign tickets
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot assign tickets');
    }

    const ticket = await this.findOne(id, user);
    ticket.assigneeId = assigneeId;

    const assignedTicket = await this.ticketsRepository.save(ticket);

    // Emit real-time event to the assigned user
    this.eventsGateway.emitTicketAssigned(assignedTicket, assigneeId, user.tenantId);

    // Send email notification to the assignee
    const assignee = await this.userRepository.findOne({ where: { id: assigneeId } });
    if (assignee) {
      await this.emailService.sendTicketAssignedEmail(assignedTicket, assignee);
    }

    return assignedTicket;
  }

  async getStats(user: User) {
    const queryBuilder = this.ticketsRepository
      .createQueryBuilder('ticket')
      .where('ticket.tenantId = :tenantId', { tenantId: user.tenantId });

    // Customers only see stats for their tickets
    if (user.role === UserRole.CUSTOMER) {
      queryBuilder.andWhere('ticket.creatorId = :userId', { userId: user.id });
    }

    const [total, open, inProgress, waiting, closed] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('ticket.status = :status', { status: 'OPEN' }).getCount(),
      queryBuilder.clone().andWhere('ticket.status = :status', { status: 'IN_PROGRESS' }).getCount(),
      queryBuilder.clone().andWhere('ticket.status = :status', { status: 'WAITING' }).getCount(),
      queryBuilder.clone().andWhere('ticket.status = :status', { status: 'CLOSED' }).getCount(),
    ]);

    return {
      total,
      open,
      inProgress,
      waiting,
      closed,
    };
  }

  async saveAttachment(
    ticketId: string,
    file: Express.Multer.File,
    user: User,
  ): Promise<Attachment> {
    // Verify ticket exists and user has access
    await this.findOne(ticketId, user);

    const attachment = this.attachmentRepository.create({
      ticketId,
      filename: file.originalname,
      filepath: file.path,
      mimetype: file.mimetype,
      size: file.size,
    });

    return await this.attachmentRepository.save(attachment);
  }

  async getAttachment(id: string, user: User): Promise<Attachment> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id },
      relations: ['ticket'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Verify user has access to the ticket
    await this.findOne(attachment.ticketId, user);

    return attachment;
  }

  async deleteAttachment(id: string, user: User): Promise<void> {
    const attachment = await this.getAttachment(id, user);

    // Only allow ticket creator or admins to delete attachments
    const ticket = await this.findOne(attachment.ticketId, user);

    if (user.role !== UserRole.ADMIN && ticket.creatorId !== user.id) {
      throw new ForbiddenException('You do not have permission to delete this attachment');
    }

    await this.attachmentRepository.remove(attachment);
  }
}
