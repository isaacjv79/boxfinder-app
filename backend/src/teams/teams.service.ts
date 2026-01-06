import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: 'admin',
          },
        },
      },
      include: {
        owner: { select: { name: true } },
        _count: { select: { members: true } },
      },
    });

    return this.formatTeam(team);
  }

  async findAll(userId: string) {
    const teams = await this.prisma.team.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: { select: { name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return teams.map((team) => this.formatTeam(team));
  }

  async findOne(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: { select: { name: true } },
        members: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const isMember = team.members.some((m) => m.userId === userId);
    if (!isMember && team.ownerId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return {
      ...this.formatTeam(team),
      members: team.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.name,
        userEmail: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };
  }

  async update(userId: string, teamId: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only team owner can update team');
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: { name: dto.name },
      include: {
        owner: { select: { name: true } },
        _count: { select: { members: true } },
      },
    });

    return this.formatTeam(updated);
  }

  async remove(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only team owner can delete team');
    }

    await this.prisma.team.delete({ where: { id: teamId } });

    return { message: 'Team deleted successfully' };
  }

  async inviteMember(userId: string, teamId: string, dto: InviteMemberDto) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { select: { userId: true, role: true } },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const userMembership = team.members.find((m) => m.userId === userId);
    if (!userMembership || (userMembership.role !== 'admin' && team.ownerId !== userId)) {
      throw new ForbiddenException('Only admins can invite members');
    }

    const invitedUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!invitedUser) {
      throw new BadRequestException('User with this email not found');
    }

    const existingMember = team.members.find((m) => m.userId === invitedUser.id);
    if (existingMember) {
      throw new BadRequestException('User is already a member');
    }

    const member = await this.prisma.teamMember.create({
      data: {
        teamId,
        userId: invitedUser.id,
        role: dto.role || 'member',
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return {
      id: member.id,
      userId: member.userId,
      userName: member.user.name,
      userEmail: member.user.email,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }

  async updateMemberRole(
    userId: string,
    teamId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { select: { userId: true, role: true } } },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const userMembership = team.members.find((m) => m.userId === userId);
    if (!userMembership || (userMembership.role !== 'admin' && team.ownerId !== userId)) {
      throw new ForbiddenException('Only admins can update roles');
    }

    const member = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return {
      id: member.id,
      userId: member.userId,
      userName: member.user.name,
      userEmail: member.user.email,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }

  async removeMember(userId: string, teamId: string, memberId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { select: { id: true, userId: true, role: true } } },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const userMembership = team.members.find((m) => m.userId === userId);
    const memberToRemove = team.members.find((m) => m.id === memberId);

    if (!memberToRemove) {
      throw new NotFoundException('Member not found');
    }

    // Can remove if: admin, owner, or removing self
    const canRemove =
      team.ownerId === userId ||
      userMembership?.role === 'admin' ||
      memberToRemove.userId === userId;

    if (!canRemove) {
      throw new ForbiddenException('Not authorized to remove this member');
    }

    // Cannot remove owner
    if (memberToRemove.userId === team.ownerId) {
      throw new BadRequestException('Cannot remove team owner');
    }

    await this.prisma.teamMember.delete({ where: { id: memberId } });

    return { message: 'Member removed successfully' };
  }

  async getTeamContainers(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { select: { userId: true } } },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const isMember = team.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Not a team member');
    }

    const containers = await this.prisma.container.findMany({
      where: { teamId },
      include: {
        _count: { select: { items: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return containers.map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      row: c.row,
      column: c.column,
      description: c.description,
      qrCode: c.qrCode,
      color: c.color,
      itemCount: c._count.items,
      ownerName: c.user.name,
      createdAt: c.createdAt,
    }));
  }

  private formatTeam(team: any) {
    return {
      id: team.id,
      name: team.name,
      ownerId: team.ownerId,
      ownerName: team.owner?.name,
      memberCount: team._count?.members || 0,
      createdAt: team.createdAt,
    };
  }
}
