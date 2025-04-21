import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from './user.repository';
import { User } from './user.entity';
import config from 'config';

const jwtConfig = config.get<{ secret: string; expiresIn: number }>('jwt');

// JWT를 생성할 때 넣는 값의 구조와 동일 형태의 interface 작성
interface JwtPayload {
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
  ) {
    super({
      secretOrKey: process.env.JWT_SECRET ?? jwtConfig.secret,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Bearer Token에서 JWT를 추출하는 방법
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const { username }: { username: string } = payload;
    // payload에 담긴 username으로 DB에서 사용자 정보를 조회
    const user: User | null = await this.userRepository.findOne({
      where: { username },
    });

    // 사용자가 존재하지 않으면 UnauthorizedException을 던짐
    if (!user) throw new UnauthorizedException();

    // 사용자가 존재하면 해당 사용자 정보를 반환
    return user;
  }
}
