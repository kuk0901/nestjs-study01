# CRUD 구현

## 모든 게시물을 가져오는 Service 만들기

- 데이터를 로컬 메모리에 담아서 처리

- boards 배열 안에 게시물 데이터들 저장 -> 배열값 수정 방지를 위해 private 설정

  ```ts
  // boards.service.ts
  import { Injectable } from "@nestjs/common";

  @Injectable()
  export class BoardsService {
    private readonly boards = [];

    getAllBoards() {
      return this.boards;
    }
  }
  ```

  ```ts
  // boards.controller.ts
  import { Controller, Get } from "@nestjs/common";
  import { BoardsService } from "./boards.service";

  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Get("/")
    getAllBoard() {
      return this.boardsService.getAllBoards();
    }
  }
  ```

<br />

- 정리

  ```
  1. 클라이언트의 요청 -> 컨트롤러

  2. 컨트롤러에서 알맞은 요청 경로에 라우팅 -> 해당 핸들러

  3. 요청을 처리하기 위해 핸들러 내부에 작성된 서비스의 메서드 호출 및 리턴

  4. 컨트롤러의 응답 -> 클라이언트

  * 컨트롤러는 요청을 처리하고 응답을 반환하는 역할
  ```

<br />

## Board Model 정의하기

- 게시물의 모델 생성

  - board Model 파일 생성 -> board.model.ts

<br />

- 모델 정의

  - Class: 변수의 타입 체크, 인스턴스 생성

  - Interface: 변수의 타입만 체크

  > 구조만 정의하기 위해 interface 사용

<br />

- board 모델 생성

  1. board.model.ts 파일 생성

  2. interface로 구조 정의

  <br />

  - BoardStatus: 게시글 공개 여부, 두 가지 상태만 나올 수 있게 enumeration 타입 사용

  ```ts
  // board.model.ts
  export interface Board {
    id: string;
    title: string;
    description: string;
    status: BoardStatus;
  }

  export enum BoardStatus {
    PUBLIC = "PUBLIC",
    PRIVATE = "PRIVATE"
  }
  ```

<br />

- BoardsService, BoardsController에 적용

  ```ts
  // boards.service.ts
  import { Injectable } from "@nestjs/common";
  import { Board } from "./board.model";

  @Injectable()
  export class BoardsService {
    private readonly boards: Board[] = [];

    getAllBoards(): Board[] {
      return this.boards;
    }
  }
  ```

  ```ts
  // boards.controller.ts
  import { Controller, Get } from "@nestjs/common";
  import { BoardsService } from "./boards.service";
  import { Board } from "./board.model";

  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Get("/")
    getAllBoard(): Board[] {
      return this.boardsService.getAllBoards();
    }
  }
  ```

  > 타입 정의의 이점: 가독성 향상 등

<br />

## 게시물 생성하기(Service 부분)

- Service에서 로직 처리 후 Controller에서 호출

  - 게시물 id: 데이터베이스가 없기 때문에 uuid 모듈을 이용(보통 DB는 유니크한 id 생성 가능)

  ```shell
  $ npm i uuid -D
  ```

  ```ts
  // boards.service.ts
  import { Injectable } from "@nestjs/common";
  import { Board, BoardStatus } from "./board.model";
  import { v1 as uuid } from "uuid";

  @Injectable()
  export class BoardsService {
    private readonly boards: Board[] = [];

    getAllBoards(): Board[] {
      return this.boards;
    }

    createBoard(title: string, description: string) {
      const board: Board = {
        id: uuid(),
        title,
        description,
        status: BoardStatus.PUBLIC
      };

      this.boards.push(board);

      return board;
    }
  }
  ```

<br />

## 게시물 생성하기(Controller 부분)

- 클라이언트에서 보내온 데이터를 핸들러에서 가져오는 방법(NestJS)

  - @Body 데코레이터 사용: @Body() body

  - 개별로 가져오기 위해서는 @Body('title') title 형태로 사용

  ```ts
  @Post()
  createBoard(@Body('title') title: string) {
    // ...
  }

  @Post()
  createBoard(@Body() body) {
    // ...
  }
  ```

<br />

- request, response 처리

  - 클라이언트에서 보내는 데이터를 가져오기 위해 @Body 데코레이터 사용

  ```ts
  // boards.controller.ts
  import { Body, Controller, Get, Post } from "@nestjs/common";
  import { BoardsService } from "./boards.service";
  import { Board } from "./board.model";

  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Post()
    createBoard(
      @Body("title") title: string,
      @Body("description") description: string
    ): Board {
      return this.boardsService.createBoard(title, description);
    }
  }
  ```

<br />

- postman 사용해서 api 테스트

<br />

## Data Transfer Object(DTO)

- "계층간 데이터 교환을 위한 객체"

- DB에서 데이터를 얻어 Service, Controller 등으로 보낼 때 사용하는 객체

- 데이터가 네트워크를 통해 전송되는 방법을 정의하는 객체

- interface || class를 이용해 정의할 수 있음 -> class 추천(NestJS)

- 사용 이유:

  - 데이터 유효성을 체크하는 데 효율적

  - 더 안정적인 코드로 만들어줌(타입스크립트의 타입으로도 사용됨)

<br />

