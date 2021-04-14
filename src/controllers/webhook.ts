import { Database } from '../tools';
import { WebhookModel } from '@prisma/client';

const { prisma } = Database;

export class Webhook {
  public static async getWebhook(
    webhookId: string
  ): Promise<WebhookModel | null> {
    const webhook = await prisma.webhookModel.findFirst({
      where: { webhookId },
    });

    return webhook;
  }
}
