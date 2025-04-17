# 데이터베이스를 이용한 CRUD 구현

## 데이터베이스를 위한 소스 코드 정리

1. 기존 Service, Controller 주석 처리

2. Service의 boards 배열 제거

3. 게시물 데이터 정의를 위한 Entity를 사용하기에 Board Interface || class 제거

4. Status Enum은 파일로 분리 -> board-status.enum.ts

<br />

## ID를 이용해서 특정 게시물 가져오기

- Service에 Repository를 의존성 주입

  - @InjectRepository: repository 주입을 위해 데코레이터 사용

  ```ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}
  }
  ```

<br />

- Service에서 getBoardById 메서드 생성

  - typeORM에서 제공하는 findOneBy 메서드 사용

  - async-await를 이용해 데이터베이스 작업이 끝난 후 결과 값을 받을 수 있게 함

  ```ts
  // board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    async getBoardById(id: number): Promise<Board> {
      const found = await this.boardRepository.findOneBy({ id });

      if (!found) {
        throw new NotFoundException(`Can't fund board with id ${id}`);
      }

      return found;
    }
  }
  ```

  ```ts
  // board.controller.ts
  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Get("/:id")
    getBoardById(@Param("id") id: number): Promise<Board> {
      return this.boardsService.getBoardById(id);
    }
  }
  ```

<br />

## 게시물 생성하기

- service, controller 코드 작성

  ```ts
  // board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    async createBoard(createBoardDto: CreateBoardDto): Promise<Board> {
      const { title, description } = createBoardDto;

      const board = this.boardRepository.create({
        title,
        description,
        status: BoardStatus.PUBLIC
      });

      const savedBoard = await this.boardRepository.save(board);
      return savedBoard;
    }
  }
  ```

  ```ts
  // board.controller.ts
  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Post()
    @UsePipes(ValidationPipe)
    createBoard(@Body() createBoardDto: CreateBoardDto): Promise<Board> {
      return this.boardsService.createBoard(createBoardDto);
    }
  }
  ```

- 데이터베이스 관련된 로직은 Repository로 이동

  > Repository pattern 사용

  ```ts
  // board.repository.ts
  @Injectable()
  export class BoardRepository extends Repository<Board> {
    // 커스텀 메서드를 추가하기 위한 표준 패턴
    constructor(private readonly dataSource: DataSource) {
      super(Board, dataSource.createEntityManager());
    }

    async createBoard(createBoardDto: CreateBoardDto): Promise<Board> {
      const { title, description } = createBoardDto;

      const board = this.create({
        title,
        description,
        status: BoardStatus.PUBLIC
      });

      const savedBoard = await this.save(board);
      return savedBoard;
    }
  }
  ```

  - service에서는 repository 호출 형태로 변경

  ```ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    createBoard(createBoardDto: CreateBoardDto): Promise<Board> {
      return this.boardRepository.createBoard(createBoardDto);
    }
  }
  ```

<br />

## 게시물 삭제하기

- remove() vs delete()

  - remove: 무조건 존재하는 아이템을 remove 이용해서 제거, 아닌 경우 404 에러 반환

    - 아이템 유무 + 지우기 작업 -> 데이터베이스 두 번 접근

  - delete: 아이템이 존재하면 지우고 존재하지 않으면 아무런 영향이 없음 -> 사용 권장

    - 데이터베이스 한 번 접근

<br />

- service, controller 코드 작성

  ```ts
  // board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    async deleteBoard(id: number): Promise<void> {
      const result = await this.boardRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`Can't found board with id ${id}`);
      }
    }
  }
  ```

  - 파라미터를 숫자로 받기 위해 ParseIntPipe를 파라미터 레벨로 적용

  ```ts
  // board.controller.ts
  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Delete("/:id")
    deleteBoard(@Param("id", ParseIntPipe) id: number): Promise<void> {
      return this.boardsService.deleteBoard(id);
    }
  }
  ```

<br />

- 레포지토리 패턴 코드로 변경

  ```ts
  // board.repository.ts
  @Injectable()
  export class BoardRepository extends Repository<Board> {
    // 커스텀 메서드를 추가하기 위한 표준 패턴
    constructor(private readonly dataSource: DataSource) {
      super(Board, dataSource.createEntityManager());
    }

    async deleteById(id: number): Promise<number> {
      const result = await this.delete(id);

      return result.affected ?? 0;
    }
  }
  ```

  ```ts
  // board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    async deleteBoard(id: number): Promise<void> {
      const affected = await this.boardRepository.deleteById(id);

      if (affected === 0) {
        throw new NotFoundException(`Can't found board with id ${id}`);
      }
    }
  }
  ```

<br />

## 게시물 상태 업데이트하기

- service, controller 코드 작성

  - getBoardById 메서드를 사용해 게시물 존재 유/무 확인

  ```ts
  // board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    async updateBoardStatus(id: number, status: BoardStatus): Promise<Board> {
      const board = await this.getBoardById(id);

      board.status = status;

      const savedBoard = await this.boardRepository.save(board);

      return savedBoard;
    }
  }
  ```

  ```ts
  // board.controller.ts
  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Patch("/:id/status")
    updateBoardStatus(
      @Param("id", ParseIntPipe) id: number,
      @Body("status", BoardStatusValidationPipe) status: BoardStatus
    ): Promise<Board> {
      return this.boardsService.updateBoardStatus(id, status);
    }
  }
  ```

<br />

- 레포지토리 패턴 코드로 변경

  ```ts
  // board.repository.ts
  @Injectable()
  export class BoardRepository extends Repository<Board> {
    async updateStatusById(id: number, status: BoardStatus): Promise<Board> {
      const board = await this.findOneBy({ id });

      if (!board) {
        throw new NotFoundException(`Can't find board with id ${id}`);
      }

      board.status = status;
      return this.save(board);
    }
  }
  ```

  ```ts
  // board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    async updateBoardStatus(id: number, status: BoardStatus): Promise<Board> {
      return this.boardRepository.updateStatusById(id, status);
    }
  }
  ```

<br />

## 모든 게시물 가져오기

- service, controller 코드 작성

  ```ts
  // board.service.ts
  @Injectable()
  export class BoardRepository extends Repository<Board> {
    constructor(private readonly dataSource: DataSource) {
      super(Board, dataSource.createEntityManager());
    }

    async getAllBoards(): Promise<Board[]> {
      return this.boardRepository.find();
    }
  }
  ```

  ```ts
  // board.controller.ts
  @Controller("boards")
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Get("/")
    getAllBoards(): Promise<Board[]> {
      return this.boardsService.getAllBoards();
    }
  }
  ```

<br />

- 레포지토리 패턴 코드로 변경

  ```ts
  // board.repository.ts
  @Injectable()
  export class BoardRepository extends Repository<Board> {
    // 커스텀 메서드를 추가하기 위한 표준 패턴
    constructor(private readonly dataSource: DataSource) {
      super(Board, dataSource.createEntityManager());
    }

    async findAll(): Promise<Board[]> {
      return this.find();
    }
  }
  ```

  ```ts
  // board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    async getAllBoards(): Promise<Board[]> {
      return this.boardRepository.findAll();
    }
  }
  ```
