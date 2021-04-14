import * as Sentry from '@sentry/node';

import { Database, InternalError, logger } from './tools';

import { Listener } from './controllers';

export * from './controllers';
export * from './tools';

async function main() {
  try {
    logger.info('[Main] 시스템이 활성화되고 있습니다.');
    InternalError.registerSentry();

    await Database.connect();
    const service = await connect();
    await service.setSubscribe(
      process.env.WEBHOOK_SERVICE_QUEUE || 'all',
      Number(process.env.WEBHOOK_SERVICE_MAX_QUEUE || 100)
    );

    logger.info('[Main] 시스템이 준비되었습니다.');
  } catch (err) {
    logger.error('[Service] 시스템을 활성화할 수 없습니다.');
    logger.error(`[Service] ${err.stack}`);
    Sentry.captureException(err);
    process.exit(1);
  }
}

async function connect(): Promise<Listener> {
  try {
    const listener = new Listener({
      hostname: String(process.env.WEBHOOK_SERVICE_HOSTNAME),
      username: String(process.env.WEBHOOK_SERVICE_USERNAME),
      password: String(process.env.WEBHOOK_SERVICE_PASSWORD),
      vhost: String(process.env.WEBHOOK_SERVICE_VHOST),
    });

    await listener.connect();
    logger.info('[Service] 성공적으로 웹훅 서비스와 연결되었습니다.');

    return listener;
  } catch (err) {
    logger.error('[Service] 웹훅 서비스와 연결에 실패하였습니다.');
    throw Error('웹훅 서비스와 연결에 실패하였습니다.');
  }
}

main();
