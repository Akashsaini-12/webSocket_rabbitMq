// App.jsx
import React, { useState } from 'react';
import './App.css';
import { MessageCircle, User } from 'lucide-react';
import ChatInterface from './ChatInterface';

const USERS = [
  { id: "user1", name: "User 1" },
  { id: "user2", name: "User 2" },
  { id: "user3", name: "User 3" }
];

const LoginScreen = ({ onLogin }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (selectedUser) {
      const user = USERS.find(u => u.id === selectedUser);
      onLogin(user);
    } else {
      setError('Please select a user');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <MessageCircle size={32} />
          <h1>Select User</h1>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <div className="user-selection">
            {USERS.map(user => (
              <button
                key={user.id}
                type="button"
                className={`user-select-button ${selectedUser === user.id ? 'selected' : ''}`}
                onClick={() => setSelectedUser(user.id)}
              >
                <User size={20} />
                {user.name}
              </button>
            ))}
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-button">
            Start Chat
          </button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <ChatInterface
      currentUserId={currentUser.id}
      url="ws://localhost:15674/ws"
      vhost="/"
      login="myuser"
      passcode="mypassword"
      exchangeName="ex_common"
      availableUsers={USERS.filter(u => u.id !== currentUser.id)}
    />
  );
};

export default App;