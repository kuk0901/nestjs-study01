# 인증 기능 구현하기

- import문 생략

## 인증 기능 구현을 위한 준비

- AuthModule 생성

  - AuthController, AuthService, UserEntity, UserRepository, JWT, Passport

<br />

- CLI를 이용한 모듈, 컨트롤러, 서비스 생성

  ```shell
  $ nest g module auth
  $ nest g controller auth --no-spec
  $ nest g service auth --no-spec
  ```

<br />

- User를 위한 Entity 생성

  ```ts
  // auth/user.entity.ts
  @Entity()
  export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    username: string;

    @Column()
    password: string;
  }
  ```

<br />

- User를 위한 Repository 생성

  ```ts
  // auth/user.repository.ts
  @Injectable()
  export class UserRepository extends Repository<User> {
    constructor(private readonly dataSource: DataSource) {
      super(User, dataSource.createEntityManager());
    }
  }
  ```

<br />

- AuthModule에서 repository import

  ```ts
  // auth/auth.module.ts
  @Module({
    controllers: [AuthController],
    providers: [AuthService, UserRepository]
  })
  export class AuthModule {}
  ```

<br />

- Repository Injection

  ```ts
  // auth/auth.service.ts
  @Injectable()
  export class AuthService {
    constructor(
      @InjectRepository(UserRepository)
      private readonly userRepository: UserRepository
    ) {}
  }
  ```

<br />

## 회원가입 기능 구현

- UserRepository 코드 작성

  ```ts
  // auth/user.repository.ts
  @Injectable()
  export class UserRepository extends Repository<User> {
    constructor(private readonly dataSource: DataSource) {
      super(User, dataSource.createEntityManager());
    }

    async createUser(authCredentialsDto: AuthCredentialsDto): Promise<void> {
      const { username, password } = authCredentialsDto;

      const user = this.create({
        username,
        password
      });

      await this.save(user);
    }
  }
  ```

<br />

- AuthService 코드 작성

  ```ts
  // auth/auth.service.ts
  @Injectable()
  export class AuthService {
    constructor(
      @InjectRepository(UserRepository)
      private readonly userRepository: UserRepository
    ) {}

    async signUp(authCredentialsDto: AuthCredentialsDto): Promise<void> {
      return this.userRepository.createUser(authCredentialsDto);
    }
  }
  ```

<br />

- AuthController 코드 작성

  ```ts
  // auth/auth.controller.ts
  @Controller("auth")
  export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("signup")
    signUp(@Body() authCredentialsDto: AuthCredentialsDto): Promise<void> {
      return this.authService.signUp(authCredentialsDto);
    }
  }
  ```

<br />

## 유저 데이터 유효성 체크

- 유효성 체크를 위해 각 column에 조건 추가

  - class-validator 모듈 이용

<br />

- dto의 필드에 개별 유효성 조건 추가

  ```ts
  import { IsString, Matches, MaxLength, MinLength } from "class-validator";

  export class AuthCredentialsDto {
    @IsString()
    @MinLength(4)
    @MaxLength(20)
    username: string;

    @IsString()
    @MinLength(4)
    @MaxLength(20)
    // 영어랑 숫자만 가능한 유효성 체크
    @Matches(/^[a-zA-Z0-9]*$/, {
      message: "password only accepts english and number"
    })
    password: string;
  }
  ```

<br />

- ValidationPipe

  - 요청이 컨트롤러에 있는 핸들러로 들어왔을 때 dto에 있는 유효성 조건에 맞게 체크하기 위해 사용

  ```ts
  @Controller("auth")
  export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("signup")
    signUp(
      @Body(ValidationPipe) authCredentialsDto: AuthCredentialsDto
    ): Promise<void> {
      return this.authService.signUp(authCredentialsDto);
    }
  }
  ```

<br />

## 유저 이름에 유니크한 값 주기

- 두 가지 방법

  1. repository에서 findOne 메서드를 이용해서 이미 존재하는 아이디인지 확인하고 없다면 데이터를 저장 -> 데이터베이스 처리 두 번

  2. 데이버테이스 레벨에서 만약 같은 이름을 가진 유저가 있다면 예외 throw

<br />

