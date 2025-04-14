export class Board {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public status: BoardStatus,
  ) {}
}

export enum BoardStatus {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}
