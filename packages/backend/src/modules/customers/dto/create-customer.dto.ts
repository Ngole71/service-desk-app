import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'acme.com', required: false })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({
    example: 'A leading provider of industrial solutions',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'acmesupport@mydomain.com', required: false })
  @IsString()
  @IsOptional()
  emailConnector?: string;
}
