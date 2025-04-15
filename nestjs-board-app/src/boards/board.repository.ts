import { DataSource, Repository } from 'typeorm';
import { Board } from './board.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BoardRepository extends Repository<Board> {
  // 커스텀 메서드를 추가하기 위한 표준 패턴
  constructor(private readonly dataSource: DataSource) {
    super(Board, dataSource.createEntityManager());
  }
}
