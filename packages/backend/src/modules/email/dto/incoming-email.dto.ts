import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

/**
 * DTO for incoming emails from SendGrid Inbound Parse
 * SendGrid sends emails as multipart/form-data with these fields
 */
export class IncomingEmailDto {
  @ApiProperty({ description: 'Sender email and name', example: 'John Doe <john@example.com>' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'Recipient email', example: 'support@demo.company.com' })
  @IsString()
  to: string;

  @ApiProperty({ description: 'Email subject', example: 'Need help with login' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: 'Plain text email body' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ description: 'HTML email body' })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiPropertyOptional({ description: 'CC recipients' })
  @IsString()
  @IsOptional()
  cc?: string;

  @ApiPropertyOptional({ description: 'Email headers in JSON format' })
  @IsString()
  @IsOptional()
  headers?: string;

  @ApiPropertyOptional({ description: 'Envelope data' })
  @IsString()
  @IsOptional()
  envelope?: string;

  @ApiPropertyOptional({ description: 'Number of attachments' })
  @IsOptional()
  attachments?: string;

  @ApiPropertyOptional({ description: 'Spam score' })
  @IsOptional()
  spam_score?: string;

  @ApiPropertyOptional({ description: 'Spam report' })
  @IsOptional()
  spam_report?: string;

  @ApiPropertyOptional({ description: 'Character sets for fields' })
  @IsOptional()
  charsets?: string;

  @ApiPropertyOptional({ description: 'SPF verification result' })
  @IsOptional()
  SPF?: string;

  @ApiPropertyOptional({ description: 'DKIM verification result' })
  @IsOptional()
  dkim?: string;
}
