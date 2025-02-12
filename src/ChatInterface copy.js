import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, User, Users } from "lucide-react";
import "./ChatInterface.css";

const ChatInterface = ({
    currentUserId = "user1",
    url = "ws://localhost:15674/ws",
    vhost = "/",
    login = "myuser",
    passcode = "mypassword",
    exchangeName = "ex_common",
}) => {
    const [messages, setMessages] = useState([]);
    const [connected, setConnected] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [selectedUser, setSelectedUser] = useState("");
    const [error, setError] = useState("");
    const stompClientRef = useRef(null);
    const messagesEndRef = useRef(null);

    const users = [
        { id: "user1", name: "User 1" },
        { id: "user2", name: "User 2" },
        { id: "user3", name: "User 3" },
    ];

    useEffect(() => {
        connectToMessageBroker();
        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // const connectToMessageBroker = () => {
    //     console.log("Attempting to connect to:", url);
    //     const ws = new WebSocket(url);

    //     ws.onopen = () => {
    //         console.log("WebSocket connection established");
    //         const client = {
    //             connect: () => {
    //                 const frame = {
    //                     command: "CONNECT",
    //                     headers: {
    //                         "accept-version": "1.2",
    //                         host: vhost,
    //                         login,
    //                         passcode,
    //                         "heart-beat": "10000,10000",
    //                     },
    //                 };
    //                 console.log("Sending CONNECT frame:", frame);
    //                 ws.send(JSON.stringify(frame));
    //             },
    //             subscribe: (destination, headers) => {
    //                 const frame = {
    //                     command: "SUBSCRIBE",
    //                     headers: {
    //                         id: Math.random().toString(36).substr(2, 9),
    //                         destination,
    //                         ...headers,
    //                     },
    //                 };
    //                 console.log("Sending SUBSCRIBE frame:", frame);
    //                 ws.send(JSON.stringify(frame));
    //             },
    //             send: (destination, headers, body) => {
    //                 const frame = {
    //                     command: "SEND",
    //                     headers: {
    //                         destination,
    //                         "content-type": "application/json",
    //                         ...headers,
    //                     },
    //                     body: JSON.stringify(body),
    //                 };
    //                 console.log("Sending message frame:", frame);
    //                 ws.send(JSON.stringify(frame));
    //             },
    //         };

    //         stompClientRef.current = client;
    //         client.connect();
    //         setConnected(true);

    //         const queueName = `queue_${currentUserId}_${Date.now()}`;
    //         const routingKey = `chat.user.${currentUserId}`;
    //         console.log(queueName, "queueName");
    //         console.log(routingKey, "routingKey");

    //         client.send(
    //             "/queue/declare",
    //             {},
    //             {
    //                 queue: queueName,
    //                 durable: true,
    //                 "auto-delete": false, // Changed to false to persist the queue
    //             }
    //         );

    //         // Then bind the queue to the exchange
    //         client.send(
    //             "/exchange/ex_common/amq.bind",
    //             {},
    //             {
    //                 queue: queueName,
    //                 exchange: "ex_common",
    //                 routingKey: routingKey,
    //             }
    //         );

    //         // Subscribe to the queue
    //         client.subscribe(`/queue/${queueName}`, {
    //             "x-queue-name": queueName,
    //             durable: "true",
    //             "auto-delete": "false",
    //         });
    //     };

    //     ws.onmessage = (event) => {
    //         console.log("Received message:", event.data);
    //         try {
    //             const data = JSON.parse(event.data);
    //             if (data.body) {
    //                 const message = JSON.parse(data.body);
    //                 setMessages((prev) => [...prev, message]);
    //             }
    //         } catch (err) {
    //             console.error("Error parsing message:", err);
    //         }
    //     };

    //     ws.onerror = (error) => {
    //         console.error("WebSocket error:", error);
    //         setError(
    //             "Connection error occurred: " + (error.message || "Unknown error")
    //         );
    //         setConnected(false);
    //     };

    //     ws.onclose = (event) => {
    //         console.log("WebSocket closed:", event.code, event.reason);
    //         setConnected(false);
    //     };
    // };
    // const sendMessage = () => {
    //     if (!newMessage.trim() || !selectedUser || !connected) return;

    //     const routingKey = `chat.user.${selectedUser}`;
    //     const message = {
    //         type: "DIRECT_MESSAGE",
    //         from: currentUserId,
    //         to: selectedUser,
    //         content: newMessage,
    //         timestamp: new Date().toISOString(),
    //     };

    //     try {
    //         stompClientRef.current.send(
    //             `/exchange/${exchangeName}/${routingKey}`,
    //             {
    //                 "content-type": "application/json",
    //             },
    //             message
    //         );

    //         setMessages((prev) => [...prev, message]);
    //         setNewMessage("");
    //     } catch (error) {
    //         setError("Failed to send message");
    //     }
    // };

    const connectToMessageBroker = () => {
        console.log('Attempting to connect to:', url);
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('WebSocket connection established');
            const client = {
                connect: () => {
                    const frame = {
                        command: 'CONNECT',
                        headers: {
                            'accept-version': '1.2',
                            host: vhost,
                            login,
                            passcode,
                            'heart-beat': '10000,10000',
                        },
                    };
                    console.log('Sending CONNECT frame:', frame);
                    ws.send(JSON.stringify(frame));
                },
                subscribe: (destination, headers) => {
                    const frame = {
                        command: 'SUBSCRIBE',
                        headers: {
                            id: Math.random().toString(36).substr(2, 9),
                            destination,
                            ...headers,
                        },
                    };
                    console.log('Sending SUBSCRIBE frame:', frame);
                    ws.send(JSON.stringify(frame));
                },
                send: (destination, headers, body) => {
                    const frame = {
                        command: 'SEND',
                        headers: {
                            destination,
                            'content-type': 'application/json',
                            ...headers,
                        },
                        body: JSON.stringify(body),
                    };
                    console.log('Sending message frame:', frame);
                    ws.send(JSON.stringify(frame));
                },
            };

            stompClientRef.current = client;
            client.connect();

            // Create a dynamic queue name with timestamp for uniqueness
            const queueName = `chat_queue_${currentUserId}_${Date.now()}`;
            const routingKey = `chat.user.${currentUserId}`;

            // After connection is established
            ws.onmessage = async (event) => {
                try {
                    const response = JSON.parse(event.data);
                    console.log('Received message:', response);

                    // If we receive CONNECTED frame, proceed with queue setup
                    if (response.command === 'CONNECTED') {
                        console.log('STOMP Connected, setting up queue...');
                        setConnected(true);

                        // Step 1: Declare the queue
                        client.send('/queue/declare', {}, {
                            queue: queueName,
                            durable: false,          // Set to false for temporary queues
                            'auto-delete': true,     // Queue will be deleted when connection closes
                            exclusive: true          // Only this connection can use the queue
                        });

                        // Step 2: Create binding between queue and exchange
                        client.send('/exchange/bind', {}, {
                            queue: queueName,
                            exchange: exchangeName,
                            routingKey: routingKey
                        });

                        // Step 3: Subscribe to the queue
                        client.subscribe(
                            `/queue/${queueName}`,
                            {
                                'x-queue-name': queueName,
                                ack: 'client',
                                'auto-delete': 'true'
                            }
                        );

                        console.log('Queue setup complete:', {
                            queueName,
                            routingKey,
                            exchange: exchangeName
                        });
                    }
                    // Handle regular messages
                    else if (response.body) {
                        const messageData = JSON.parse(response.body);
                        setMessages(prev => [...prev, messageData]);
                    }
                } catch (err) {
                    console.error('Error processing message:', err);
                }
            };
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('Connection error occurred: ' + (error.message || 'Unknown error'));
            setConnected(false);
        };

        ws.onclose = (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
            setConnected(false);
        };
    };

    // Modified send message function to use the dynamic routing
    const sendMessage = () => {
        // if (!newMessage.trim() || !selectedUser || !connected) return;

        const routingKey = `chat.user.${selectedUser}`;
        const message = {
            type: 'DIRECT_MESSAGE',
            from: currentUserId,
            to: selectedUser,
            content: newMessage,
            timestamp: new Date().toISOString()
        };

        try {
            stompClientRef.current.send(
                `/exchange/${exchangeName}/${routingKey}`,
                {
                    'content-type': 'application/json',
                },
                message
            );

            // Add message to local state
            setMessages(prev => [...prev, message]);
            setNewMessage("");
        } catch (error) {
            setError('Failed to send message');
            console.error('Send error:', error);
        }
    };


    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="chat-card">
            <div className="card-header">
                <div className="card-title">
                    <MessageCircle size={24} />
                    Chat Interface
                    <div
                        className={`connection-status ${connected ? "status-connected" : "status-disconnected"
                            }`}
                    />
                </div>
            </div>
            <div className="card-content">
                <div className="chat-grid">
                    <div className="users-list">
                        <div className="users-title">
                            <Users size={16} />
                            Users
                        </div>
                        <div className="user-buttons">
                            {users
                                .filter((user) => user.id !== currentUserId)
                                .map((user) => (
                                    <button
                                        key={user.id}
                                        className={`user-button ${selectedUser === user.id ? "selected" : ""
                                            }`}
                                        onClick={() => setSelectedUser(user.id)}
                                    >
                                        <User size={16} />
                                        {user.name}
                                    </button>
                                ))}
                        </div>
                    </div>

                    <div className="chat-area">
                        <div className="messages-container">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`message-wrapper ${msg.from === currentUserId ? "sent" : "received"
                                        }`}
                                >
                                    <div
                                        className={`message-bubble ${msg.from === currentUserId ? "sent" : "received"
                                            }`}
                                    >
                                        <div className="message-sender">
                                            {msg.from === currentUserId ? "You" : `User ${msg.from}`}
                                        </div>
                                        <div>{msg.content}</div>
                                        <div className="message-time">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="input-area">
                            <div className="input-container">
                                <input
                                    className="message-input"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your message..."
                                // disabled={!selectedUser || !connected}
                                />
                                <button
                                    className="send-button"
                                    onClick={sendMessage}
                                // disabled={!selectedUser || !connected || !newMessage.trim()}
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                            {error && <div className="error-message">{error}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
