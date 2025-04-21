import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import config from 'config';

const dbConfig = config.get<{
  type: 'mysql' | 'mariadb' | 'postgres' | 'mssql' | 'oracle' | 'mongodb';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
}>('db');

export const typeORMConfig: TypeOrmModuleOptions = {
  type: dbConfig.type,
  host: process.env.RDS_HOSTNAME ?? dbConfig.host,
  port: Number(process.env.RDS_PORT ?? dbConfig.port),
  username: process.env.RDS_USERNAME ?? dbConfig.username,
  password: process.env.PASSWORD ?? dbConfig.password,
  database: process.env.RDS_DB_NAME ?? dbConfig.database,
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  synchronize: dbConfig.synchronize, // 엔티티(Entity) 클래스의 변경사항을 데이터베이스 스키마에 자동으로 동기화
};
