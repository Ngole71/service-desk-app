import {
  Controller,
  Post,
  Body,
  Logger,
  BadRequestException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '@/common/decorators/roles.decorator';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Ticket, TicketPriority } from '@/modules/tickets/entities/ticket.entity';
import { TicketsService } from '@/modules/tickets/tickets.service';
import { CommentsService } from '@/modules/comments/comments.service';
import { IncomingEmailDto } from './dto/incoming-email.dto';

@ApiTags('email-webhooks')
@Controller('webhooks/email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private ticketsService: TicketsService,
    private commentsService: CommentsService,
  ) {}

  /**
   * SendGrid Inbound Parse Webhook
   * This endpoint receives emails sent to your domain and creates tickets
   *
   * Configure in SendGrid:
   * 1. Go to Settings > Inbound Parse
   * 2. Add your domain (e.g., support.yourcompany.com)
   * 3. Set webhook URL to: https://your-api.com/webhooks/email/sendgrid
   */
  @Post('sendgrid')
  @Public()
  @UseInterceptors(FilesInterceptor('attachments'))
  @ApiOperation({ summary: 'Receive emails from SendGrid Inbound Parse' })
  @ApiResponse({ status: 200, description: 'Email processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email data' })
  async handleIncomingEmail(
    @Body() emailData: IncomingEmailDto,
    @UploadedFiles() attachments: Express.Multer.File[],
  ): Promise<{ success: boolean; ticketId?: string; message: string }> {
    this.logger.log(`Received email from ${emailData.from} to ${emailData.to}`);
    this.logger.debug(`Email subject: ${emailData.subject}`);

    try {
      // Extract sender email
      const senderEmail = this.extractEmail(emailData.from);

      // Determine tenant from recipient email (e.g., support@tenant1.yourcompany.com)
      const tenant = await this.findTenantFromEmail(emailData.to);

      if (!tenant) {
        this.logger.warn(`No tenant found for email: ${emailData.to}`);
        return {
          success: false,
          message: 'Tenant not found for recipient email',
        };
      }

      // Find or create user
      const user = await this.findOrCreateUser(senderEmail, emailData.from, tenant.id);

      // Check if this is a reply to an existing ticket
      const ticketId = await this.extractTicketIdFromSubject(emailData.subject);

      if (ticketId) {
        // This is a reply - add as comment
        await this.addCommentToTicket(ticketId, emailData, user);
        this.logger.log(`Added comment to ticket ${ticketId} from ${senderEmail}`);

        return {
          success: true,
          ticketId,
          message: 'Comment added to existing ticket',
        };
      } else {
        // This is a new ticket
        const ticket = await this.createTicketFromEmail(emailData, user, attachments);
        this.logger.log(`Created new ticket ${ticket.id} from ${senderEmail}`);

        return {
          success: true,
          ticketId: ticket.id,
          message: 'New ticket created',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to process incoming email: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process email');
    }
  }

  /**
   * Extract email address from "Name <email@domain.com>" format
   */
  private extractEmail(fromString: string): string {
    const match = fromString.match(/<(.+?)>/);
    return match ? match[1] : fromString;
  }

  /**
   * Find tenant based on recipient email
   * Examples:
   * - support@demo.yourcompany.com -> demo tenant
   * - customer1@acme.yourcompany.com -> acme tenant
   */
  private async findTenantFromEmail(toEmail: string): Promise<Tenant | null> {
    // Extract subdomain from email (before @ or first part of domain)
    // Example: support@demo.company.com -> demo
    const emailParts = toEmail.split('@');

    if (emailParts.length < 2) {
      return null;
    }

    const domain = emailParts[1];
    const domainParts = domain.split('.');

    // Try to find tenant by subdomain in email domain
    if (domainParts.length > 2) {
      const subdomain = domainParts[0];
      const tenant = await this.tenantRepository.findOne({
        where: { subdomain },
      });

      if (tenant) {
        return tenant;
      }
    }

    // Fallback: use localpart as subdomain indicator
    // Example: demo-support@company.com -> demo
    const localpart = emailParts[0];
    const localpartParts = localpart.split('-');

    if (localpartParts.length > 1) {
      const subdomain = localpartParts[0];
      return await this.tenantRepository.findOne({
        where: { subdomain },
      });
    }

    // Default: return first active tenant (for development)
    return await this.tenantRepository.findOne({
      where: { isActive: true },
    });
  }

  /**
   * Find existing user or create new customer account
   */
  private async findOrCreateUser(
    email: string,
    fullName: string,
    tenantId: string,
  ): Promise<User> {
    // Try to find existing user
    let user = await this.userRepository.findOne({
      where: { email, tenantId },
    });

    if (!user) {
      // Extract name from "Name <email>" format or use email
      const name = fullName.replace(/<.*>/, '').trim() || email.split('@')[0];

      // Create new customer user
      user = this.userRepository.create({
        email,
        name,
        tenantId,
        role: UserRole.CUSTOMER,
        password: Math.random().toString(36).slice(-12), // Random password - user will reset
        isActive: true,
      });

      await this.userRepository.save(user);
      this.logger.log(`Created new customer user: ${email}`);
    }

    return user;
  }

  /**
   * Extract ticket ID from subject line
   * Example: "Re: Issue with login [#669a2c1f]" -> "669a2c1f-e9fb-4742-9302-4164fb9bca7f"
   */
  private async extractTicketIdFromSubject(subject: string): Promise<string | null> {
    const match = subject.match(/\[#([a-f0-9-]{8,36})\]/i);

    if (match) {
      const ticketIdOrShortId = match[1];

      // If it's a full UUID, return it directly
      if (ticketIdOrShortId.includes('-') && ticketIdOrShortId.length > 20) {
        return ticketIdOrShortId;
      }

      // Otherwise, look up the ticket by short ID (first 8 chars)
      const ticket = await this.ticketsService.findByShortId(ticketIdOrShortId);
      return ticket ? ticket.id : null;
    }

    return null;
  }

  /**
   * Create a new ticket from incoming email
   */
  private async createTicketFromEmail(
    emailData: IncomingEmailDto,
    user: User,
    attachments?: Express.Multer.File[],
  ): Promise<any> {
    // Clean up email body (remove quoted text, signatures, etc.)
    const cleanedBody = this.cleanEmailBody(emailData.text || emailData.html || 'No content');

    const createTicketDto = {
      title: emailData.subject || 'Email Support Request',
      description: cleanedBody,
      priority: TicketPriority.MEDIUM,
    };

    const ticket = await this.ticketsService.create(createTicketDto, user);

    // TODO: Handle attachments
    if (attachments && attachments.length > 0) {
      this.logger.log(`Email has ${attachments.length} attachment(s) - attachment handling not yet implemented`);
    }

    return ticket;
  }

  /**
   * Clean up email body by removing quoted text and signatures
   */
  private cleanEmailBody(body: string): string {
    if (!body) return 'No content';

    // Remove common email signatures
    body = body.split(/\n--\s*\n/)[0];

    // Remove quoted replies (lines starting with >)
    const lines = body.split('\n');
    const cleanedLines = [];

    for (const line of lines) {
      // Stop at common quote indicators
      if (line.match(/^On .* wrote:$/)) break;
      if (line.match(/^From:.* Sent:.*$/)) break;
      if (line.trim().startsWith('>')) continue;

      cleanedLines.push(line);
    }

    const cleaned = cleanedLines.join('\n').trim();
    return cleaned || body; // Fallback to original if cleaning removed everything
  }

  /**
   * Add email content as comment to existing ticket
   */
  private async addCommentToTicket(
    ticketId: string,
    emailData: IncomingEmailDto,
    user: User,
  ): Promise<void> {
    // First, find the full ticket ID from the short ID
    // This is a simplified version - in production, you'd query by short ID

    const createCommentDto = {
      content: emailData.text || emailData.html || 'No content',
      isInternal: false,
    };

    await this.commentsService.create(ticketId, createCommentDto, user);
  }

  /**
   * Health check endpoint for webhook testing
   */
  @Post('test')
  @Public()
  @ApiOperation({ summary: 'Test webhook endpoint' })
  test(@Body() body: any): { message: string; received: any } {
    this.logger.log('Webhook test endpoint called');
    return {
      message: 'Webhook is working',
      received: body,
    };
  }
}