- interface vs class

  - class는 js의 es6 표준의 일부이기 때문에 컴파일된 js에서 실제 엔티티로 유지

  - ts interface는 트랜스파일 중 제거되기에 런타임에서 참조할 수 없음

  > 클래스는 런타임에서 동작하기 때문에 파이프 같은 기능을 이용할 때 더 유용

<br />

## 게시물 생성을 위한 DTO

- create-board.dto.ts 파일 생성

  ```ts
  // boards/dto/create-board.dto.ts
  export class CreateBoardDto {
    title: string;
    description: string;
  }
  ```

- Service, Controller 코드 수정

  ```ts
  // board.service.ts
  import { Injectable } from "@nestjs/common";
  import { Board, BoardStatus } from "./board.model";
  import { v1 as uuid } from "uuid";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Injectable()
  export class BoardsService {
    private readonly boards: Board[] = [];

    getAllBoards(): Board[] {
      return this.boards;
    }

    createBoard(createBoardDto: CreateBoardDto) {
      const { title, description } = createBoardDto;

      const board: Board = {
        id: uuid(),
        title,
        description,
        status: BoardStatus.PUBLIC
      };

      this.boards.push(board);

      return board;
    }
  }
  ```

  ```ts
  // board.controller.ts
  import { Body, Controller, Get, Post } from "@nestjs/common";
  import { BoardsService } from "./boards.service";
  import { Board } from "./board.model";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Post()
    createBoard(@Body() createBoardDto: CreateBoardDto): Board {
      return this.boardsService.createBoard(createBoardDto);
    }
  }
  ```

<br />

## ID로 특정 게시물 가져오기

- 파타미터를 사용해 특정 게시물 가져오기

  - @Param: parameter가 여러 개인 경우(@Param() params: string[])

  ```ts
  // board.service.ts
  import { Injectable } from "@nestjs/common";
  import { Board, BoardStatus } from "./board.model";
  import { v1 as uuid } from "uuid";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Injectable()
  export class BoardsService {
    private readonly boards: Board[] = [];

    // undefined 처리를 위해 강의와 다르게 string 반환 추가
    getBoardById(id: string): Board | string {
      const board = this.boards.find((board) => board.id === id);

      if (board) {
        return board;
      }

      return "해당 게시물을 찾을 수 없습니다.";
    }
  }
  ```

  ```ts
  // board.controller.ts
  import { Body, Controller, Get, Param, Post } from "@nestjs/common";
  import { BoardsService } from "./boards.service";
  import { Board } from "./board.model";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    // undefined 처리를 위해 강의와 다르게 string 반환 추가
    @Get("/:id")
    getBoardById(@Param("id") id: string): Board | string {
      return this.boardsService.getBoardById(id);
    }
  }
  ```

<br />

## ID로 특정 게시물 지우기

- 파타미터를 사용해 특정 게시물 삭제

  - boards 재할당을 위해 readonly 제거

  ```ts
  // board.service.ts
  import { Injectable } from "@nestjs/common";
  import { Board, BoardStatus } from "./board.model";
  import { v1 as uuid } from "uuid";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Injectable()
  export class BoardsService {
    private boards: Board[] = [];

    deleteBoard(id: string): void {
      this.boards = this.boards.filter((board) => board.id !== id);
    }
  }
  ```

  ```ts
  // board.controller.ts
  import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
  import { BoardsService } from "./boards.service";
  import { Board } from "./board.model";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Delete("/:id")
    deleteBoard(@Param("id") id: string): void {
      this.boardsService.deleteBoard(id);
    }
  }
  ```

<br />

## 특정 게시물의 상태 업데이트

- 공개 여부를 업데이트 하는 기능 구현

  - Board 타입 체크를 위해 instanceof 사용 -> 기존 Board interface를 class로 재정의

  ```ts
  // board.model.ts
  export class Board {
    constructor(
      public id: string,
      public title: string,
      public description: string,
      public status: BoardStatus
    ) {}
  }

  export enum BoardStatus {
    PUBLIC = "PUBLIC",
    PRIVATE = "PRIVATE"
  }
  ```

  <br />

  - Board | string에서 Board 타입 체크, createBoard 메서드 수정(클래스)

  ```ts
  // boards.service.ts
  import { Injectable } from "@nestjs/common";
  import { Board, BoardStatus } from "./board.model";
  import { v1 as uuid } from "uuid";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Injectable()
  export class BoardsService {
    private boards: Board[] = [];

    createBoard(createBoardDto: CreateBoardDto) {
      const { title, description } = createBoardDto;

      const board: Board = new Board(
        uuid(),
        title,
        description,
        BoardStatus.PUBLIC
      );
      this.boards.push(board);

      return board;
    }

    getBoardById(id: string): Board | string {
      const board = this.boards.find((board) => board.id === id);

      if (board) {
        return board;
      }

      return "해당 게시물을 찾을 수 없습니다.";
    }

    updateBoardStatus(id: string, status: BoardStatus): Board | string {
      const board: Board | string = this.getBoardById(id);

      if (board instanceof Board) {
        board.status = status;
        return board;
      }

      return board;
    }
  }
  ```

  ```ts
  // boards.controller.ts
  import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post
  } from "@nestjs/common";
  import { BoardsService } from "./boards.service";
  import { Board, BoardStatus } from "./board.model";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Patch("/:id/status")
    updateBoardStatus(
      @Param("id") id: string,
      @Body("status") status: BoardStatus
    ): Board | string {
      return this.boardsService.updateBoardStatus(id, status);
    }
  }
  ```
