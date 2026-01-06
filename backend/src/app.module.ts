import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ContainersModule } from './containers/containers.module';
import { ItemsModule } from './items/items.module';
import { VisionModule } from './vision/vision.module';
import { TeamsModule } from './teams/teams.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ContainersModule,
    ItemsModule,
    VisionModule,
    TeamsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
