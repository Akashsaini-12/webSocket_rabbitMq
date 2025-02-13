class WebSocketService {
    constructor(url, messageHandler, options = {}) {
        // this.url = url;
        // this.messageHandler = messageHandler;
        // this.ws = null;
        // this.isConnecting = false;
        // this.reconnectTimeout = null;
        // this.isDisconnected = true;
        // this.reconnectInterval = options.reconnectInterval || 3000;
        this.url = url;
        this.messageHandler = messageHandler;
        this.ws = null;
        this.reconnectAttempts = 0;

    }

    connect() {
        if (this.isConnecting) return;

        this.isDisconnected = false;
        this.attemptConnection();
    }

    attemptConnection() {
        if (this.isDisconnected || this.isConnecting) return;

        this.cleanup();
        this.isConnecting = true;

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.isConnecting = false;
                this.notifyHandler("connection", { status: "connected" });
            };

            this.ws.onclose = (event) => {
                this.notifyHandler("connection", {
                    status: "disconnected",
                    code: event.code,
                    reason: event.reason,
                });
                this.cleanup();

                if (!this.isDisconnected) {
                    this.handleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                this.notifyHandler("connection", {
                    status: "error",
                    error: error.message || "WebSocket error occurred",
                });
            };

            this.ws.onmessage = (event) => {
                this.notifyHandler("message", event.data);
            };
        } catch (error) {
            this.notifyHandler("connection", {
                status: "error",
                error: error.message,
            });
            this.cleanup();
            if (!this.isDisconnected) {
                this.handleReconnect();
            }
        }

        return this.ws;
    }

    sendMessage(payload) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.notifyHandler("connection", { error: "WebSocket not connected" });
            return false;
        }

        try {
            const message =
                typeof payload === "string" ? payload : JSON.stringify(payload);
            this.ws.send(message);
            return true;
        } catch (error) {
            this.notifyHandler("connection", { error: error.message });
            return false;
        }
    }

    handleReconnect() {
        if (this.isDisconnected) return;

        this.notifyHandler("connection", {
            status: "reconnecting",
            nextAttemptIn: this.reconnectInterval,
        });

        this.reconnectTimeout = setTimeout(() => {
            this.attemptConnection();
        }, this.reconnectInterval);
    }

    disconnect() {
        this.isDisconnected = true;

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close(1000, "Client disconnected");
        }
        this.cleanup();
    }

    cleanup() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            this.ws.onopen = null;

            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000);
            }
        }

        this.isConnecting = false;
        this.ws = null;
    }

    notifyHandler(type, payload) {
        if (this.messageHandler) {
            this.messageHandler(type, payload);
        }
    }
}

export default WebSocketService;
