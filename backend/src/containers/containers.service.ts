import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContainerDto, UpdateContainerDto } from './dto/container.dto';

@Injectable()
export class ContainersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateContainerDto) {
    const location = `${dto.column}${dto.row}`;

    // Validate parent container if provided
    if (dto.parentId) {
      const parent = await this.prisma.container.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.userId !== userId) {
        throw new BadRequestException('Parent container not found or not authorized');
      }
    }

    // Validate team if provided
    if (dto.teamId) {
      const teamMember = await this.prisma.teamMember.findFirst({
        where: { teamId: dto.teamId, userId },
      });
      if (!teamMember) {
        throw new ForbiddenException('Not a member of this team');
      }
    }

    const container = await this.prisma.container.create({
      data: {
        name: dto.name,
        location,
        row: dto.row,
        column: dto.column.toUpperCase(),
        description: dto.description,
        color: dto.color,
        userId,
        parentId: dto.parentId,
        teamId: dto.teamId,
      },
      include: {
        _count: { select: { items: true } },
        parent: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return this.formatContainer(container);
  }

  async findAll(userId: string) {
    // Get user's team memberships
    const teamMemberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = teamMemberships.map((m) => m.teamId);

    const containers = await this.prisma.container.findMany({
      where: {
        OR: [
          { userId },
          { teamId: { in: teamIds } },
        ],
      },
      include: {
        _count: { select: { items: true } },
        parent: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
      },
      orderBy: [{ column: 'asc' }, { row: 'asc' }],
    });

    return containers.map((c) => this.formatContainer(c));
  }

  async findOne(userId: string, id: string) {
    const container = await this.prisma.container.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { items: true } },
        parent: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, location: true } },
      },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    // Check access: owner, or team member
    const hasAccess = await this.checkContainerAccess(userId, container);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to access this container');
    }

    const path = await this.buildContainerPath(container.id);

    return {
      ...this.formatContainer(container),
      items: container.items,
      children: container.children,
      path,
    };
  }

  async findByQrCode(userId: string, qrCode: string) {
    const container = await this.prisma.container.findUnique({
      where: { qrCode },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { items: true } },
        parent: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    const hasAccess = await this.checkContainerAccess(userId, container);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to access this container');
    }

    const path = await this.buildContainerPath(container.id);

    return {
      ...this.formatContainer(container),
      items: container.items,
      path,
    };
  }

  private async checkContainerAccess(userId: string, container: any): Promise<boolean> {
    if (container.userId === userId) return true;

    if (container.teamId) {
      const membership = await this.prisma.teamMember.findFirst({
        where: { teamId: container.teamId, userId },
      });
      if (membership) return true;
    }

    return false;
  }

  private async buildContainerPath(containerId: string): Promise<string> {
    const parts: string[] = [];
    let currentId: string | null = containerId;

    while (currentId) {
      const container = await this.prisma.container.findUnique({
        where: { id: currentId },
        select: { name: true, parentId: true },
      });

      if (!container) break;

      parts.unshift(container.name);
      currentId = container.parentId;
    }

    return parts.join(' > ');
  }

  async update(userId: string, id: string, dto: UpdateContainerDto) {
    const container = await this.prisma.container.findUnique({
      where: { id },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    const hasAccess = await this.checkContainerAccess(userId, container);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to update this container');
    }

    // Validate new parent if provided
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Container cannot be its own parent');
      }
      const parent = await this.prisma.container.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent container not found');
      }
    }

    const column = dto.column?.toUpperCase() || container.column;
    const row = dto.row || container.row;
    const location = `${column}${row}`;

    const updated = await this.prisma.container.update({
      where: { id },
      data: {
        name: dto.name,
        location,
        row,
        column,
        description: dto.description,
        color: dto.color,
        parentId: dto.parentId,
        teamId: dto.teamId,
      },
      include: {
        _count: { select: { items: true } },
        parent: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return this.formatContainer(updated);
  }

  async remove(userId: string, id: string) {
    const container = await this.prisma.container.findUnique({
      where: { id },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    // Only owner can delete
    if (container.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this container');
    }

    await this.prisma.container.delete({ where: { id } });

    return { message: 'Container deleted successfully' };
  }

  async getChildren(userId: string, parentId: string) {
    const parent = await this.prisma.container.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new NotFoundException('Parent container not found');
    }

    const hasAccess = await this.checkContainerAccess(userId, parent);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized');
    }

    const children = await this.prisma.container.findMany({
      where: { parentId },
      include: {
        _count: { select: { items: true } },
        parent: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: [{ column: 'asc' }, { row: 'asc' }],
    });

    return children.map((c) => this.formatContainer(c));
  }

  private formatContainer(container: any) {
    return {
      id: container.id,
      name: container.name,
      location: container.location,
      row: container.row,
      column: container.column,
      description: container.description,
      qrCode: container.qrCode,
      color: container.color,
      itemCount: container._count?.items || 0,
      parentId: container.parentId,
      parentName: container.parent?.name || null,
      teamId: container.teamId,
      teamName: container.team?.name || null,
      createdAt: container.createdAt,
      updatedAt: container.updatedAt,
    };
  }
}
