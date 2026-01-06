import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import {
  CreateItemDto,
  CreateItemManualDto,
  UpdateItemDto,
  SearchItemsDto,
  BorrowItemDto,
} from './dto/item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateItemDto) {
    return this.itemsService.create(req.user.id, dto);
  }

  @Post('manual')
  createManual(@Req() req: any, @Body() dto: CreateItemManualDto) {
    return this.itemsService.createManual(req.user.id, dto);
  }

  @Get('search')
  search(@Req() req: any, @Query() dto: SearchItemsDto) {
    return this.itemsService.search(req.user.id, dto);
  }

  @Get('borrowed')
  findBorrowed(@Req() req: any) {
    return this.itemsService.findBorrowed(req.user.id);
  }

  @Get('container/:containerId')
  findByContainer(@Req() req: any, @Param('containerId') containerId: string) {
    return this.itemsService.findByContainer(req.user.id, containerId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.itemsService.findOne(req.user.id, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(req.user.id, id, dto);
  }

  @Put(':id/move/:containerId')
  moveToContainer(
    @Req() req: any,
    @Param('id') id: string,
    @Param('containerId') containerId: string,
  ) {
    return this.itemsService.moveToContainer(req.user.id, id, containerId);
  }

  @Put(':id/borrow')
  borrowItem(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: BorrowItemDto,
  ) {
    return this.itemsService.borrowItem(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.itemsService.remove(req.user.id, id);
  }
}
