import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRepository } from './user.repository';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // Passport 모듈을 사용하여 JWT 설정
    JwtModule.register({
      secret: 'Secret1234', // 토큰을 만들 때 이용하는 Secret Key
      signOptions: {
        expiresIn: 60 * 60, // 토큰의 유효기간 (1시간)
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserRepository, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
