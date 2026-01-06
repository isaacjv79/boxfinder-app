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
import { ContainersService } from './containers.service';
import { CreateContainerDto, UpdateContainerDto } from './dto/container.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('containers')
@UseGuards(JwtAuthGuard)
export class ContainersController {
  constructor(private containersService: ContainersService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateContainerDto) {
    return this.containersService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.containersService.findAll(req.user.id);
  }

  @Get('qr/:qrCode')
  findByQrCode(@Req() req: any, @Param('qrCode') qrCode: string) {
    return this.containersService.findByQrCode(req.user.id, qrCode);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.containersService.findOne(req.user.id, id);
  }

  @Get(':id/children')
  getChildren(@Req() req: any, @Param('id') id: string) {
    return this.containersService.getChildren(req.user.id, id);
  }

  @Put(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateContainerDto,
  ) {
    return this.containersService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.containersService.remove(req.user.id, id);
  }
}