- 예외 throw 방법으로 구현

  - user.entity.ts에서 원하는 필드를 유니크 설정

  ```ts
  // auth/user.entity.ts
  @Entity()
  @Unique(["username"])
  export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    username: string;

    @Column()
    password: string;
  }
  ```

  <br />

  > NestJS에서 에러가 발생하고, try-catch 구문인 catch 블록에서 잡아주지 않는다면 에러가 Controller 레벨로 이동해 500 에러가 발생함

  - 현재 500 에러를 좀 더 구체적인 에러로 변경하기 위해 AuthRepository에서 try-catch 구문 사용

  ```ts
  // auth.user.repository.ts
  @Injectable()
  export class UserRepository extends Repository<User> {
    constructor(private readonly dataSource: DataSource) {
      super(User, dataSource.createEntityManager());
    }

    async createUser(authCredentialsDto: AuthCredentialsDto): Promise<void> {
      const { username, password } = authCredentialsDto;

      const user = this.create({
        username,
        password
      });

      try {
        await this.save(user);
      } catch (error) {
        if (error.code === "23505") {
          throw new ConflictException("Existing username");
        } else {
          throw new InternalServerErrorException();
        }
      }
    }
  }
  ```

  - error 타입 가드 형태로 코드 변경

    - 인터페이스 생성

  ```ts
  interface ErrorWithCode {
    code?: string;
  }

  @Injectable()
  export class UserRepository extends Repository<User> {
    constructor(private readonly dataSource: DataSource) {
      super(User, dataSource.createEntityManager());
    }

    async createUser(authCredentialsDto: AuthCredentialsDto): Promise<void> {
      const { username, password } = authCredentialsDto;

      const user = this.create({
        username,
        password
      });
      try {
        await this.save(user);
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as ErrorWithCode).code === "23505"
        ) {
          throw new ConflictException("Existing username");
        } else {
          throw new InternalServerErrorException();
        }
      }
    }
  }
  ```

<br />

## 비밀번호 암호화 하기(설명)

- bcryptjs 모듈 사용

  ```shell
  $ npm i -D bcryptjs
  ```

  ```ts
  import * as bcryptjs from "bcryptjs";
  ```

<br />

- 비밀번호를 데이터베이스에 저장하는 방법

  1. 원본 비밀번호를 저장(최악)

  2. 비밀번호를 암호화 키(Encryption key)와 함께 암호화(양방향)

  - 특정 암호를 이용해 비밀번호 암호화 -> 복호화도 가능

  - 암호화 키가 노출되면 알고리즘은 대부분 오픈되어 있기에 위험도 높음

  3. SHA256 등 Hash로 암호화해서 저장(단방향)

  - 레인보우 테이블을 만들어서 암호화된 비밀번호를 비교해 비밀번호를 알아낼 수 있음

  4. 솔트(salt) + 비밀번호(Plain Password)를 해시(Hash)로 암호화해서 저장 암호화할 때 원래 비밀번호에 salt를 붙인 후에 해시로 암호화

<br />

## 비밀번호 암호화 하기(소스 코드 구현)

- bcrypt를 이용해 비밀번호 암호화한 후 데이터베이스에 저장

  - salt + 비밀번호 형태

```ts
// auth/user.repository.ts
import * as bcrypt from "bcryptjs";

interface ErrorWithCode {
  code?: string;
}

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private readonly dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async createUser(authCredentialsDto: AuthCredentialsDto): Promise<void> {
    const { username, password } = authCredentialsDto;

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.create({
      username,
      password: hashedPassword
    });

    try {
      await this.save(user);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as ErrorWithCode).code === "23505"
      ) {
        throw new ConflictException("Existing username");
      } else {
        throw new InternalServerErrorException();
      }
    }
  }
}
```

<br />

## 로그인 기능 구현하기

- AuthService

  - bcryptjs 모듈을 이용해 비밀번호 비교

  ```ts
  // auth/auth.service.ts
  import * as bcrypt from "bcryptjs";

  @Injectable()
  export class AuthService {
    constructor(
      @InjectRepository(UserRepository)
      private readonly userRepository: UserRepository
    ) {}

    async signIn(authCredentialsDto: AuthCredentialsDto): Promise<string> {
      const { username, password } = authCredentialsDto;
      const user = await this.userRepository.findOne({ where: { username } });

      if (user && (await bcrypt.compare(password, user.password))) {
        return "Login success";
      } else {
        throw new UnauthorizedException("login failed");
      }
    }
  }
  ```

<br />

- AuthController

  ```ts
  // auth/auth.controller.ts
  export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("signin")
    signIn(
      @Body(ValidationPipe) authCredentialsDto: AuthCredentialsDto
    ): Promise<string> {
      return this.authService.signIn(authCredentialsDto);
    }
  }
  ```

<br />

## JWT에 대해서

