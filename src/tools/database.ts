import { PrismaClient } from '@prisma/client';
import { logger } from '.';

export class Database {
  public static prisma = new PrismaClient();

  public static async connect(): Promise<void> {
    try {
      Database.prisma.$connect();
      Database.prisma.$use(async (params, next) => {
        const bypassSoftDeleted: string[] = ['PermissionModel'];
        if (params.model && !bypassSoftDeleted.includes(params.model)) {
          if (!['create', 'update', 'upsert'].includes(params.action)) {
            if (!params.args.where) params.args.where = {};
            delete params.args.where['deletedAt'];
          }

          if (['delete', 'deleteMany'].includes(params.action)) {
            switch (params.action) {
              case 'delete':
                params.action = 'update';
                break;
              case 'deleteMany':
                params.action = 'updateMany';
                break;
            }

            if (!params.args.data) params.args.data = {};
            params.args.data['deletedAt'] = new Date();
          }
        }

        return next(params);
      });

      logger.info('Database / 데이터베이스와 연결되었습니다.');
    } catch (err: any) {
      logger.error('Database / 데이터베이스에 연결할 수 없습니다.');
      throw err;
    }
  }
}
