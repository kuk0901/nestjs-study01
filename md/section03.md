# Nest JS 기본 요소

## 게시물 CRUD 애플리케이션 소개

- 제목, 내용, 글 공개 여부

- 게시글에 관한 모듈(BoardModule)

  - BoardController, BoardService

  - BoardEntity, BoardRepository

  - ValidationPipe

- 게시글을 만드는 사람에 대한 인증 모듈(AuthModule)

  - AuthController, AuthService

  - UserEntity, UserRepository

  - JWT, Passport

<br />

## NestCLI로 생성한 프로젝트 기본 구조

- 폴더 생성

  ```shell
  $ mkdir nestjs-board-app
  ```

- nest 기본 구조 생성

  ```shell
  $ nest new ./
  ```

- 앱 실행

  ```shell
  $ npm run start:dev
  ```

<br />

- NestJs 기본 구조

  - eslintrc.js: 특정한 규칙을 가지고 코드를 깔끔하게 작성할 수 있게 도와주는 라이브러리

    - 타입스크립트 가이드라인 제시, 문법에 오류가 나면 알려줌 등

  - prettierrc: 코드 형식을 맞추는 데 사용(코드 포맷터)

  - nest-cli.json: nest 프로젝트를 위해 특정한 설정을 할 수 있는 json 파일

  - tsconfig.json: 타입스크립트 컴파일 설정 파일

  - tsconfig.build,json: tsconfig.json의 연장선상 파일, build 할 때 필요한 설정 명시

    - "excludes"에서 빌드할 때 필요 없는 파일 명시

  - package.json: build(운영 환경을 위한 빌드), format(린트(Lint) 오류 자동 수정 또는 코드 스타일 통일), start(앱 시작)

  - src: main.ts(앱 생성/실행), app.module.ts(root 모듈)

<br />

## 기본 구조에서 살펴보는 Nest 로직 흐름

- Hello World 텍스트를 출력하는 API

  ```
  - Controller, Service 생성

  - Module에 등록

  - main.ts에서 AppModule 실행

  - api 요청 시 controller -> service 순차적으로 실행
  ```

<br />

## Nest JS 모듈

- @Module 데코레이터로 주석이 달린 클래스

  - Nest가 애플리케이션 구조를 구성하는 데 사용하는 메타 데이터 제공

  - 각 응용 프로그램에는 하나 이상의 모듈(루트 모듈)이 존재, 루트 모듈은 Nest가 사용하는 시작점

  - 같은 기능에 해당하는 것들은 모듈 패키지로 분리(UserController, UserService, UserEntity -> UserModule)

  - 모듈은 기본적으로 싱글톤, 여러 모듈 간에 동일한(공통된) 인스턴스(모듈) 공유 가능

<br />

## Board Module 생성

- Root Module 하위의 BoardModule 생성

- Board Module 생성 명령어

  - nest: nestcli 사용

  - g: generate(생성 의미)

  - module: 모듈

  - boards: 모듈 이름

  ```shell
  $ nest g module boards
  ```

  ```ts
  import { Module } from "@nestjs/common";

  @Module({})
  export class BoardsModule {}
  ```

<br />

## NestJs Controller

- Controller: 들어오는 요청을 처리하고 클라이언트에게 응답을 반환

- @Controller 데코레이터로 클래스를 데코레이션 하여 정의

  - 데코레이터는 인자를 Controller에 의해서 처리되는 경로로 받음

  ```ts
  @Controller("/boards")
  export class BoardsController {
    // ...
  }
  ```

<br />

- Handle

  - @Get, @Post, @Delete 등과 같은 데코레이터로 장식된 컨트롤러 클래스 내의 메서드

  ```ts
  @Controller("/boards")
  export class BoardsController {
    @Get
    getAllBoards(): Promise<Board[]> {
      // ...
    }
  }
  ```

<br />

## Board Controller 생성하기

- Board Controller 생성 명령어

  - nest: nestcli 사용

  - g: generate(생성 의미)

  - controller: 컨트롤러를 의미

  - boards: 컨트롤러 이름

  - --no-spec: 테스트를 위한 소스 코드 생성 X

  ```shell
  $ nest g controller boards --no-spec
  ```

  ```ts
  import { Controller } from "@nestjs/common";

  @Controller("boards")
  export class BoardsController {}
  ```

  > BoardModule에 자동으로 controller 등록

<br />

- CLI로 명령어 입력 시 Controller 만드는 순서

  1. boards 폴더 찾기

  2. boards 폴더 내부에 controller 파일 생성

  3. module 폴더 찾기

  4. module 폴더 안에 controller 등록

<br />

## NestJs Providers, Service

- Provides: Nest의 기본 개념

  - service, repository, factory, helper 등을 providers로 취급 가능

  - 의존성 주입의 대상이 되는 객체

  ```
  Controller B -> @Injectable()
                  Service A
  ```

<br />

- Service

  - Nest에서 @Injectable 데코레이터로 감싸져서 모듈에 제공되며, 서비스 인스턴스는 애플리케이션 전체에서 사용 가능

  - 데이터의 유효성 검사, 데이터베이스에 아이템을 생성하는 등의 로직을 작성

  ```ts
  @Injectable()
  export class AppService {
    getHello(): string {
      return "Hello World";
    }
  }
  ```

<br />

- Service를 Controller에서 사용하는 방법: 의존성 주입

  - Dependency Injection

  - TypeScript는 접근 제어자를 사용해 생성자 매개변수를 자동 프로퍼티로 할당

    - private, readonly 중 하나만 사용해도 프로퍼티로 할당되지만 NestJs는 둘 다 사용하는 것 권장

    > 해당 기능을 사용해 NestJS는 DI 시스템을 구축

  ```ts
  // import문 생략

  @Controller("boards")
  export class BoardController {
    constructor(private readonly boardsService: BoardsService) {}

    @Get("/:id")
    getBoardById(@Param("id") id: string): Board {
      return this.boardsService.getBoardById(id);
    }
  }
  ```

<br />

- Providers 등록

  - module 파일의 providers 속성에 사용하고자 하는 Providers를 추가

  ```ts
  // import문 생략
  @Module({
    controllers: [BoardsController],
    Providers: [BoardsService]
  })
  export class BoardsModule {}
  ```

<br />

## Board Service 만들기

- Board Service 생성 명령어

  - nest: nestcli 사용

  - g: generate(생성 의미)

  - service: 서비스를 의미

  - boards: 서비스 이름

  - --no-spec: 테스트를 위한 소스 코드 생성 X

  ```shell
  $ nest g service boards --no-spec
  ```

  ```ts
  import { Injectable } from "@nestjs/common";

  @Injectable()
  export class BoardsService {}
  ```

  > BoardModule에 자동으로 providers 등록

<br />

- Board Service를 Board Controller에 의존성 주입

  - private + readonly = 불변성 + 의존성 주입

  ```ts
  import { Controller } from "@nestjs/common";
  import { BoardsService } from "./boards.service";

  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}
  }
  ```
