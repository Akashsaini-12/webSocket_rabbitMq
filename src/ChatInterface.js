import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, User, Users } from "lucide-react";
import "./ChatInterface.css";
import MessageService from "./MessageService";

const ChatInterface = ({ currentUserId }) => {
    const [messages, setMessages] = useState([]);
    const [connected, setConnected] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [selectedUser, setSelectedUser] = useState("");
    const [error, setError] = useState("");
    const messageServiceRef = useRef(null);
    const messagesEndRef = useRef(null);

    const [typingUsers, setTypingUsers] = useState(new Set());
    const typingTimeoutRef = useRef(null);

    // Add typing status handler
    const handleTypingStatus = (typingData) => {
        console.log("Typing status received:", typingData); // Add this for debugging
        if (
            typingData.type === "TYPING_STATUS" &&
            typingData.to === currentUserId
        ) {
            setTypingUsers((prev) => {
                const newSet = new Set(prev);
                if (typingData.isTyping) {
                    newSet.add(typingData.from);
                } else {
                    newSet.delete(typingData.from);
                }
                return newSet;
            });
        }
    };
    const users = [
        { id: "1024", name: "User 1" },
        { id: "1025", name: "User 2" },
        { id: "1026", name: "User 3" },
    ];

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        fetchConversation(currentUserId, selectedUser);
    }, [selectedUser]);

    // // Fetch conversation between two users
    const fetchConversation = async (currentUserId, selectedUser) => {
        try {
            const response = await fetch(
                `http://localhost:5001/api/chats/conversation?user1=${currentUserId}&user2=${selectedUser}`
            );
            const data = await response.json();

            if (data.success) {
                console.log("Conversation:", data.data);
                setMessages(data.data);
                return data.data;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error("Error fetching conversation:", error);
            return [];
        }
    };

    const handleInputChange = (e) => {
        const message = e.target.value;
        setNewMessage(message);

        // Only send typing status if there's actual content
        if (selectedUser && messageServiceRef.current) {
            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Send typing status only if there's content
            if (message.trim().length > 0) {
                messageServiceRef.current.publishTypingStatus(true, selectedUser);
            }

            // Set timeout to clear typing status
            typingTimeoutRef.current = setTimeout(() => {
                if (messageServiceRef.current) {
                    messageServiceRef.current.publishTypingStatus(false, selectedUser);
                }
            }, 1000);
        }
    };

    useEffect(() => {
        try {
            const queueName = `chat_queue_${currentUserId}_${Date.now()}`;
            const routingKey = `chat.user.${currentUserId}`;

            messageServiceRef.current = new MessageService({
                url: "ws://localhost:15674/ws",
                vhost: "/",
                login: "myuser",
                passcode: "mypassword",
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
                heartbeatQueue: `/exchange/ex_presence`,
                subscribeQueue: queueName, // Fixed quotes and using dynamic queue name
                publishQueue: "ex_common",
                dbExchangeName: "db_ex",
                routingKey: routingKey,
                groupRoutingKeys: JSON.stringify([routingKey]), // Convert to JSON string
                userId: currentUserId,
                onTypingStatus: handleTypingStatus,
                onConnect: () => {
                    console.log("Connected to message broker");
                    setConnected(true);
                    setError("");
                },
                onError: (err) => {
                    console.error("Message service error:", err);
                    setError(err.message);
                    setConnected(false);
                },
                onMessage: (message) => {
                    console.log("Received message:", message);
                    setMessages((prev) => [...prev, message]);
                },
            });

            // Cleanup on unmount
            return () => {
                if (messageServiceRef.current) {
                    messageServiceRef.current.disconnect();
                }
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
            };
        } catch (err) {
            console.error("Failed to initialize message service:", err);
            setError(err.message);
        }
    }, [currentUserId]);

    const generateMessageId = () => {
        const chars = "1234567890";
        const length = 8;
        let id = "msg_";

        for (let i = 0; i < length; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return id;
    };
    const sendMessage = () => {
        if (!newMessage.trim() || !selectedUser) {
            return;
        }

        try {
            // Clear typing status when sending message
            if (messageServiceRef.current) {
                messageServiceRef.current.publishTypingStatus(false, selectedUser);
            }

            const message = {
                msg_id: generateMessageId(),
                type: "DIRECT_MESSAGE",
                from: currentUserId,
                to: selectedUser,
                content: newMessage,
                timestamp: new Date().toISOString(),
            };
            const routingKey = `chat.user.${selectedUser}`;

            if (messageServiceRef.current) {
                messageServiceRef.current.publish(message, routingKey);
                setMessages((prev) => [...prev, message]);
                setNewMessage("");
            } else {
                throw new Error("Message service not initialized");
            }
        } catch (err) {
            console.error("Failed to send message:", err);
            setError("Failed to send message: " + err.message);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingUsers]);

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
                            {Array.from(typingUsers).length > 0 && (
                                <div className="typing-indicator">
                                    {/* {Array.from(typingUsers)
                                        .map((userId) => {
                                            const user = users.find((u) => u.id === userId);
                                            return user ? user.name : `User ${userId}`;
                                        })
                                        .join(", ")}{" "}
                                    {typingUsers.size === 1 ? "is" : "are"} typing... */}
                                    {typingUsers.size === 1 ? "is" : "are"}typing...
                                </div>
                            )}

                            {messages.length <= 0 && (
                                <p style={{ textAlign: "center", color: "gray" }}>
                                    No Chat Available
                                </p>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="input-area">
                            <div className="input-container">
                                <input
                                    className="message-input"
                                    value={newMessage}
                                    onChange={(e) => handleInputChange(e)}
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
