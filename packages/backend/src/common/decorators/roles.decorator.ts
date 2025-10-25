import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@/modules/users/entities/user.entity';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
export const Public = () => SetMetadata('isPublic', true);
