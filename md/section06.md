# Postgres & TypeORM 연동

## PostgresSQL 설치

- PostgresSQL 설치

  ```shell
  $ brew install postgresql@16
  ```

  <br />

  - 경로 설정

  ```shell
  $ echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
  $ source ~/.zshrc
  ```

  <br />

  - 서버 시작 및 종료

  ```shell
  $ brew services start postgresql@16
  $ brew services stop postgresql@16
  ```

  <br />

  - 슈퍼 계정 설정

  ```shell
  $ psql -c "CREATE ROLE postgres WITH SUPERUSER LOGIN;"
  $ psql -c "ALTER ROLE postgres WITH PASSWORD '원하는비밀번호';"
  ```

- pgAdmin 설치

<br />

## TypeORM 소개

- TypeORM(Object Relational Mapping)

  - Node.js에서 실행되고 TypeScript로 작성된 객체 관계형 맵퍼 라이브러리

  - Oracle, MySQL, PostgresSQL, MariaDB 등 여러 데이터베이스 지원

<br />

- ORM(Object Relational Mapping)

  - 객체와 관계형 데이터베이스의 데이터를 자동으로 변형 및 연결하는 작업

  - 객체와 데이터베이스의 변형에 유연하게 사용 가능

<br />

- TypeORM 특징 / 장점

  - 모델을 기반으로 데이터베이스 테이블 체계를 자동으로 생성

  - 데이터베이스에서 객체를 쉽게 삽입, 업데이트 및 삭제할 수 있음

  - 테이블 간의 맵핑(일대일, 일대다, 다대다) 만들 수 있음

  - 간단한 CLI 명령 제공

  - 간단한 코딩으로 ORM 프레임워크 사용 가능

  - 다른 모듈과 쉽게 통합

<br />

## TypeORM 이용

- 모듈 설치

  - @nestjs/typeorm: NestJS에서 TypeORM을 사용하기 위해 연동시켜 주는 모듈
  - pg: postgres 모듈

  - typeorm: TypeORM 모듈

  ```shell
  $ npm i pg typeorm @nestjs/typeorm -D
  ```

<br />

- TypeORM 애플리케이션에 연결

  - typeORM 설정 파일 생성 및 작성

  ```ts
  // typeorm.config.ts
  import { TypeOrmModuleOptions } from "@nestjs/typeorm";

  export const typeORMConfig: TypeOrmModuleOptions = {
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "1234",
    database: "board-app",
    entities: [__dirname + "/../**/*.entity.{js,ts}"],
    synchronize: true // 엔티티(Entity) 클래스의 변경사항을 데이터베이스 스키마에 자동으로 동기화
  };
  ```

  - 루트 Module에서 import

  ```ts
  // app.module.ts
  import { Module } from "@nestjs/common";
  import { BoardsModule } from "./boards/boards.module";
  import { TypeOrmModule } from "@nestjs/typeorm";
  import { typeORMConfig } from "./configs/typeorm.config";

  @Module({
    imports: [TypeOrmModule.forRoot(typeORMConfig), BoardsModule]
  })
  export class AppModule {}
  ```

<br />

## 게시물을 위한 엔티티(Entity) 생성하기

- Entity 생성 이유

  - 데이터베이스 테이블로 변환되는 Class이기 때문에 클래스를 생성한 후 그 안에 칼럼 정의

<br />

- 데코레이터

  - @Entity(): 해당 클래스가 엔티티임을 나타냄 -> 빈 값일 경우 클래스 이름으로 맵핑

  - @PrimaryGeneratedColumn(): PK 설정

  - @Column(): 칼럼 설정

<br />

- Board 엔티티 생성

  ```ts
  // board.entity.ts
  import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
  import { BoardStatus } from "./board.model";

  @Entity()
  export class Board extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    description: string;

    @Column()
    status: BoardStatus;
  }
  ```

<br />

## Repository 생성하기

- Repository: 엔티티 객체와 함께 작동하며 엔티티 CRUD 등(데이버테이스와 관련된 일)을 처리

  > Repository Pattern이라고도 부름

<br />

- Repository 생성

  1. 파일 생성: board.repository.ts

  2. 생성한 파일에 Repository를 위한 클래스 생성

     - @Injectable()

  ```ts
  // board.repository.ts
  import { DataSource, Repository } from "typeorm";
  import { Board } from "./board.entity";
  import { Injectable } from "@nestjs/common";

  @Injectable()
  export class BoardRepository extends Repository<Board> {
    // 커스텀 메서드를 추가하기 위한 표준 패턴
    constructor(private readonly dataSource: DataSource) {
      super(Board, dataSource.createEntityManager());
    }
  }
  ```

<br />

- Module 등록

  ```ts
  // board.module.ts
  import { Module } from "@nestjs/common";
  import { BoardsController } from "./boards.controller";
  import { BoardsService } from "./boards.service";
  import { BoardRepository } from "./board.repository";

  @Module({
    controllers: [BoardsController],
    providers: [BoardsService, BoardRepository]
  })
  export class BoardsModule {}
  ```
