import { DataSource, Repository } from 'typeorm';
import { Board } from './board.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBoardDto } from './dto/create-board.dto';
import { BoardStatus } from './board-status.enum';
import { User } from 'src/auth/user.entity';

@Injectable()
export class BoardRepository extends Repository<Board> {
  // 커스텀 메서드를 추가하기 위한 표준 패턴
  constructor(private readonly dataSource: DataSource) {
    super(Board, dataSource.createEntityManager());
  }

  async findAll(): Promise<Board[]> {
    return this.find();
  }

  async findAllByUser(user: User): Promise<Board[]> {
    return this.createQueryBuilder('board')
      .where('board.userId = :userId', { userId: user.id })
      .getMany();
  }

  async createBoard(
    createBoardDto: CreateBoardDto,
    user: User,
  ): Promise<Board> {
    const { title, description } = createBoardDto;

    const board = this.create({
      title,
      description,
      status: BoardStatus.PUBLIC,
      user,
    });

    const savedBoard = await this.save(board);
    return savedBoard;
  }

  async deleteById(id: number): Promise<number> {
    const result = await this.delete(id);

    return result.affected ?? 0;
  }

  async updateStatusById(id: number, status: BoardStatus): Promise<Board> {
    const board = await this.findOneBy({ id });

    if (!board) {
      throw new NotFoundException(`Can't find board with id ${id}`);
    }

    board.status = status;
    return this.save(board);
  }
}
