# Pipe 이용

## NestJS Pipes

- 파이프(Pipe)

  - @Injectable 데코레이터로 주석이 달린 클래스

  - 데이터 변형(Data Transformation), 유효성 검사(Data Validation)를 위해서 사용

  - 라우터 핸들러(Router Handler)가 처리하는 인수에 대해 작동

  - Nest는 메서드가 호출되기 직전에 파이프를 삽입하고 파이프는 메서드로 향하는 인수를 수신하고 이에 대해 작동함

  ```
  1. client 요청 -> 파이프

  2. 파이프 성공 -> 컨트롤러 -> 서비스 -> 컨트롤러 -> client 응답

  3. 파이프 실패 -> error
  ```

<br />

- 데이터 변형(Data Transformation)

  - 입력 데이터를 원하는 형식으로 변환 -> ex) 문자열 -> 정수

  ```
  String to Integer
  "7" -> 7
  ```

<br />

- 유효성 검사(Data Validation)

  - 입력 데이터를 검사하고 유효한 경우 변경되지 않은 상태로 전달

<br />

- 파이프 사용 방법(Binding Pipes)

  1. Handler-level Pipes

     - @UsePipes() 데코레이터를 이용해 사용

     - 모든 파라미터에 적용

     ```ts
     @Post
     @UsePipes(pipe)
     createBoard(@Body("title") title: string, @Body("description") description: string) {}
     ```

  <br />

  2. Parameter-level Pipes

     - 특정한 파라미터에만 적용되는 파이프

     ```ts
     @Post
     createBoard(@Body("title", ParameterPipe) title: string, @Body("description") description: string) {}
     ```

  <br />

  3. Global-level Pipes

     - 애플리케이션 레벨의 파이프

     - 클라이언트에서 들어오는 모든 요청에 적용

     - 가장 상단 영역인 main.ts에 적용

     ```ts
     async function bootstrap() {
       const app = await NestFactory.create(AppModule);
       app.useGlobalPipes(GlobalPipes);
       await app.listen(3000);
     }

     bootstrap();
     ```

<br />

- Built-in Pipes

  - NestJS가 제공하는 기본 파이프(6개)

  ```
  1. ValidationPipe

  2. ParseIntPipe

  3. ParseBoolPipe

  4. ParseArrayPipe

  5. ParseUUIDPipe

  6. DefaultValuePipe

  > 이름을 통해 파이프의 역할 추론 가능
  ```

<br />

- ParseIntPipe를 이용해 파이프 체험

  - 파라미터 값으로 숫자가 아닌 abc와 같은 문자열을 보낼 경우 에러 발생

  ```ts
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return;
  }
  ```

<br />

## 파이프를 이용한 유효성 체크

- 필요 모듈 설치

  - class-Validator: 데이터 유효성 검사(DTO에 대한 입력값 검증), 데코레이터(@IsString(), @MaxLength(30))로 조건을 명시

  - class-transformer: 데이터 변환(객체 -> 인스턴스 변환 / 타입 강제 변환 / 직렬화, 역직렬화)

  ```shell
  $ npm i -D class-validator class-transformer
  ```

<br />

- 파이프 생성

  - 게시물 생성할 때 빈값일 때 문제없이 생성되는 부분을 파이프 적용해 수정

    1. dto에 데코레이터 추가

    2. controller에 핸들러 레벨로 파이프 등록

  ```ts
  // dto/create-board.dto.ts
  import { IsNotEmpty } from "class-validator";

  export class CreateBoardDto {
    @IsNotEmpty()
    title: string;

    @IsNotEmpty()
    description: string;
  }
  ```

  ```ts
  // board.controller.ts
  import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UsePipes,
    ValidationPipe
  } from "@nestjs/common";
  import { BoardsService } from "./boards.service";
  import { Board, BoardStatus } from "./board.model";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Post()
    @UsePipes(ValidationPipe)
    createBoard(@Body() createBoardDto: CreateBoardDto): Board {
      return this.boardsService.createBoard(createBoardDto);
    }
  }
  ```

<br />

## 특정 게시물을 찾을 때 없는 경우 결과 값 처리

- NotFoundException 예외 인스턴스 사용

