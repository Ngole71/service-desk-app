import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'I have tried resetting my password but it did not work.' })
  @IsString()
  @MinLength(1, { message: 'Comment cannot be empty' })
  content: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Internal comments are only visible to admins and agents',
  })
  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}
