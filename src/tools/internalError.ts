import * as Sentry from '@sentry/node';

import { OPCODE, logger } from '.';

export class InternalError extends Error {
  public name = 'InternalError';

  public constructor(
    public message: string,
    public opcode = OPCODE.ERROR,
    public details?: any
  ) {
    super();
  }

  public static async registerSentry(): Promise<void> {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      logger.warn('Error / Sentry를 활성화할 수 없습니다.');
      return;
    }

    Sentry.init({
      dsn,
      tracesSampleRate: 1.0,
      integrations: [new Sentry.Integrations.Http({ tracing: true })],
    });

    logger.info(`Error / Sentry가 활성화되었습니다. (DSN: ${dsn})`);
  }
}
