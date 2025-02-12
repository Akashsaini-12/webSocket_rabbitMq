import StompService from "./StompService";

// MessageService.js
class MessageService {
    constructor({
        url,
        vhost,
        login,
        passcode,
        heartbeatIncoming,
        heartbeatOutgoing,
        heartbeatQueue,
        subscribeQueue,
        publishQueue,
        userId,
        routingKey,
        groupRoutingKeys,
        exchangeName = "ex_common",
        routingKeys = [],
        onConnect,
        onError,
        onMessage
    }) {
        this.publishQueue = publishQueue;
        this.userId = userId;
        this.routingKey = routingKey;
        this.exchangeName = exchangeName;
        this.subscribeQueue = subscribeQueue;
        this.routingKeys = routingKeys;
        this.groupRoutingKeys = groupRoutingKeys;
        this.onConnect = onConnect;
        this.onError = onError;
        this.onMessage = onMessage;

        try {
            this.stompClient = new StompService(url, this.messageHandler.bind(this), {
                vhost,
                login,
                passcode,
                heartbeatIncoming,
                heartbeatOutgoing,
                heartbeatQueue,
            });

            this.stompClient.connect();
        } catch (error) {
            console.error("Failed to initialize StompService:", error);
            if (this.onError) {
                this.onError(error);
            }
        }
    }

    messageHandler(type, payload) {
        try {
            if (type === "stomp" && payload.type === "connected") {
                console.log("STOMP connected, creating subscriptions...");
                const routingKeys = JSON.parse(this.groupRoutingKeys);

                routingKeys.forEach((routingKey) => {
                    console.log(`Subscribing to routing key: ${routingKey}`);
                    this.stompClient.subscribe(
                        `/exchange/${this.publishQueue}/${routingKey}`,
                        {
                            "x-queue-name": this.subscribeQueue,
                            durable: "true",
                            "auto-delete": "true",
                        }
                    );
                });

                if (this.onConnect) {
                    this.onConnect();
                }
            } else if (type === "message" && payload.destination.startsWith("/exchange/ex_common")) {
                try {
                    const cleanBody = payload.body.replace(/\u0000/g, "").trim();
                    const messageData = JSON.parse(cleanBody);

                    if (this.onMessage) {
                        this.onMessage(messageData);
                    }
                } catch (err) {
                    console.error("Error parsing message body:", err);
                }
            } else if (type === "error") {
                console.error("STOMP error:", payload);
                if (this.onError) {
                    this.onError(new Error(payload.body || "STOMP error occurred"));
                }
            }
        } catch (error) {
            console.error("Error in message handler:", error);
            if (this.onError) {
                this.onError(error);
            }
        }
    }

    publish(message, routingKey) {
        if (!this.stompClient?.connected) {
            throw new Error("Not connected to the message broker");
        }

        try {
            if (!routingKey) {
                throw new Error("Routing key is required to publish a message");
            }

            const messageString = JSON.stringify(message);
            this.stompClient.publishMessage(
                `/exchange/${this.publishQueue}/${routingKey}`,
                messageString
            );

            return true;
        } catch (error) {
            console.error("Failed to publish message:", error);
            if (this.onError) {
                this.onError(error);
            }
            return false;
        }
    }

    disconnect() {
        if (this.stompClient) {
            this.stompClient.disconnect();
            this.stompClient = null;
        }
    }
}

export default MessageService;