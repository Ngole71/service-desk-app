import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';
import { Ticket } from '@/modules/tickets/entities/ticket.entity';
import { Comment } from '@/modules/comments/entities/comment.entity';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL', 'noreply@servicedesk.com');
    this.isEnabled = !!apiKey;

    if (this.isEnabled) {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid email service initialized');
    } else {
      this.logger.warn('SendGrid API key not configured - email notifications disabled');
    }
  }

  /**
   * Send ticket created notification to customer
   */
  async sendTicketCreatedEmail(ticket: Ticket, recipient: User): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Email disabled - skipping ticket created notification');
      return;
    }

    try {
      const msg = {
        to: recipient.email,
        from: this.fromEmail,
        subject: `Ticket Created: ${ticket.title} [#${ticket.id.slice(0, 8)}]`,
        text: this.generateTicketCreatedText(ticket),
        html: this.generateTicketCreatedHtml(ticket),
      };

      await sgMail.send(msg);
      this.logger.log(`Ticket created email sent to ${recipient.email}`);
    } catch (error) {
      this.logger.error(`Failed to send ticket created email: ${error.message}`, error.stack);
    }
  }

  /**
   * Send ticket updated notification
   */
  async sendTicketUpdatedEmail(ticket: Ticket, recipient: User, changes: string[]): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Email disabled - skipping ticket updated notification');
      return;
    }

    try {
      const msg = {
        to: recipient.email,
        from: this.fromEmail,
        subject: `Ticket Updated: ${ticket.title} [#${ticket.id.slice(0, 8)}]`,
        text: this.generateTicketUpdatedText(ticket, changes),
        html: this.generateTicketUpdatedHtml(ticket, changes),
      };

      await sgMail.send(msg);
      this.logger.log(`Ticket updated email sent to ${recipient.email}`);
    } catch (error) {
      this.logger.error(`Failed to send ticket updated email: ${error.message}`, error.stack);
    }
  }

  /**
   * Send new comment notification
   */
  async sendCommentNotification(comment: Comment, ticket: Ticket, recipient: User): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Email disabled - skipping comment notification');
      return;
    }

    // Don't notify about internal comments to customers
    if (comment.isInternal && recipient.role === 'CUSTOMER') {
      return;
    }

    try {
      const msg = {
        to: recipient.email,
        from: this.fromEmail,
        subject: `New Comment on Ticket: ${ticket.title} [#${ticket.id.slice(0, 8)}]`,
        text: this.generateCommentNotificationText(comment, ticket),
        html: this.generateCommentNotificationHtml(comment, ticket),
      };

      await sgMail.send(msg);
      this.logger.log(`Comment notification sent to ${recipient.email}`);
    } catch (error) {
      this.logger.error(`Failed to send comment notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Send ticket assignment notification to agent
   */
  async sendTicketAssignedEmail(ticket: Ticket, assignee: User): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Email disabled - skipping assignment notification');
      return;
    }

    try {
      const msg = {
        to: assignee.email,
        from: this.fromEmail,
        subject: `Ticket Assigned to You: ${ticket.title} [#${ticket.id.slice(0, 8)}]`,
        text: this.generateTicketAssignedText(ticket),
        html: this.generateTicketAssignedHtml(ticket),
      };

      await sgMail.send(msg);
      this.logger.log(`Ticket assigned email sent to ${assignee.email}`);
    } catch (error) {
      this.logger.error(`Failed to send ticket assigned email: ${error.message}`, error.stack);
    }
  }

  // Text email templates
  private generateTicketCreatedText(ticket: Ticket): string {
    return `
Hello,

Your support ticket has been created successfully.

Ticket ID: #${ticket.id.slice(0, 8)}
Title: ${ticket.title}
Priority: ${ticket.priority}
Status: ${ticket.status}

Description:
${ticket.description}

We'll get back to you as soon as possible.

Best regards,
Support Team
    `.trim();
  }

  private generateTicketUpdatedText(ticket: Ticket, changes: string[]): string {
    return `
Hello,

Your support ticket has been updated.

Ticket ID: #${ticket.id.slice(0, 8)}
Title: ${ticket.title}
Status: ${ticket.status}

Changes:
${changes.map(c => `- ${c}`).join('\n')}

Best regards,
Support Team
    `.trim();
  }

  private generateCommentNotificationText(comment: Comment, ticket: Ticket): string {
    return `
Hello,

A new comment has been added to your ticket.

Ticket ID: #${ticket.id.slice(0, 8)}
Title: ${ticket.title}

Comment from ${comment.author?.name || 'Support Team'}:
${comment.content}

Best regards,
Support Team
    `.trim();
  }

  private generateTicketAssignedText(ticket: Ticket): string {
    return `
Hello,

A new ticket has been assigned to you.

Ticket ID: #${ticket.id.slice(0, 8)}
Title: ${ticket.title}
Priority: ${ticket.priority}
Status: ${ticket.status}

Description:
${ticket.description}

Please review and respond to this ticket.

Best regards,
Support Team
    `.trim();
  }

  // HTML email templates
  private generateTicketCreatedHtml(ticket: Ticket): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .ticket-info { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Ticket Created Successfully</h2>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your support ticket has been created successfully.</p>
      <div class="ticket-info">
        <p><span class="label">Ticket ID:</span> #${ticket.id.slice(0, 8)}</p>
        <p><span class="label">Title:</span> ${ticket.title}</p>
        <p><span class="label">Priority:</span> ${ticket.priority}</p>
        <p><span class="label">Status:</span> ${ticket.status}</p>
        <p><span class="label">Description:</span><br/>${ticket.description}</p>
      </div>
      <p>We'll get back to you as soon as possible.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Support Desk.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private generateTicketUpdatedHtml(ticket: Ticket, changes: string[]): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .ticket-info { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
    .changes { background-color: #fffbeb; padding: 10px; border-left: 3px solid #f59e0b; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Ticket Updated</h2>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your support ticket has been updated.</p>
      <div class="ticket-info">
        <p><span class="label">Ticket ID:</span> #${ticket.id.slice(0, 8)}</p>
        <p><span class="label">Title:</span> ${ticket.title}</p>
        <p><span class="label">Status:</span> ${ticket.status}</p>
      </div>
      <div class="changes">
        <p><strong>Changes:</strong></p>
        <ul>
          ${changes.map(c => `<li>${c}</li>`).join('\n')}
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message from the Support Desk.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private generateCommentNotificationHtml(comment: Comment, ticket: Ticket): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .ticket-info { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .comment { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 3px solid #4F46E5; }
    .label { font-weight: bold; color: #666; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Comment on Your Ticket</h2>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>A new comment has been added to your ticket.</p>
      <div class="ticket-info">
        <p><span class="label">Ticket ID:</span> #${ticket.id.slice(0, 8)}</p>
        <p><span class="label">Title:</span> ${ticket.title}</p>
      </div>
      <div class="comment">
        <p><span class="label">From:</span> ${comment.author?.name || 'Support Team'}</p>
        <p>${comment.content}</p>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message from the Support Desk.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private generateTicketAssignedHtml(ticket: Ticket): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .ticket-info { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
    .priority { display: inline-block; padding: 5px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; }
    .priority-high { background-color: #fee2e2; color: #dc2626; }
    .priority-medium { background-color: #fef3c7; color: #d97706; }
    .priority-low { background-color: #dbeafe; color: #2563eb; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Ticket Assigned to You</h2>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>A new ticket has been assigned to you.</p>
      <div class="ticket-info">
        <p><span class="label">Ticket ID:</span> #${ticket.id.slice(0, 8)}</p>
        <p><span class="label">Title:</span> ${ticket.title}</p>
        <p><span class="label">Priority:</span> <span class="priority priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span></p>
        <p><span class="label">Status:</span> ${ticket.status}</p>
        <p><span class="label">Description:</span><br/>${ticket.description}</p>
      </div>
      <p>Please review and respond to this ticket.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Support Desk.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
