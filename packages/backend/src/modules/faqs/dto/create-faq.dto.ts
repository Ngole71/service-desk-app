import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFaqDto {
  @ApiProperty({ description: 'FAQ question', example: 'How do I reset my password?' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'FAQ answer', example: 'Click on the "Forgot Password" link...' })
  @IsString()
  answer: string;

  @ApiProperty({ description: 'FAQ category', example: 'Account', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Display order', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ description: 'Is FAQ published', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
