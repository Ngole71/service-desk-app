import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@/modules/users/entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'tenant-subdomain' })
  @IsString()
  tenantId: string;

  @ApiProperty({ enum: UserRole, default: UserRole.CUSTOMER, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
