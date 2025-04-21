# 설정 및 마무리

## 설정(Configuration)이란

- 설정 파일

  - runtime 도중에 바뀌는 것이 아닌 애플리케이션이 시작할 때 로드가 되어서 그 값들을 정의해 줌

  - 여러 파일 형식 사용 가능: XML, JSON, YAML, Environment, Variables 등

<br >

- Codebase vs Environment Variables(환경 변수)

  - Codebase: 일반적으로 port처럼 노출되어도 상관없는 정보들

  - 환경 변수: 비밀번호나 API Key처럼 노출되면 안 되는 정보들

<br />

- 설정하기 위해서 필요한 모듈

  - 윈도우: win-node-env -> 기본적으로 환경변수를 지원하지 않기 때문

  ```shell
  $ npm i -g win-node-env
  ```

  - 윈도우 && 맥: config

  ```shell
  $ npm i -D config
  ```

<br />

- Config 모듈을 이용한 설정 파일 생성

  1. 루트 디릭토리에 config라는 폴더를 만든 후에 그 폴더 안에 JSON | YAML 형식의 파일 생성 -> config/default.yaml

  2. config 폴더 안에 default.yaml, development.yaml, production.yaml 파일 생성

     - default.yaml: 기본 설정(개발 환경 설정, 운영 환경 설정에도 적용됨)

     - development.yaml: default.yaml + 개발 환경에서 필요한 정보

     - production.yaml: default.yaml + 운영 환경에서 필요한 정보

<br />

- Config 폴더 안에 저장된 것들을 사용하는 방법

  1. 어느 파일에서든지 config 모듈을 import 해서 사용

  ```ts
  import * as config from "config";
  ```

  <br />

  2. config.get('server')로 작성할 경우 yaml 파일로 작성된 server 값에 대한 객체 반환({ port : 3000})

     - config 모듈의 타입 선언 파일에 대한 ts 문제로 @types/config 패키지 설치

  ```shell
  $ npm i -D @types/config
  ```

  ```ts
  import { NestFactory } from "@nestjs/core";
  import { AppModule } from "./app.module";
  import { Logger } from "@nestjs/common";
  import config from "config";

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const serverConfig = config.get<{ port: number }>("server");
    const port = serverConfig.port;

    await app.listen(process.env.PORT ?? port);
    Logger.log(`Application running on port ${port}`);
  }
  bootstrap();
  ```

<br />

## 설정 적용 & 강의 마무리

- 설정 파일에 넣어준 값들을 실제 코드에 적용 및 환경 변수 정의 및 추가

  - typeOrmConfig.ts

  ```ts
  import { TypeOrmModuleOptions } from "@nestjs/typeorm";
  import config from "config";

  const dbConfig = config.get<{
    type: "mysql" | "mariadb" | "postgres" | "mssql" | "oracle" | "mongodb";
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
  }>("db");

  export const typeORMConfig: TypeOrmModuleOptions = {
    type: dbConfig.type,
    host: process.env.RDS_HOSTNAME ?? dbConfig.host,
    port: Number(process.env.RDS_PORT ?? dbConfig.port),
    username: process.env.RDS_USERNAME ?? dbConfig.username,
    password: process.env.PASSWORD ?? dbConfig.password,
    database: process.env.RDS_DB_NAME ?? dbConfig.database,
    entities: [__dirname + "/../**/*.entity.{js,ts}"],
    synchronize: dbConfig.synchronize // 엔티티(Entity) 클래스의 변경사항을 데이터베이스 스키마에 자동으로 동기화
  };
  ```

  - auth.module.ts, jwt.strategy.ts

  ```ts
  import { Module } from "@nestjs/common";
  import { AuthController } from "./auth.controller";
  import { AuthService } from "./auth.service";
  import { UserRepository } from "./user.repository";
  import { JwtModule } from "@nestjs/jwt";
  import { PassportModule } from "@nestjs/passport";
  import { JwtStrategy } from "./jwt.strategy";
  import config from "config";

  const jwtConfig = config.get<{ secret: string; expiresIn: number }>("jwt");

  @Module({
    imports: [
      PassportModule.register({ defaultStrategy: "jwt" }), // Passport 모듈을 사용하여 JWT 설정
      JwtModule.register({
        // 수정
        secret: process.env.JWT_SECRET ?? jwtConfig.secret,
        signOptions: {
          expiresIn: jwtConfig.expiresIn
        }
      })
    ],
    controllers: [AuthController],
    providers: [AuthService, UserRepository, JwtStrategy],
    exports: [JwtModule, PassportModule]
  })
  export class AuthModule {}
  ```

  <br />

  ```ts
  import { Injectable, UnauthorizedException } from "@nestjs/common";
  import { PassportStrategy } from "@nestjs/passport";
  import { InjectRepository } from "@nestjs/typeorm";
  import { ExtractJwt, Strategy } from "passport-jwt";
  import { UserRepository } from "./user.repository";
  import { User } from "./user.entity";
  import config from "config";

  const jwtConfig = config.get<{ secret: string; expiresIn: number }>("jwt");

  // JWT를 생성할 때 넣는 값의 구조와 동일 형태의 interface 작성
  interface JwtPayload {
    username: string;
  }

  @Injectable()
  export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
      @InjectRepository(UserRepository)
      private readonly userRepository: UserRepository
    ) {
      super({
        // 수정
        secretOrKey: process.env.JWT_SECRET ?? jwtConfig.secret,
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() // Bearer Token에서 JWT를 추출하는 방법
      });
    }

    async validate(payload: JwtPayload): Promise<User> {
      const { username }: { username: string } = payload;
      // payload에 담긴 username으로 DB에서 사용자 정보를 조회
      const user: User | null = await this.userRepository.findOne({
        where: { username }
      });

      // 사용자가 존재하지 않으면 UnauthorizedException을 던짐
      if (!user) throw new UnauthorizedException();

      // 사용자가 존재하면 해당 사용자 정보를 반환
      return user;
    }
  }
  ```
