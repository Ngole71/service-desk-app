import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { User } from '@/modules/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: (process.env.JWT_EXPIRATION || '7d') as any },
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class WebsocketModule {}
