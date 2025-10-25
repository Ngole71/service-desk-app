import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './entities/faq.entity';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Injectable()
export class FaqsService {
  constructor(
    @InjectRepository(Faq)
    private faqsRepository: Repository<Faq>,
  ) {}

  async create(createFaqDto: CreateFaqDto, user: User): Promise<Faq> {
    // Only admins can create FAQs
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create FAQs');
    }

    const faq = this.faqsRepository.create({
      ...createFaqDto,
      tenantId: user.tenantId,
    });

    return this.faqsRepository.save(faq);
  }

  async findAll(user: User, includeUnpublished = false): Promise<Faq[]> {
    const query = this.faqsRepository
      .createQueryBuilder('faq')
      .where('faq.tenantId = :tenantId', { tenantId: user.tenantId })
      .orderBy('faq.order', 'ASC')
      .addOrderBy('faq.createdAt', 'DESC');

    // Customers can only see published FAQs
    if (user.role === UserRole.CUSTOMER || !includeUnpublished) {
      query.andWhere('faq.isPublished = :isPublished', { isPublished: true });
    }

    return query.getMany();
  }

  async findByCategory(category: string, user: User): Promise<Faq[]> {
    const query = this.faqsRepository
      .createQueryBuilder('faq')
      .where('faq.tenantId = :tenantId', { tenantId: user.tenantId })
      .andWhere('faq.category = :category', { category })
      .orderBy('faq.order', 'ASC')
      .addOrderBy('faq.createdAt', 'DESC');

    // Customers can only see published FAQs
    if (user.role === UserRole.CUSTOMER) {
      query.andWhere('faq.isPublished = :isPublished', { isPublished: true });
    }

    return query.getMany();
  }

  async findOne(id: string, user: User): Promise<Faq> {
    const faq = await this.faqsRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }

    // Customers can only see published FAQs
    if (user.role === UserRole.CUSTOMER && !faq.isPublished) {
      throw new NotFoundException('FAQ not found');
    }

    return faq;
  }

  async update(id: string, updateFaqDto: UpdateFaqDto, user: User): Promise<Faq> {
    // Only admins can update FAQs
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update FAQs');
    }

    const faq = await this.faqsRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }

    Object.assign(faq, updateFaqDto);
    return this.faqsRepository.save(faq);
  }

  async remove(id: string, user: User): Promise<void> {
    // Only admins can delete FAQs
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete FAQs');
    }

    const faq = await this.faqsRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }

    await this.faqsRepository.remove(faq);
  }

  async getCategories(user: User): Promise<string[]> {
    const query = this.faqsRepository
      .createQueryBuilder('faq')
      .select('DISTINCT faq.category', 'category')
      .where('faq.tenantId = :tenantId', { tenantId: user.tenantId })
      .andWhere('faq.category IS NOT NULL');

    // Customers can only see categories from published FAQs
    if (user.role === UserRole.CUSTOMER) {
      query.andWhere('faq.isPublished = :isPublished', { isPublished: true });
    }

    const results = await query.getRawMany();
    return results.map(r => r.category).filter(Boolean);
  }
}
