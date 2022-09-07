import { HistoryModel, RequestModel } from '@prisma/client';

import { Database } from '../tools';

const { prisma } = Database;

export class History {
  public static async createHistory(
    request: RequestModel,
    props: {
      statusCode: number;
      body: string;
    }
  ): Promise<HistoryModel> {
    const { requestId } = request;
    const { statusCode } = props;
    const body = this.getPreviewText(props.body);
    const history = await prisma.historyModel.create({
      data: {
        requestId,
        statusCode,
        body,
      },
    });

    if (statusCode >= 200 && statusCode <= 300) {
      await prisma.requestModel.update({
        where: { requestId },
        data: { completedAt: new Date() },
      });
    }

    return history;
  }

  private static getPreviewText(str: string, limit = 100): string {
    if (str.length <= limit) return str;
    return str.substring(0, limit) + '...';
  }
}
