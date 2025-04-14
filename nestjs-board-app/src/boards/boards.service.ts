import { Injectable } from '@nestjs/common';
import { Board, BoardStatus } from './board.model';
import { v1 as uuid } from 'uuid';
import { CreateBoardDto } from './dto/create-board.dto';

@Injectable()
export class BoardsService {
  private boards: Board[] = [];

  getAllBoards(): Board[] {
    return this.boards;
  }

  createBoard(createBoardDto: CreateBoardDto) {
    const { title, description } = createBoardDto;

    const board: Board = new Board(
      uuid(),
      title,
      description,
      BoardStatus.PUBLIC,
    );
    this.boards.push(board);

    return board;
  }

  getBoardById(id: string): Board | string {
    const board = this.boards.find((board) => board.id === id);

    if (board) {
      return board;
    }

    return '해당 게시물을 찾을 수 없습니다.';
  }

  deleteBoard(id: string): void {
    this.boards = this.boards.filter((board) => board.id !== id);
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
