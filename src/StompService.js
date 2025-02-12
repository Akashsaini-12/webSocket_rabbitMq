import WebSocketService from "./WebSocketService";

class StompService {
    constructor(url, messageHandler, config = {}) {
        this.messageHandler = messageHandler;
        this.subscriptions = new Map();
        this.connected = false;

        // Default config with overrides
        this.config = {
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            heartbeatQueue: "/exchange/ex_presence",
            vhost: "/",
            login: "myuser",
            passcode: "mypassword",

            ...config,
        };

        this.heartbeatInterval = null;
        this.wsService = new WebSocketService(
            url,
            this.handleWebSocketMessage.bind(this)
        );
    }

    connect(credentials = {}) {
        this.config = { ...this.config, ...credentials };
        this.wsService.connect();
    }

    handleWebSocketMessage(type, payload) {
        if (type === "connection") {
            if (payload.status === "connected") {
                this.sendStompConnect();
            }
            this.notifyHandler("connection", payload);
        } else if (type === "message") {
            this.handleStompFrame(payload);
        }
    }

    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            // Send heartbeat frame
            this.sendFrame({
                command: "SEND",
                headers: {
                    destination: this.config.heartbeatQueue,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    type: "heartbeat",
                    timestamp: Date.now(),
                }),
            });
        }, this.config.heartbeatOutgoing);

        // Subscribe to heartbeat queue
        this.subscribe(this.config.heartbeatQueue, {
            "x-queue-name": `heartbeat-${Date.now()}`,
            durable: "false",
            "auto-delete": "true",
            exclusive: "true",
        });
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    sendStompConnect() {
        const frame = {
            command: "CONNECT",
            headers: {
                "accept-version": "1.2",
                host: this.config.vhost,
                login: this.config.login,
                passcode: this.config.passcode,
                "heart-beat": `${this.config.heartbeatOutgoing},${this.config.heartbeatIncoming}`,
            },
        };
        this.sendFrame(frame);
    }

    handleStompFrame(frame) {
        const { command, headers, body } = StompFrameParser.parse(frame);

        switch (command) {
            case "CONNECTED":
                this.connected = true;
                this.notifyHandler("stomp", {
                    type: "connected",
                    headers,
                });
                this.startHeartbeat();
                break;

            case "MESSAGE":
                const destination = headers.destination;
                const subscription = this.subscriptions.get(headers.subscription);

                this.notifyHandler("message", {
                    destination,
                    subscription,
                    headers,
                    body,
                });
                break;

            case "ERROR":
                this.notifyHandler("error", {
                    headers,
                    body,
                });
                break;
        }
    }

    subscribe(destination, headers = {}) {
        if (!this.connected) {
            throw new Error("Not connected");
        }

        const id = `sub-${Math.random().toString(36).substr(2, 9)}`;
        const subscriptionHeaders = {
            id: id,
            destination: destination,
            ack: "auto",
            ...headers,
        };

        this.subscriptions.set(id, {
            id,
            destination,
            headers: subscriptionHeaders,
        });

        this.sendFrame({
            command: "SUBSCRIBE",
            headers: subscriptionHeaders,
        });

        return id;
    }

    unsubscribe(id) {
        if (!this.subscriptions.has(id)) return;

        this.sendFrame({
            command: "UNSUBSCRIBE",
            headers: { id },
        });

        this.subscriptions.delete(id);
    }
    addBindings(queueName, exchangeName, routingKeys) {
        if (!this.connected) {
            throw new Error("Not connected");
        }

        // Handle both single key or array of keys
        const keys = Array.isArray(routingKeys) ? routingKeys : [routingKeys];

        keys.forEach((routingKey) => {
            this.sendFrame({
                command: "SEND",
                headers: {
                    destination: "/exchange/amq.direct",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    queue: queueName,
                    exchange: exchangeName,
                    routingKey: routingKey,
                }),
            });
        });
    }
    addSingleBindings(queueName, exchangeName, routingKey) {
        if (!this.connected) {
            throw new Error("Not connected");
        }

        this.sendFrame({
            command: "SEND",
            headers: {
                // Update the destination to use the correct exchange
                destination: "/exchange/amq.direct",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                queue: queueName,
                exchange: exchangeName,
                routingKey: routingKey,
            }),
        });
    }

    removeBindings(queueName, exchangeName, routingKeys) {
        if (!this.connected) {
            throw new Error("Not connected");
        }

        // Handle both single key or array of keys
        const keys = Array.isArray(routingKeys) ? routingKeys : [routingKeys];

        keys.forEach((routingKey) => {
            this.sendFrame({
                command: "SEND",
                headers: {
                    destination: "/exchange/amq.direct",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    command: "unbind",
                    queue: queueName,
                    exchange: exchangeName,
                    routingKey: routingKey,
                }),
            });
        });
    }
    publish(destination, body, headers = {}) {
        if (!this.connected) {
            throw new Error("Not connected");
        }
        const messageBody = typeof body === "string" ? body : JSON.stringify(body);
        const messageHeaders = {
            destination: destination,
            "content-type": "application/json",
            "content-length": messageBody.length.toString(),
            ...headers,
        };

        this.sendFrame({
            command: "SEND",
            headers: messageHeaders,
            body: messageBody,
        });
    }

    publishMessage(destination, body, headers = {}) {
        console.debug("Publish method called with:", {
            destination,
            body,
            headers,
        });
        if (!this.connected) {
            throw new Error("Not connected");
        }

        if (!destination) {
            throw new Error("Destination is required");
        }

        if (!body) {
            throw new Error("Message body is required");
        }

        // Serialize the body
        const messageBody = typeof body === "string" ? body : JSON.stringify(body);
        console.debug("Serialized message body:", messageBody);

        // Prepare headers
        const messageHeaders = {
            destination: destination,
            "content-type": "application/json",
            "content-length": messageBody.length.toString(),
            ...headers,
        };
        console.debug("Constructed message headers:", messageHeaders);

        // Send the frame
        this.sendFrame({
            command: "SEND",
            headers: messageHeaders,
            body: messageBody,
        });
    }

    sendFrame({ command, headers = {}, body = "" }) {
        const frame =
            [
                command,
                ...Object.entries(headers).map(([key, value]) => `${key}:${value}`),
                "",
                body,
            ].join("\n") + "\0";

        this.wsService.sendMessage(frame);
    }

    disconnect() {
        this.stopHeartbeat();
        if (this.connected) {
            this.sendFrame({ command: "DISCONNECT" });
            this.connected = false;
        }
        this.subscriptions.clear();
        this.wsService.disconnect();
    }

    notifyHandler(type, payload) {
        if (this.messageHandler) {
            this.messageHandler(type, payload);
        }
    }
}

class StompFrameParser {
    static parse(rawFrame) {
        const frame = rawFrame.replace(/\0$/, "");
        const lines = frame.split("\n");
        const command = lines[0];
        const headers = {};
        let body = "";

        let i = 1;
        while (i < lines.length && lines[i]) {
            const [key, value] = lines[i].split(":");
            if (key && value) {
                headers[key.trim()] = value.trim();
            }
            i++;
        }

        if (i < lines.length - 1) {
            body = lines
                .slice(i + 1)
                .join("\n")
                .trim();
            if (headers["content-type"]?.includes("json")) {
                try {
                    body = JSON.parse(body);
                } catch {
                    // Keep as string if JSON parse fails
                }
            }
        }

        return { command, headers, body };
    }
}

export default StompService;
