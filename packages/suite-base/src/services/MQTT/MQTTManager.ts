// MQTTManager.ts
import mqtt from "mqtt"; // Changed from namespace import to default import
import {
  IClientOptions,
  MqttClient,
  IClientPublishOptions,
  IClientSubscribeOptions,
  ISubscriptionGrant,
  IPublishPacket,
} from "mqtt";

interface MQTTManagerOptions extends IClientOptions {
  // 你可以在这里添加额外的自定义选项
}

export type MQTTConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error"
  | "offline";
type MessageHandler = (topic: string, payload: Buffer, packet: IPublishPacket) => void;

class MQTTManager {
  private static instance: MQTTManager | null = null;
  private client: MqttClient | null = null;
  private brokerUrl: string = "";
  private options?: MQTTManagerOptions;
  private connectionPromise: Promise<void> | null = null;
  private status: MQTTConnectionStatus = "disconnected";
  private messageHandlers: MessageHandler[] = [];

  // Private constructor to enforce singleton pattern
  private constructor(brokerUrl: string, options?: MQTTManagerOptions) {
    // 确保 brokerUrl 包含协议, e.g., 'mqtt://localhost:1883' or 'ws://localhost:9001'
    if (
      !brokerUrl.startsWith("mqtt://") &&
      !brokerUrl.startsWith("mqtts://") &&
      !brokerUrl.startsWith("ws://") &&
      !brokerUrl.startsWith("wss://")
    ) {
      console.warn(
        `Broker URL "${brokerUrl}" does not specify a protocol. Assuming "mqtt://" for non-WebSocket or "ws://" if port is common for WebSockets (e.g., 9001, 8080, 8083, 8084). You might need to specify it explicitly.`,
      );
      // 简单的启发式方法，可以根据需要调整
      if (
        brokerUrl.includes(":9001") ||
        brokerUrl.includes(":8080") ||
        brokerUrl.includes(":8083") ||
        brokerUrl.includes(":8084")
      ) {
        this.brokerUrl = `ws://${brokerUrl}`;
      } else {
        this.brokerUrl = `mqtt://${brokerUrl}`;
      }
    } else {
      this.brokerUrl = brokerUrl;
    }
    this.options = options; // Update options
    this.status = "disconnected";
    console.log(`MQTTManager (singleton) initialized for broker: ${this.brokerUrl}`);
  }

  // Static method to get or create the instance
  public static getInstance(brokerUrl?: string, options?: MQTTManagerOptions): MQTTManager {
    if (!MQTTManager.instance) {
      if (!brokerUrl) {
        throw new Error(
          "MQTTManager: brokerUrl is required for the first instantiation of the singleton.",
        );
      }
      MQTTManager.instance = new MQTTManager(brokerUrl, options);
    } else {
      if (
        brokerUrl &&
        MQTTManager.instance.brokerUrl !== brokerUrl &&
        MQTTManager.instance.status !== "disconnected"
      ) {
        console.warn(
          `MQTTManager singleton already initialized with broker ${MQTTManager.instance.brokerUrl} and might be active. Ignoring new URL ${brokerUrl}. To connect to a different broker, disconnect the current instance first or manage multiple instances if necessary.`,
        );
      } else if (
        brokerUrl &&
        MQTTManager.instance.brokerUrl !== brokerUrl &&
        MQTTManager.instance.status === "disconnected"
      ) {
        // If disconnected and a new URL is provided, re-initialize the existing instance's config for the next connect()
        console.log(
          `MQTTManager singleton was disconnected. Re-configuring for new broker URL: ${brokerUrl}`,
        );
        MQTTManager.instance.brokerUrl = brokerUrl; // Update brokerUrl for next connection
        MQTTManager.instance.options = options; // Update options
      }
    }
    return MQTTManager.instance;
  }

