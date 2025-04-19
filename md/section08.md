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

<br />

## JWT를 이용해서 토큰 생성하기

<br />

## Passport, JWT 이용해서 토큰 인증 후 유저 정보 가져오기

<br />

## 커스텀 데코레이터 생성하기

<br />

## 인증된 유저만 게시물 보고 쓸 수 있게 설정하기
