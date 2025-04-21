# 게시물에 접근하는 권한 처리

## 유저와 게시물의 관계 형성해 주기

- 관계를 형성하기 위해서 엔티티에 서로 간의 필드를 넣어줘야 함

  - OneToMany, ManyToOne 등

  - 파라미터

  ```
  1. Type: 관계 대상 엔티티 지정

  2. InverseSide: 역방향 필드 지정, 관계의 반대편에서 이 관계를 참조하는 필드를 지정 -> 양방향 관계에서 서로를 어떻게 참조할지 명확히 함

  3. Options: 관계 옵션, (eager: true) -> 엔티티를 조회할 때 자동으로 관계된 엔티티도 함께 조회
  ```

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

    @OneToMany((type) => Board, (board) => board.user, { eager: true })
    boards: Board[];
  }
  ```

  ```ts
  // board/board.entity.ts

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

    @ManyToOne((type) => User, (user) => user.boards, { eager: false })
    user: User;
  }
  ```

<br />

## 게시물을 생성할 때 유저 정보 넣어주기

```
1. 게시물 생성 요청
2. 헤더 안에 있는 토큰으로 유저 정보를 얻음
3. 유저 정보와 게시물 관계를 형성하며 게시물 생성

> controller, service, repository 수정
```

- controller에서 @GetUser 커스텀 데코레이터 사용

  ```ts
  // board/board.controller.ts
  @Controller("boards")
  @UseGuards(AuthGuard())
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Post()
    @UsePipes(ValidationPipe)
    createBoard(
      @Body() createBoardDto: CreateBoardDto,
      @GetUser() user: User
    ): Promise<Board> {
      return this.boardsService.createBoard(createBoardDto, user);
    }
  }
  ```

  <br />

  ```ts
  // board/board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    createBoard(createBoardDto: CreateBoardDto, user: User): Promise<Board> {
      return this.boardRepository.createBoard(createBoardDto, user);
    }
  }
  ```

  <br />

  ```ts
  // board/board.repository.ts
  @Injectable()
  export class BoardRepository extends Repository<Board> {
    // 커스텀 메서드를 추가하기 위한 표준 패턴
    constructor(private readonly dataSource: DataSource) {
      super(Board, dataSource.createEntityManager());
    }

    async createBoard(
      createBoardDto: CreateBoardDto,
      user: User
    ): Promise<Board> {
      const { title, description } = createBoardDto;

      const board = this.create({
        title,
        description,
        status: BoardStatus.PUBLIC,
        user
      });

      const savedBoard = await this.save(board);
      return savedBoard;
    }
  }
  ```

<br />

## 해당 유저의 게시물만 가져오기

- controller, service getAllBoards 메서드를 수정

  - repository에서 query 사용을 위해 createQueryBuilder 사용

  ```ts
  // board/board.controller.ts
  @Controller("boards")
  @UseGuards(AuthGuard())
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Get("/")
    getAllBoards(@GetUser() user: User): Promise<Board[]> {
      return this.boardsService.getAllBoards(user);
    }
  }
  ```

  <br />

  ```ts
  // board/board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    async getAllBoards(user: User): Promise<Board[]> {
      const query = this.boardRepository.createQueryBuilder("board");
      query.where("board.userId = :userId", { userId: user.id });

      const boards = await query.getMany();
      return boards;
    }
  }
  ```

- 레포지토리 패턴으로 코드 변경

  ```ts
  // board/board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    async getAllBoards(user: User): Promise<Board[]> {
      return this.boardRepository.findAllByUser(user);
    }
  }
  ```

  <br />

  ```ts
  // board/board.repository.ts
  @Injectable()
  export class BoardRepository extends Repository<Board> {
    // 커스텀 메서드를 추가하기 위한 표준 패턴
    constructor(private readonly dataSource: DataSource) {
      super(Board, dataSource.createEntityManager());
    }

    async findAllByUser(user: User): Promise<Board[]> {
      // 메서드 체이닝 사용
      return this.createQueryBuilder("board")
        .where("board.userId = :userId", { userId: user.id })
        .getMany();
    }
  }
  ```

<br />

## 자신이 생성한 게시물 삭제하기

- user 정보를 사용해 게시물과 user의 관계 확인

  ```ts
  // board/board.controller.ts
  @Controller("boards")
  @UseGuards(AuthGuard())
  export class BoardsController {
    constructor(private readonly boardsService: BoardsService) {}

    @Delete("/:id")
    deleteBoard(
      @Param("id", ParseIntPipe) id: number,
      @GetUser() user: User
    ): Promise<void> {
      return this.boardsService.deleteBoard(id, user);
    }
  }
  ```

  <br />

  ```ts
  // board/board.service.ts
  @Injectable()
  export class BoardsService {
    constructor(
      @InjectRepository(BoardRepository)
      private readonly boardRepository: BoardRepository
    ) {}

    async deleteBoard(id: number, user: User): Promise<void> {
      const result = await this.boardRepository.delete({ id, user });

      if (!result.affected) {
        throw new NotFoundException(`Can't found board with id ${id}`);
      }
    }
  }
  ```
