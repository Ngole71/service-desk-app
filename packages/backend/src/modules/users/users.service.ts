import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, adminUser: User): Promise<User> {
    // Only admins can create users
    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create users');
    }

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email, tenantId: adminUser.tenantId },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate random password if not provided
    const password = createUserDto.password || this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      tenantId: adminUser.tenantId,
      customerId: createUserDto.customerId || null,
      tags: createUserDto.tags || [],
      isActive: true,
    });

    const savedUser = await this.usersRepository.save(user);

    // Remove password from response
    delete savedUser.password;

    return savedUser;
  }

  async findAll(adminUser: User): Promise<User[]> {
    // Only admins and agents can list users
    if (adminUser.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot list users');
    }

    const users = await this.usersRepository.find({
      where: { tenantId: adminUser.tenantId },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });

    // Remove passwords from response
    return users.map((user) => {
      delete user.password;
      return user;
    });
  }

  async findOne(id: string, adminUser: User): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, tenantId: adminUser.tenantId },
      relations: ['customer'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password from response
    delete user.password;

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    adminUser: User,
  ): Promise<User> {
    // Only admins can update users
    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update users');
    }

    const user = await this.usersRepository.findOne({
      where: { id, tenantId: adminUser.tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);

    const updatedUser = await this.usersRepository.save(user);

    // Remove password from response
    delete updatedUser.password;

    return updatedUser;
  }

  async remove(id: string, adminUser: User): Promise<void> {
    // Only admins can delete users
    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete users');
    }

    // Don't allow deleting yourself
    if (id === adminUser.id) {
      throw new ForbiddenException('You cannot delete yourself');
    }

    const user = await this.usersRepository.findOne({
      where: { id, tenantId: adminUser.tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.remove(user);
  }

  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