  /**
   * 连接到 MQTT broker.
   * 如果已经连接或正在连接，则返回现有的连接 Promise.
   * @returns Promise<void> 当连接成功时 resolve.
   */
  public async connect(): Promise<void> {
    if (this.client && this.client.connected) {
      this.status = "connected";
      console.log("MQTT client is already connected.");
      await Promise.resolve();
      return;
    }

    if (this.connectionPromise) {
      console.log("MQTT client is already attempting to connect or reconnecting.");
      await this.connectionPromise;
      return;
    }

    console.log(`Attempting to connect to MQTT broker at ${this.brokerUrl}`);
    this.status = "connecting";

    this.client = mqtt.connect(this.brokerUrl, this.options);

    this.connectionPromise = new Promise((resolve, reject) => {
      if (!this.client) {
        // 理论上不应该发生，因为上面刚赋值
        this.status = "error";
        reject(new Error("MQTT client initialization failed."));
        this.connectionPromise = null;
        return;
      }

      const clearConnectionAttempt = () => {
        // Only clear the promise if the current status indicates the attempt is truly over
        // and not transitioning into a 'reconnecting' state that might reuse/manage its own promise logic. // Update options
        if (this.status !== "reconnecting") {
          this.connectionPromise = null;
        }
      };
      // Update options
      this.client.on("connect", () => {
        this.status = "connected";
        console.log(`Successfully connected to MQTT broker: ${this.brokerUrl}`);
        resolve(undefined); // Explicitly resolve with undefined
        // 连接成功后，可以清除 connectionPromise，允许后续的 connect 调用（如果断开连接后）创建新的 Promise
        // 但通常情况下，我们希望保持连接，所以这里不清除。
        // 如果需要支持断开后重新调用 connect() 来获取新的 Promise，可以在这里设置 this.connectionPromise = null;
        // For now, resolve() fulfills this attempt. A new connect() call would create a new promise if connectionPromise is null.
      });

      this.client.on("error", (error) => {
        console.error("MQTT Connection Error:", error);
        // Only reject if this error is part of the current 'connecting' or 'reconnecting' attempt
        if (this.status === "connecting" || this.status === "reconnecting") {
          this.status = "error";
          reject(error);
        } else {
          // If an error occurs after connection, it might lead to 'close' or 'reconnect' // Update options
          this.status = "error";
        }
        clearConnectionAttempt();
      });

      this.client.on("close", () => {
        console.log(`MQTT connection to ${this.brokerUrl} closed.`);
        // If not already transitioning to 'reconnecting' or 'error', set to 'disconnected'.
        if (this.status !== "reconnecting" && this.status !== "error") {
          this.status = "disconnected";
        }
        // If not configured to auto-reconnect, the client instance can be considered done for this connection cycle.
        // However, `this.client` should only be nulled by an explicit `disconnect()` or if a new `connect()` call replaces it.
        // The mqtt.js client itself handles its state for potential reconnections.
        clearConnectionAttempt();
      });

      this.client.on("reconnect", () => {
        this.status = "reconnecting";
        console.log(`MQTT client reconnecting to ${this.brokerUrl}...`);
        // A new connectionPromise might be implicitly managed by the reconnect logic,
        // or a new call to connect() might be needed if the promise was cleared on 'close'.
        // For now, 'reconnecting' indicates an active attempt.
      });

      this.client.on("offline", () => {
        this.status = "offline";
        console.log(`MQTT client is offline from ${this.brokerUrl}.`);
        clearConnectionAttempt();
      });

      this.client.on("message", (topic, payload, packet) => {
        this.messageHandlers.forEach((handler) => {
          handler(topic, payload, packet);
        });
      });
    });

    await this.connectionPromise;
  }

  /**
   * 获取当前的 MQTT 客户端实例。
   * @returns MqttClient | null 如果已连接则返回客户端实例，否则返回 null。
   */
  public getClient(): MqttClient | null {
    return this.client;
  }

  /**
   * 获取当前连接状态。
   * @returns MQTTConnectionStatus
   */
  public getStatus(): MQTTConnectionStatus {
    return this.status;
  }
  /**
   * 检查客户端是否已连接。
   * @returns boolean
   */
  public isConnected(): boolean {
    return this.status === "connected";
  } // Update options

  /**
   * 发布消息到指定主题。
   * @param topic 主题
   * @param message 消息内容 (string or Buffer)
   * @param options 发布选项
   * @returns Promise<void> 当消息成功发布时 resolve.
   */
  public async publish(
    topic: string,
    message: string | Buffer,
    options?: IClientPublishOptions,
  ): Promise<void> {
    await new Promise((resolve, reject) => {
      if (!this.isConnected() || !this.client) {
        reject(new Error(`MQTT client is not connected. Cannot publish. Status: ${this.status}`));
        return; // Update options
      }
      this.client.publish(topic, message, options, (error: Error | undefined) => {
        if (error) {
          console.error(`Failed to publish message to topic "${topic}":`, error);
          reject(error);
        } else {
          // console.log(`Message published to topic "${topic}": ${message.toString()}`);
          resolve(undefined);
        } // Explicitly resolve with undefined
      });
    });
  }

  /**
   * 订阅一个或多个主题。
   * @param topic 主题或主题数组
   * @param options 订阅选项
   * @returns Promise<ISubscriptionGrant[]> 当订阅成功时 resolve.
   */
  public async subscribe(
    topic: string | string[],
    options?: IClientSubscribeOptions,
  ): Promise<ISubscriptionGrant[]> {
    return await new Promise((resolve, reject) => {
      if (!this.isConnected() || !this.client) {
        reject(new Error(`MQTT client is not connected. Cannot subscribe. Status: ${this.status}`)); // Update options
        return;
      }
      this.client.subscribe(topic, options || {}, (error: Error | undefined, granted) => {
        if (error) {
          console.error(`Failed to subscribe to topic/s "${topic}":`, error);
          reject(error);
        } else if (granted) {
          console.log(`Successfully subscribed to topic/s:`, granted);
          resolve(granted);
        }
      });
    });
  }