- JWT(JSON Web Token)

  - 정보를 JSON 객체로 안전하게 전송하기 위한 컴팩트하고 독립적인 방식을 정의하는 개방형 표준

  - 정보를 안정하게 전할 때 혹은 유저의 권한 같은 것을 확인하기 위해서 사용하는 데 유용한 모듈

  - Header: 토큰에 대한 메타 데이터를 포함 -> 타입, 해싱 알고리즘

  - Payload: 유저 정보(issuer), 만료 기간(expiration time), 주제(subject) 등

  - Verify Signature: 위조 확인, 헤더 및 페이로드 세그먼트 / 서명 알고리즘 / 비밀 키를 사용하여 생성

<br />

- JWT 사용 흐름

  ```
  유저 로그인 -> 토큰 생성 -> 토큰 보관

  1. 요청을 보낼 때 보관하고 있던 Token을 Header에 넣어 같이 보냄

  2. 서버에서는 JWT를 이용해 Token을 다시 생성한 후 두 개를 비교

  3. 통과일 경우 이후 요청에 대한 작업 진행

  > 요청에서 같이 온 header랑 payload를 가져와 서버 안에 갖고 있는 비밀 키를 이용해
    signature 부분을 다시 생성, 일치하면 통과
  ```

<br />

## JWT를 이용해서 토큰 생성하기

- 필요 모듈 설치

  - nestjs/jwt: NestJS에서 jwt를 사용하기 위해 필요한 모듈

  - @nestjs/passport: NestJS에서 passport 사용하기 위해 필요한 모듈

  - passport: passport 모듈

  - passport-jwt: jwt 모듈

  ```shell
  $ npm i -D nestjs/jwt @nestjs/passport passport passport-jwt
  ```

<br />

- 애플리케이션에 JWT 모듈 등록

  - AuthModule에 추가

  ```ts
  import { Module } from "@nestjs/common";
  import { AuthController } from "./auth.controller";
  import { AuthService } from "./auth.service";
  import { UserRepository } from "./user.repository";
  import { JwtModule } from "@nestjs/jwt";

  @Module({
    imports: [
      JwtModule.register({
        secret: "Secret1234", // 토큰을 만들 때 이용하는 Secret Key
        signOptions: {
          expiresIn: 60 * 60 // 토큰의 유효기간 (1시간)
        }
      })
    ],
    controllers: [AuthController],
    providers: [AuthService, UserRepository]
  })
  export class AuthModule {}
  ```

<br />

- 애플리케이션에 Passport 모듈 등록

  - AuthModule에 추가

  ```ts
  import { Module } from "@nestjs/common";
  import { AuthController } from "./auth.controller";
  import { AuthService } from "./auth.service";
  import { UserRepository } from "./user.repository";
  import { JwtModule } from "@nestjs/jwt";
  import { PassportModule } from "@nestjs/passport";

  @Module({
    imports: [
      PassportModule.register({ defaultStrategy: "jwt" }), // Passport 모듈을 사용하여 JWT 설정
      JwtModule.register({
        secret: "Secret1234", // 토큰을 만들 때 이용하는 Secret Key
        signOptions: {
          expiresIn: 60 * 60 // 토큰의 유효기간 (1시간)
        }
      })
    ],
    controllers: [AuthController],
    providers: [AuthService, UserRepository]
  })
  export class AuthModule {}
  ```

<br />

- 로그인 성공 시 JWT를 이용해서 토큰 생성

  1. Service에서 SignIn 메서드에 토큰 생성 로직 추가 -> AuthModule에 JWT를 등록했기 때문에 가져올 수 있음

  2. Token을 만들려면 Secret과 Payload가 필요

  ```ts
  @Injectable()
  export class AuthService {
    constructor(
      @InjectRepository(UserRepository)
      private readonly userRepository: UserRepository,
      private readonly jwtService: JwtService
    ) {}

    async signUp(authCredentialsDto: AuthCredentialsDto): Promise<void> {
      return this.userRepository.createUser(authCredentialsDto);
    }

    async signIn(
      authCredentialsDto: AuthCredentialsDto
    ): Promise<{ accessToken: string }> {
      const { username, password } = authCredentialsDto;
      const user = await this.userRepository.findOne({ where: { username } });

      if (user && (await bcrypt.compare(password, user.password))) {
        // 유저 토큰 생성 (Secret + Payload)
        const payload = { username };
        const accessToken = this.jwtService.sign(payload);

        return { accessToken };
      } else {
        throw new UnauthorizedException("login failed");
      }
    }
  }
  ```

<br />

## Passport, JWT 이용해서 토큰 인증 후 유저 정보 가져오기

