import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';
import { VisionService } from '../vision/vision.service';
import {
  CreateItemDto,
  CreateItemManualDto,
  UpdateItemDto,
  SearchItemsDto,
  BorrowItemDto,
} from './dto/item.dto';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(
    private prisma: PrismaService,
    private visionService: VisionService,
    private configService: ConfigService,
  ) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async create(userId: string, dto: CreateItemDto) {
    // Verify container belongs to user
    const container = await this.prisma.container.findUnique({
      where: { id: dto.containerId },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    if (container.userId !== userId) {
      throw new ForbiddenException('Not authorized to add items to this container');
    }

    // Analyze image with Claude Vision
    const analysis = await this.visionService.analyzeImage(dto.imageBase64);

    // Upload image to Cloudinary
    let imageUrl: string;
    let thumbnailUrl: string | null = null;

    try {
      const cloudinaryResult = await this.uploadToCloudinary(dto.imageBase64);
      imageUrl = cloudinaryResult.secure_url;
      thumbnailUrl = cloudinaryResult.eager?.[0]?.secure_url || null;
      this.logger.log(`Image uploaded to Cloudinary: ${imageUrl}`);
    } catch (error) {
      this.logger.error('Failed to upload to Cloudinary, falling back to base64', error);
      // Fallback to base64 if Cloudinary fails
      imageUrl = `data:image/jpeg;base64,${dto.imageBase64}`;
    }

    // Create item with AI analysis (or manual overrides if provided)
    const item = await this.prisma.item.create({
      data: {
        name: dto.name || analysis.name,
        description: dto.description || analysis.description,
        category: dto.category || analysis.category,
        imageUrl: imageUrl,
        thumbnailUrl: thumbnailUrl,
        aiTags: analysis.tags,
        aiConfidence: analysis.confidence,
        containerId: dto.containerId,
      },
      include: {
        container: {
          select: { name: true, location: true },
        },
      },
    });

    return this.formatItem(item);
  }

  async createManual(userId: string, dto: CreateItemManualDto) {
    // Verify container belongs to user
    const container = await this.prisma.container.findUnique({
      where: { id: dto.containerId },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    if (container.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const item = await this.prisma.item.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        imageUrl: dto.imageUrl,
        aiTags: dto.tags || [],
        aiConfidence: null,
        containerId: dto.containerId,
      },
      include: {
        container: {
          select: { name: true, location: true },
        },
      },
    });

    return this.formatItem(item);
  }

  async findByContainer(userId: string, containerId: string) {
    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    if (container.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const items = await this.prisma.item.findMany({
      where: { containerId },
      include: {
        container: {
          select: { name: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.formatItem(item));
  }

  async search(userId: string, dto: SearchItemsDto) {
    const searchTerms = dto.query.toLowerCase().split(' ');

    // Get user's containers first
    const userContainers = await this.prisma.container.findMany({
      where: { userId },
      select: { id: true },
    });

    const containerIds = userContainers.map((c) => c.id);

    // Search items
    const items = await this.prisma.item.findMany({
      where: {
        containerId: { in: containerIds },
        AND: searchTerms.map((term) => ({
          OR: [
            { name: { contains: term, mode: 'insensitive' as const } },
            { description: { contains: term, mode: 'insensitive' as const } },
            { category: { contains: term, mode: 'insensitive' as const } },
            { aiTags: { has: term } },
          ],
        })),
        ...(dto.category && { category: dto.category }),
      },
      include: {
        container: {
          select: { name: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.formatItem(item));
  }

  async findOne(userId: string, id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        container: {
          select: { name: true, location: true, userId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.container.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.formatItem(item);
  }

  async update(userId: string, id: string, dto: UpdateItemDto) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        container: {
          select: { userId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.container.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const updated = await this.prisma.item.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        aiTags: dto.aiTags,
      },
      include: {
        container: {
          select: { name: true, location: true },
        },
      },
    });

    return this.formatItem(updated);
  }

  async remove(userId: string, id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        container: {
          select: { userId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.container.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Delete from Cloudinary if possible
    try {
      const publicId = this.extractPublicId(item.imageUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
      this.logger.warn('Failed to delete image from Cloudinary', error);
    }

    await this.prisma.item.delete({ where: { id } });

    return { message: 'Item deleted successfully' };
  }

  async moveToContainer(userId: string, itemId: string, newContainerId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: {
        container: { select: { userId: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.container.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const newContainer = await this.prisma.container.findUnique({
      where: { id: newContainerId },
    });

    if (!newContainer || newContainer.userId !== userId) {
      throw new ForbiddenException('Target container not found or not authorized');
    }

    const updated = await this.prisma.item.update({
      where: { id: itemId },
      data: { containerId: newContainerId },
      include: {
        container: { select: { name: true, location: true } },
      },
    });

    return this.formatItem(updated);
  }

  async borrowItem(userId: string, itemId: string, dto: BorrowItemDto) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: {
        container: { select: { userId: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.container.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const updated = await this.prisma.item.update({
      where: { id: itemId },
      data: {
        isBorrowed: dto.isBorrowed,
        borrowedTo: dto.isBorrowed ? dto.borrowedTo : null,
        borrowedAt: dto.isBorrowed ? new Date() : null,
        borrowedNote: dto.isBorrowed ? dto.borrowedNote : null,
      },
      include: {
        container: { select: { name: true, location: true } },
      },
    });

    return this.formatItem(updated);
  }

  async findBorrowed(userId: string) {
    const userContainers = await this.prisma.container.findMany({
      where: { userId },
      select: { id: true },
    });

    const containerIds = userContainers.map((c) => c.id);

    const items = await this.prisma.item.findMany({
      where: {
        containerId: { in: containerIds },
        isBorrowed: true,
      },
      include: {
        container: { select: { name: true, location: true } },
      },
      orderBy: { borrowedAt: 'desc' },
    });

    return items.map((item) => this.formatItem(item));
  }

  private async uploadToCloudinary(base64Image: string): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        `data:image/jpeg;base64,${base64Image}`,
        {
          folder: 'boxfinder',
          eager: [{ width: 200, height: 200, crop: 'thumb' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
    });
  }

  private extractPublicId(url: string): string | null {
    try {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      return `${folder}/${filename.split('.')[0]}`;
    } catch {
      return null;
    }
  }

  private formatItem(item: any) {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      imageUrl: item.imageUrl,
      thumbnailUrl: item.thumbnailUrl,
      aiTags: item.aiTags,
      aiConfidence: item.aiConfidence,
      containerId: item.containerId,
      containerName: item.container?.name,
      containerLocation: item.container?.location,
      isBorrowed: item.isBorrowed,
      borrowedTo: item.borrowedTo,
      borrowedAt: item.borrowedAt,
      borrowedNote: item.borrowedNote,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
