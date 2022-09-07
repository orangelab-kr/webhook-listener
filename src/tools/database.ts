import { PrismaClient } from '@prisma/client';
import { logger } from '.';

export class Database {
  public static prisma = new PrismaClient();

  public static async connect(): Promise<void> {
    try {
      Database.prisma.$connect();
      logger.info('Database / 데이터베이스와 연결되었습니다.');
    } catch (err: any) {
      logger.error('Database / 데이터베이스에 연결할 수 없습니다.');
      throw err;
    }
  }
}
