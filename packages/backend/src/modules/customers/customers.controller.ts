import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CurrentUser } from '@/common/decorators/tenant.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new customer organization (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Customer successfully created',
  })
  @ApiResponse({ status: 403, description: 'Only admins can create customers' })
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: User,
  ) {
    return this.customersService.create(createCustomerDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Return all customers' })
  findAll(@CurrentUser() user: User) {
    return this.customersService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific customer by ID' })
  @ApiResponse({ status: 200, description: 'Return the customer' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customersService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a customer (admin only)' })
  @ApiResponse({ status: 200, description: 'Customer successfully updated' })
  @ApiResponse({
    status: 403,
    description: 'Only admins can update customers',
  })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: User,
  ) {
    return this.customersService.update(id, updateCustomerDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer (admin only)' })
  @ApiResponse({ status: 204, description: 'Customer successfully deleted' })
  @ApiResponse({
    status: 403,
    description: 'Only admins can delete customers',
  })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customersService.remove(id, user);
  }
}
