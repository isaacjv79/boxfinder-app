import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/team.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.teamsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.teamsService.findOne(req.user.id, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.teamsService.remove(req.user.id, id);
  }

  @Post(':id/members')
  inviteMember(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.teamsService.inviteMember(req.user.id, id, dto);
  }

  @Put(':id/members/:memberId')
  updateMemberRole(
    @Req() req: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamsService.updateMemberRole(req.user.id, id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Req() req: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.removeMember(req.user.id, id, memberId);
  }

  @Get(':id/containers')
  getTeamContainers(@Req() req: any, @Param('id') id: string) {
    return this.teamsService.getTeamContainers(req.user.id, id);
  }
}
