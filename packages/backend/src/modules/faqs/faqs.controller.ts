import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { FaqsService } from './faqs.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@ApiTags('FAQs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new FAQ (Admin only)' })
  @ApiResponse({ status: 201, description: 'FAQ created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  create(@Body() createFaqDto: CreateFaqDto, @Request() req) {
    return this.faqsService.create(createFaqDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all FAQs' })
  @ApiResponse({ status: 200, description: 'Returns all FAQs' })
  @ApiQuery({ name: 'includeUnpublished', required: false, type: Boolean })
  findAll(@Request() req, @Query('includeUnpublished') includeUnpublished?: string) {
    const include = includeUnpublished === 'true';
    return this.faqsService.findAll(req.user, include);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all FAQ categories' })
  @ApiResponse({ status: 200, description: 'Returns all FAQ categories' })
  getCategories(@Request() req) {
    return this.faqsService.getCategories(req.user);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get FAQs by category' })
  @ApiResponse({ status: 200, description: 'Returns FAQs for the specified category' })
  findByCategory(@Param('category') category: string, @Request() req) {
    return this.faqsService.findByCategory(category, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific FAQ' })
  @ApiResponse({ status: 200, description: 'Returns the FAQ' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.faqsService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a FAQ (Admin only)' })
  @ApiResponse({ status: 200, description: 'FAQ updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto, @Request() req) {
    return this.faqsService.update(id, updateFaqDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a FAQ (Admin only)' })
  @ApiResponse({ status: 200, description: 'FAQ deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.faqsService.remove(id, req.user);
  }
}