- service단에서 처리

  ```ts
  import { Injectable, NotFoundException } from "@nestjs/common";
  import { Board, BoardStatus } from "./board.model";
  import { v1 as uuid } from "uuid";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Injectable()
  export class BoardsService {
    private boards: Board[] = [];

    getBoardById(id: string): Board {
      const found = this.boards.find((board) => board.id === id);

      if (!found) {
        throw new NotFoundException();
      }

      return found;
    }
  }
  ```

  <br />

  - 에러 문구 변경

  ```ts
  throw new NotFoundException(`Can't find Board with id ${id}`);
  ```

<br />

## 없는 게시물을 지우려 할 때 결과 값 처리

- getBoardById를 이용해 게시물 존재 여부 확인

  ```ts
  import { Injectable, NotFoundException } from "@nestjs/common";
  import { Board, BoardStatus } from "./board.model";
  import { v1 as uuid } from "uuid";
  import { CreateBoardDto } from "./dto/create-board.dto";

  @Injectable()
  export class BoardsService {
    private boards: Board[] = [];

    getBoardById(id: string): Board {
      const found = this.boards.find((board) => board.id === id);

      if (!found) {
        throw new NotFoundException(`Can't find Board with id ${id}`);
      }

      return found;
    }

    deleteBoard(id: string): void {
      const found = this.getBoardById(id);

      this.boards = this.boards.filter((board) => board.id !== found.id);
    }
  }
  ```

<br />

## 커스텀 파이프를 이용한 유효성 체크

- 커스텀 파이프 구현 방법

  - PipeTransform 인터페이스를 새롭게 만들어 커스텀 파이프 구현

  > PipeTransform: 모든 파이프에서 구현해줘야 하는 인터페이스<br/>
  > 모든 파이프는 transform 메서드를 필요로 함 -> 인자를 처리하기 위해 사용됨

  - transform(현재 파이프가 처리하는 인자의 실제 값(value), 인자에 대한 추가 정보를 포함한 객체): return 된 값은 Route 핸들러로 전달됨

  ```ts
  import { ArgumentMetadata, PipeTransform } from "@nestjs/common";

  export class BoardStatusValidationPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
      console.log("value: ", value);
      console.log("metadata: ", metadata);

      return value;
    }
  }
  ```

<br />

- 게시물 업데이트에서 유효성 검사

  - 파라미터 레벨에서 파이프 설정

  ```ts
  // pipes/board-status-validation.pipe.ts
  import { ArgumentMetadata, PipeTransform } from "@nestjs/common";

  export class BoardStatusValidationPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
      console.log("value: ", value);
      console.log("metadata: ", metadata);

      return value;
    }
  }
  ```

  ```ts
  // board.controller.ts
  import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UsePipes,
    ValidationPipe
  } from "@nestjs/common";
  import { BoardsService } from "./boards.service";
  import { Board, BoardStatus } from "./board.model";
  import { CreateBoardDto } from "./dto/create-board.dto";
  import { BoardStatusValidationPipe } from "./pipes/board-status-validation.pipe";

  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Patch("/:id/status")
    updateBoardStatus(
      @Param("id") id: string,
      @Body("status", BoardStatusValidationPipe) status: BoardStatus
    ): Board | string {
      return this.boardsService.updateBoardStatus(id, status);
    }
  }
  ```

<br />

- 커스텀 파이프 실제 기능 구현

  - 상태(status)는 PUBLIC || PRIVATE -> 이외의 값이 오면 예외 처리

  - 인자의 타입을 string으로 수정한 후 타입 단언 적용

  ```ts
  import { BadRequestException, PipeTransform } from "@nestjs/common";
  import { BoardStatus } from "../board.model";

  export class BoardStatusValidationPipe implements PipeTransform {
    readonly StatusOptions = [BoardStatus.PUBLIC, BoardStatus.PRIVATE];

    transform(value: string): BoardStatus {
      value = value.toUpperCase();

      if (!this.isStatusValid(value)) {
        throw new BadRequestException(`${value} isn't in the status options`);
      }

      return value as BoardStatus;
    }

    private isStatusValid(status: string) {
      const index = this.StatusOptions.indexOf(status as BoardStatus);
      return index !== -1;
    }
  }
  ```

  <br />

  - 타입 가드를 사용 코드

    - 타입 가드: 조건이 true일 때 해당 변수의 타입을 명시적으로 좁혀주는 TypeScript의 기능

  ```ts
  import { BadRequestException, PipeTransform } from "@nestjs/common";
  import { BoardStatus } from "../board.model";

  export class BoardStatusValidationPipe implements PipeTransform {
    readonly StatusOptions = [BoardStatus.PUBLIC, BoardStatus.PRIVATE];

    transform(value: string): BoardStatus {
      value = value.toUpperCase();
      if (!this.isStatusValid(value)) {
        throw new BadRequestException(`${value} isn't in the status options`);
      }
      return value;
    }

    // 반환 값이 true일 때 status의 타입을 string에서 BoardStatus로 변환
    private isStatusValid(status: string): status is BoardStatus {
      return this.StatusOptions.includes(status as BoardStatus);
    }
  }
  ```