- 토큰을 포함해 요청을 보낼 때 유효한지 확인 후 payload 안에 들어있는 username을 이용해 DB에 있는 유저인지 확인

  - 데이터가 있는 경우 유저 객체 반환, 없는 경우 에러 반환

  - @types/passport-jwt 모듈 설치: passport-jwt 모듈을 위한 타입 정의 모듈

  > Passport를 사용해 과정 처리

  1. jwt.strategy.ts 파일 생성: 등록된 인증 전략(Strategy)

  ```ts
  // auth/jwt.strategy.ts

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
        secretOrKey: "Secret1234", // JWT를 검증할 때 사용할 Secret Key
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

  2. JwtStrategy를 사용하기 위해 AuthModule Providers 항목에 추가, exports 항목에 추가

  ```ts
  // auth/auth.module.ts
  @Module({
    imports: [
      PassportModule.register({ defaultStrategy: "jwt" }), // Passport 모듈을 사용하여 JWT 설정
      JwtModule.register({
        secret: "Secret1234", // 토큰을 만들 때 이용하는 Secret Key
        signOptions: {
          expiresIn: 60 * 60 // 토큰의 유효기간 (1시간)
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

- 요청 안에 유저 정보(유저 객체)가 들어가게 하는 방법

  - UseGuards: @nestjs/passport에서 가져온 AuthGuard()를 이용해 오청 안에 유저 정보를 넣음

  ```ts
  // auth/auth.controller.ts
  import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
  import { AuthService } from "./auth.service";
  import { AuthGuard } from "@nestjs/passport";

  @Controller("auth")
  export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("/test")
    @UseGuards(AuthGuard())
    test(@Req() req: any) {
      console.log("req", req);
    }
  }
  ```

<br />

- NestJS의 Middleware

  - Pipes: 요청 유효성 검사 및 페이로드 변환을 위해 만들어짐, 데이터를 예상한 대로 직렬화함

  - Filters: 오류 처리 미들웨어 -> 특정 오류 처리기를 사용할 경로와 각 경로 주변의 복잡성을 관리하는 방법을 알 수 있음

  - Guards: 인증 미들웨어 -> 지정된 경로로 통과할 수 있는 사람과 허용되지 않는 사람을 서버에 알려줌

  - Interceptors: 응답 매핑 및 캐시 관리와 함께 요청 로깅과 같은 전후 미들웨어 -> 각 요청 전후에 실행됨

<br />

## 커스텀 데코레이터 생성하기

- req.user가 아닌 바로 user 파라미터를 가져오는 방법

  - 커스텀 데코레이터 이용

  ```ts
  // auth/get-user.decorator.ts
  import { createParamDecorator, ExecutionContext } from "@nestjs/common";
  import { User } from "./user.entity";

  export const GetUser = createParamDecorator(
    (data: unknown, context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      return request.user as User;
    }
  );
  ```

  ```ts
  // auth/auth.controller.ts
  import {
    Body,
    Controller,
    Post,
    UseGuards,
    ValidationPipe
  } from "@nestjs/common";
  import { AuthService } from "./auth.service";
  import { AuthGuard } from "@nestjs/passport";
  import { GetUser } from "./get-user.decorator";
  import { User } from "./user.entity";

  @Controller("auth")
  export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("/test")
    @UseGuards(AuthGuard())
    test(@GetUser() user: User) {
      console.log("user", user);
    }
  }
  ```

<br />

## 인증된 유저만 게시물 보고 쓸 수 있게 설정하기

- 유저에게 게시물 접근 권한 주기

  1. board module에서 인증 모듈 import

  ```ts
  // board/board.module.ts
  import { Module } from "@nestjs/common";
  import { BoardsController } from "./boards.controller";
  import { BoardsService } from "./boards.service";
  import { BoardRepository } from "./board.repository";
  import { AuthModule } from "src/auth/auth.module";

  @Module({
    imports: [AuthModule],
    controllers: [BoardsController],
    providers: [BoardsService, BoardRepository]
  })
  export class BoardsModule {}
  ```

  <br />

  2. UseGuards(AuthGuard())를 이용해서 토큰 검사 후에 게시물 접근 권한을 전달

     - 컨트롤러 레벨로 설정해 모든 라우트에 적용

  ```ts
  import { Body, Controller, Get, UseGuards } from "@nestjs/common";
  import { BoardsService } from "./boards.service";
  import { Board } from "./board.entity";
  import { AuthGuard } from "@nestjs/passport";

  @Controller("boards")
  @UseGuards(AuthGuard())
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Get("/")
    getAllBoards(): Promise<Board[]> {
      return this.boardsService.getAllBoards();
    }
  }
  ```
