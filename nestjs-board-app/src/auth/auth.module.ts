import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRepository } from './user.repository';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import config from 'config';

const jwtConfig = config.get<{ secret: string; expiresIn: number }>('jwt');

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // Passport 모듈을 사용하여 JWT 설정
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.expiresIn,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserRepository, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
