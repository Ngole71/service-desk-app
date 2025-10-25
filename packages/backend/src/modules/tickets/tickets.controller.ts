import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { CurrentUser } from '@/common/decorators/tenant.decorator';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiResponse({ status: 201, description: 'Ticket successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createTicketDto: CreateTicketDto,
    @CurrentUser() user: User,
  ) {
    return this.ticketsService.create(createTicketDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tickets (filtered by role and tenant)' })
  @ApiResponse({ status: 200, description: 'Return all tickets' })
  @ApiQuery({ type: QueryTicketsDto })
  findAll(@Query() query: QueryTicketsDto, @CurrentUser() user: User) {
    return this.ticketsService.findAll(query, user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get ticket statistics' })
  @ApiResponse({ status: 200, description: 'Return ticket statistics' })
  getStats(@CurrentUser() user: User) {
    return this.ticketsService.getStats(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific ticket by ID' })
  @ApiResponse({ status: 200, description: 'Return the ticket' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this ticket' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ticketsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ticket' })
  @ApiResponse({ status: 200, description: 'Ticket successfully updated' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - cannot update this ticket' })
  update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @CurrentUser() user: User,
  ) {
    return this.ticketsService.update(id, updateTicketDto, user);
  }

  @Patch(':id/assign/:assigneeId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Assign a ticket to an agent' })
  @ApiResponse({ status: 200, description: 'Ticket successfully assigned' })
  @ApiResponse({ status: 403, description: 'Only admins and agents can assign tickets' })
  assignTicket(
    @Param('id') id: string,
    @Param('assigneeId') assigneeId: string,
    @CurrentUser() user: User,
  ) {
    return this.ticketsService.assignTicket(id, assigneeId, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a ticket (admin only)' })
  @ApiResponse({ status: 204, description: 'Ticket successfully deleted' })
  @ApiResponse({ status: 403, description: 'Only admins can delete tickets' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ticketsService.remove(id, user);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an attachment to a ticket' })
  @ApiResponse({ status: 201, description: 'Attachment successfully uploaded' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 413, description: 'File too large (max 10MB)' })
  async uploadAttachment(
    @Param('id') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.ticketsService.saveAttachment(ticketId, file, user);
  }

  @Get('attachments/:attachmentId')
  @ApiOperation({ summary: 'Download an attachment' })
  @ApiResponse({ status: 200, description: 'Attachment file' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const attachment = await this.ticketsService.getAttachment(attachmentId, user);

    const file = fs.createReadStream(attachment.filepath);

    res.set({
      'Content-Type': attachment.mimetype,
      'Content-Disposition': `attachment; filename="${attachment.filename}"`,
    });

    return new StreamableFile(file);
  }

  @Delete('attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attachment' })
  @ApiResponse({ status: 204, description: 'Attachment successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - cannot delete this attachment' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.ticketsService.deleteAttachment(attachmentId, user);
  }
}
