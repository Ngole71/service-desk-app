import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
  ) {}

  async create(
    createCustomerDto: CreateCustomerDto,
    adminUser: User,
  ): Promise<Customer> {
    // Only admins can create customers
    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create customers');
    }

    const customer = this.customersRepository.create({
      ...createCustomerDto,
      tenantId: adminUser.tenantId,
      isActive: true,
    });

    return await this.customersRepository.save(customer);
  }

  async findAll(user: User): Promise<Customer[]> {
    // All authenticated users can list customers
    const customers = await this.customersRepository.find({
      where: { tenantId: user.tenantId },
      relations: ['users'],
      order: { createdAt: 'DESC' },
    });

    return customers;
  }

  async findOne(id: string, user: User): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['users'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    adminUser: User,
  ): Promise<Customer> {
    // Only admins can update customers
    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update customers');
    }

    const customer = await this.customersRepository.findOne({
      where: { id, tenantId: adminUser.tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    Object.assign(customer, updateCustomerDto);

    return await this.customersRepository.save(customer);
  }

  async remove(id: string, adminUser: User): Promise<void> {
    // Only admins can delete customers
    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete customers');
    }

    const customer = await this.customersRepository.findOne({
      where: { id, tenantId: adminUser.tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    await this.customersRepository.remove(customer);
  }
}
