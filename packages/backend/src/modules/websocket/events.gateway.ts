import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';

interface AuthenticatedSocket extends Socket {
  user?: User;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted to connect without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['tenant'],
      });

      if (!user || !user.isActive) {
        this.logger.warn(`Invalid user attempted to connect: ${payload.sub}`);
        client.disconnect();
        return;
      }

      client.user = user;

      // Join tenant-specific room for multi-tenant isolation
      const tenantRoom = `tenant:${user.tenantId}`;
      client.join(tenantRoom);

      // Join user-specific room
      const userRoom = `user:${user.id}`;
      client.join(userRoom);

      this.logger.log(
        `Client ${client.id} connected as ${user.email} (${user.role}) to tenant ${user.tenantId}`,
      );

      client.emit('connected', {
        message: 'Connected to real-time service',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.logger.log(`Client ${client.id} (${client.user.email}) disconnected`);
    } else {
      this.logger.log(`Client ${client.id} disconnected`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    return { event: 'pong', data: { timestamp: new Date().toISOString() } };
  }

  // Emit ticket created event to tenant room
  emitTicketCreated(ticket: any, tenantId: string) {
    const room = `tenant:${tenantId}`;
    this.server.to(room).emit('ticket:created', ticket);
    this.logger.debug(`Emitted ticket:created to ${room}`);
  }

  // Emit ticket updated event to tenant room
  emitTicketUpdated(ticket: any, tenantId: string) {
    const room = `tenant:${tenantId}`;
    this.server.to(room).emit('ticket:updated', ticket);
    this.logger.debug(`Emitted ticket:updated to ${room}`);
  }

  // Emit comment created event to tenant room
  emitCommentCreated(comment: any, ticketId: string, tenantId: string) {
    const room = `tenant:${tenantId}`;
    this.server.to(room).emit('comment:created', {
      comment,
      ticketId,
    });
    this.logger.debug(`Emitted comment:created to ${room}`);
  }

  // Emit ticket assigned event to specific user
  emitTicketAssigned(ticket: any, assigneeId: string, tenantId: string) {
    const userRoom = `user:${assigneeId}`;
    const tenantRoom = `tenant:${tenantId}`;

    this.server.to(userRoom).emit('ticket:assigned', ticket);
    this.server.to(tenantRoom).emit('ticket:updated', ticket);

    this.logger.debug(`Emitted ticket:assigned to user ${assigneeId}`);
  }

  // Emit notification to specific user
  emitNotification(userId: string, notification: any) {
    const room = `user:${userId}`;
    this.server.to(room).emit('notification', notification);
    this.logger.debug(`Emitted notification to user ${userId}`);
  }
}
