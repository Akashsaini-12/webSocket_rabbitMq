import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, User, Users } from "lucide-react";
import "./ChatInterface.css";
import MessageService from "./MessageService";

const ChatInterface = ({
    currentUserId = "user1",
    url = "ws://localhost:15674/ws", // Fixed typo in localhost
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
    const messageServiceRef = useRef(null);
    const messagesEndRef = useRef(null);

    const users = [
        { id: "user1", name: "User 1" },
        { id: "user2", name: "User 2" },
        { id: "user3", name: "User 3" },
    ];

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        try {
            const queueName = `chat_queue_${currentUserId}_${Date.now()}`;
            const routingKey = `chat.user.${currentUserId}`;

            messageServiceRef.current = new MessageService({
                url: "ws://localhost:15674/ws",
                vhost: '/',
                login: 'myuser',
                passcode: 'mypassword',
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
                heartbeatQueue: `/exchange/ex_presence`,
                subscribeQueue: queueName, // Fixed quotes and using dynamic queue name
                publishQueue: 'ex_common',
                routingKey: routingKey,
                groupRoutingKeys: JSON.stringify([routingKey]), // Convert to JSON string
                userId: currentUserId,
                onConnect: () => {
                    console.log('Connected to message broker');
                    setConnected(true);
                    setError("");
                },
                onError: (err) => {
                    console.error('Message service error:', err);
                    setError(err.message);
                    setConnected(false);
                },
                onMessage: (message) => {
                    console.log('Received message:', message);
                    setMessages(prev => [...prev, message]);
                }
            });

            // Cleanup on unmount
            return () => {
                if (messageServiceRef.current) {
                    messageServiceRef.current.disconnect();
                }
            };
        } catch (err) {
            console.error('Failed to initialize message service:', err);
            setError(err.message);
        }
    }, [currentUserId]);

    const sendMessage = () => {
        if (!newMessage.trim() || !selectedUser) {
            return;
        }

        try {
            const message = {
                type: 'DIRECT_MESSAGE',
                from: currentUserId,
                to: selectedUser,
                content: newMessage,
                timestamp: new Date().toISOString()
            };

            const routingKey = `chat.user.${selectedUser}`;

            if (messageServiceRef.current) {
                messageServiceRef.current.publish(message, routingKey);
                // Add to local messages
                setMessages(prev => [...prev, message]);
                setNewMessage("");
            } else {
                throw new Error("Message service not initialized");
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setError('Failed to send message: ' + err.message);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
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
                    <div className={`connection-status ${connected ? "status-connected" : "status-disconnected"}`} />
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
                                        className={`user-button ${selectedUser === user.id ? "selected" : ""}`}
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
                                    className={`message-wrapper ${msg.from === currentUserId ? "sent" : "received"}`}
                                >
                                    <div className={`message-bubble ${msg.from === currentUserId ? "sent" : "received"}`}>
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
                                    disabled={!selectedUser || !connected}
                                />
                                <button
                                    className="send-button"
                                    onClick={sendMessage}
                                    disabled={!selectedUser || !connected || !newMessage.trim()}
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