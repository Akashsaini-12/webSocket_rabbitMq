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
        dbExchangeName = "db_ex", // Add database exchange name
        routingKeys = [],
        onConnect,
        onError,
        onMessage,
        onTypingStatus
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
        this.dbExchangeName = dbExchangeName; // Store database exchange name
        this.onTypingStatus = onTypingStatus;
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
                    if (messageData.type === "TYPING_STATUS") {
                        if (this.onTypingStatus) {
                            this.onTypingStatus(messageData);
                        }
                    } else {
                        if (this.onMessage) {
                            this.onMessage(messageData);
                        }
                    }
                    // if (this.onMessage) {
                    //     this.onMessage(messageData);
                    // }
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

            // Send to database exchange for persistence
            this.stompClient.publishMessage(
                `/exchange/${this.dbExchangeName}/db.message.save`,
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

    publishTypingStatus(isTyping, toUserId) {
        if (!this.stompClient?.connected) {
            throw new Error("Not connected to the message broker");
        }

        try {
            const typingMessage = {
                type: "TYPING_STATUS",
                from: this.userId,
                to: toUserId,
                isTyping: isTyping,
                timestamp: Date.now()
            };

            const routingKey = `chat.user.${toUserId}`;
            this.stompClient.publishMessage(
                `/exchange/${this.publishQueue}/${routingKey}`,
                JSON.stringify(typingMessage)
            );
        } catch (error) {
            console.error("Failed to publish typing status:", error);
            if (this.onError) {
                this.onError(error);
            }
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