  /**
   * 取消订阅一个或多个主题。
   * @param topic 主题或主题数组
   * @param options 取消订阅选项 (较新版本的 mqtt.js 支持)
   * @returns Promise<void> 当取消订阅成功时 resolve.
   */
  public async unsubscribe(
    topic: string | string[],
    options?: mqtt.IClientSubscribeOptions,
  ): Promise<void> {
    await new Promise((resolve, reject) => {
      if (!this.isConnected() || !this.client) {
        reject(
          new Error(`MQTT client is not connected. Cannot unsubscribe. Status: ${this.status}`),
        ); // Update options
        return;
      }
      this.client.unsubscribe(topic, options || {}, (error: Error | undefined) => {
        if (error) {
          console.error(`Failed to unsubscribe from topic/s "${topic}":`, error);
          reject(error);
        } else {
          console.log(`Successfully unsubscribed from topic/s: "${topic}"`);
          resolve(undefined); // Explicitly resolve with undefined
        }
      });
    });
  }

  /**
   * 断开 MQTT 连接。
   * @param force 是否强制关闭，不等待未完成的消息 (默认为 false)
   * @param opts 断开连接的选项
   * @returns Promise<void> 当断开连接完成时 resolve.
   */
  public async disconnect(force: boolean = false, opts?: Record<string, any>): Promise<void> {
    await new Promise((resolve) => {
      if (this.client) {
        console.log("Disconnecting MQTT client...");
        // Set status before client.end, as the 'close' event might be async or not fire.
        this.status = "disconnected";
        this.client.end(force, opts, () => {
          console.log("MQTT client disconnected successfully.");
          // Callback from end() confirms closure.
          this.client = null;
          this.connectionPromise = null; // 清除连接 Promise
          resolve(undefined); // Explicitly resolve with undefined
        });
        // If the callback isn't guaranteed or for immediate state update:
        if (this.client && !this.client.disconnecting && !this.client.disconnected) {
          // If end() didn't immediately set these flags, ensure our status is correct.
        }
      } else {
        this.status = "disconnected";
        console.log("MQTT client is not connected, no need to disconnect."); // Explicitly resolve with undefined
        resolve(undefined);
      }
    });
  }

  /**
   * 注册消息处理器。
   * @param handler 回调函数 (topic: string, payload: Buffer, packet: IPublishPacket) => void
   */
  public onMessage(handler: MessageHandler): void {
    if (!this.messageHandlers.includes(handler)) {
      this.messageHandlers.push(handler);
    }
  }

  /**
   * 注销消息处理器。
   * @param handler - The handler function to remove.
   */
  public offMessage(handler: MessageHandler): void {
    this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
  }
}

export default MQTTManager;

// 如何使用示例:
/*
async function main() {
  // 对于 WebSocket 连接，URL 类似于 'ws://your-broker-address:port'
  // 例如，如果你的 getIpAddress 返回 "10.51.129.39:9000"
  // 那么 brokerUrl 应该是 "ws://10.51.129.39:9000"
  // const mqttManager = new MQTTManager('ws://localhost:9001', { // 使用你的 broker 地址
  // Corrected usage for singleton:
  const mqttManager = MQTTManager.getInstance('ws://localhost:9001', { // 使用你的 broker 地址
    clientId: `mqtt_manager_${Math.random().toString(16).slice(2, 10)}`,
    // 其他 MQTT 选项:
    // username: 'user',
    // password: 'password',
    // keepalive: 60,
    // reconnectPeriod: 1000, // 重连间隔 (ms)
    // connectTimeout: 30 * 1000, // 连接超时 (ms)
  });

  try {
    await mqttManager.connect();
    console.log("MQTT Manager status:", mqttManager.getStatus());
    console.log("MQTT Manager connected successfully.");

    // 获取客户端实例 (如果需要直接操作)
    const client = mqttManager.getClient();
    if (client) {
      // 你可以直接使用 client 对象进行更复杂的操作
      // client.on('message', (topic, payload) => { ... });
    }

    // 订阅主题
    await mqttManager.subscribe('test/topic');
    await mqttManager.subscribe(['another/topic', 'yet/another/topic']);


    // 注册消息处理器
    const messageHandler = (topic: string, payload: Buffer) => {
      console.log(`[MQTTManager] Received message on topic "${topic}": ${payload.toString()}`);
    });

    // 发布消息
    await mqttManager.publish('test/topic', 'Hello from MQTTManager!');
    await mqttManager.publish('another/topic', JSON.stringify({ data: 'some value' }));

    // 模拟一段时间后断开连接
    // setTimeout(async () => {
    //   console.log("Disconnecting MQTT Manager...");
    //   await mqttManager.disconnect();
    //   console.log("MQTT Manager status after disconnect:", mqttManager.getStatus());
    //   console.log("MQTT Manager disconnected.");
    //   // To remove the handler:
    //   // mqttManager.offMessage(messageHandler);
    // }, 10000);

  } catch (error) {
    console.error("Failed to connect or operate MQTT Manager:", error);
  }
}

// main(); // 取消注释以运行示例
*/
