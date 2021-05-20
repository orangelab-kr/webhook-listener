import { History } from './history';
import { RequestModel } from '@prisma/client';
import { Webhook } from './webhook';
import amqplib from 'amqplib';
import got from 'got';
import { logger } from '../tools';

export class Listener {
  public readonly exchange = 'requests';
  public amqp?: amqplib.Connection;
  public channel?: amqplib.Channel;
  private hostname: string;
  private username: string;
  private password: string;
  private vhost: string;

  public constructor(props: {
    hostname: string;
    username: string;
    password: string;
    vhost: string;
  }) {
    this.hostname = props.hostname;
    this.username = props.username;
    this.password = props.password;
    this.vhost = props.vhost;
  }

  /** RabbitMQ 연결 후 이벤트를 등록합니다. */
  public async connect(): Promise<void> {
    const { hostname, username, password, vhost } = this;
    this.amqp = await amqplib.connect({ hostname, username, password, vhost });
    this.channel = await this.amqp.createChannel();
  }

  /** RabbitMQ 분산화 처리를 위한 용도로 사용됩니다. */
  public async setSubscribe(queue: string, maxQueue = 0): Promise<void> {
    if (!this.amqp || !this.channel) return;
    await this.channel.prefetch(maxQueue);
    await this.channel.assertExchange(this.exchange, 'topic');
    await this.channel.assertQueue(queue, {});
    await this.channel.bindQueue(queue, this.exchange, '#');
    this.channel.consume(queue, this.onMessage.bind(this));
  }

  /** RabbitMQ 이벤트 리스너입니다. */
  private async onMessage(
    message: amqplib.ConsumeMessage | null
  ): Promise<void> {
    if (!message || !this.channel) return;
    const version = process.env.npm_package_version;
    const request: RequestModel = JSON.parse(message.content.toString());
    request.data = JSON.parse(request.data.toString());

    const webhook = await Webhook.getWebhook(request.webhookId);
    if (!webhook) return;

    const res = await got({
      method: 'POST',
      url: webhook.url,
      throwHttpErrors: false,
      json: request,
      headers: {
        'User-Agent': `hikick-webhook/${version} (http://hikick.kr)`,
        'X-Webhook-Request-Id': request.requestId,
      },
    });

    const { statusCode, body } = res;
    await History.createHistory(request, { statusCode, body });
    if (message.fields.redelivered) {
      this.channel.ack(message);
      logger.error(
        `${request.requestId}(${webhook.url}) - 웹훅 요청을 처리하지 못했습니다.`
      );

      return;
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      this.channel.nack(message, true, true);
      logger.warn(
        `${request.requestId}(${webhook.url}) - 웹훅 요청에 실패하였습니다. (재시도 예정)`
      );

      return;
    }

    this.channel.ack(message);
    logger.info(
      `${request.requestId}(${webhook.url}) - 웹훅 요청을 완료했습니다.`
    );
  }
}
