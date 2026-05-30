export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-ai'}`}>
      {!isUser && (
        <div className="chat-avatar">🤖</div>
      )}
      <div className={`chat-bubble ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
        <div className="bubble-text" style={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </div>
        <div className="bubble-time">
          {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div className="chat-avatar chat-avatar-user">👤</div>
      )}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="chat-message chat-message-ai">
      <div className="chat-avatar">🤖</div>
      <div className="chat-bubble bubble-ai typing-bubble">
        <div className="typing-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}
