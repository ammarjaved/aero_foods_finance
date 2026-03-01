import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Single URL — always points to your PHP bridge file
// Set REACT_APP_STOCKBOT_API_URL in your .env to override
var PHP_BRIDGE_URL = process.env.REACT_APP_STOCKBOT_API_URL || "http://localhost/stockbot_api.php"//"http://121.121.232.54:88/aero-foods/stockbot_api.php";
var SESSION_KEY = "stockbot_session_id";

var QUICK_PROMPTS = [
  "What needs to be reordered urgently?",
  "Show me all food items running low",
  "What's my estimated reorder cost this week?",
  "How many days of stock left for Non Dairy Creamer?",
  "List all critical items",
  "Show packaging stock levels",
];

var STYLES = `
  .sb-container {
    display: flex;
    flex-direction: column;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    background: #ffffff;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    width: 100%;
    height: 100%;
  }
  .sb-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: linear-gradient(135deg, #c21c1c 0%, #d81d1d 100%);
    color: white;
  }
  .sb-header-title {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .sb-header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .sb-btn-clear {
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 4px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.2s;
  }
  .sb-btn-clear:hover { background: rgba(255,255,255,0.25); }
  .sb-session-badge {
    font-size: 11px;
    background: rgba(255,255,255,0.15);
    padding: 3px 8px;
    border-radius: 10px;
    opacity: 0.8;
  }
  .sb-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sb-message-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }
  .sb-message-row--user { flex-direction: row-reverse; }
  .sb-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }
  .sb-avatar--bot { background: #dbeafe; }
  .sb-avatar--user { background: #1d4ed8; color: white; font-size: 12px; font-weight: 600; }
  .sb-bubble {
    max-width: 80%;
    padding: 10px 14px;
    border-radius: 12px;
    line-height: 1.5;
    word-break: break-word;
  }
  .sb-bubble--bot {
    background: white;
    border: 1px solid #e2e8f0;
    border-bottom-left-radius: 3px;
    color: #1e293b;
  }
  .sb-bubble--user {
    background: #1d4ed8;
    color: white;
    border-bottom-right-radius: 3px;
  }
  .sb-bubble--error { background: #fff1f2; border-color: #fecdd3; }
  .sb-message-content { margin: 0; }
  .sb-message-line { margin: 2px 0; }
  .sb-timestamp {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 4px;
    text-align: right;
  }
  .sb-message-row--bot .sb-timestamp { text-align: left; }
  .sb-typing {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 12px 14px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    border-bottom-left-radius: 3px;
    width: fit-content;
  }
  .sb-dot {
    width: 6px;
    height: 6px;
    background: #94a3b8;
    border-radius: 50%;
    animation: sb-bounce 1.2s infinite;
  }
  .sb-dot:nth-child(2) { animation-delay: 0.2s; }
  .sb-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes sb-bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }
  .sb-quick-prompts {
    padding: 8px 16px 4px;
    background: #f8fafc;
    border-top: 1px solid #f1f5f9;
  }
  .sb-quick-label {
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .sb-quick-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-bottom: 8px;
  }
  .sb-quick-btn {
    background: white;
    border: 1px solid #e2e8f0;
    color: #1d4ed8;
    padding: 5px 10px;
    border-radius: 16px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .sb-quick-btn:hover { background: #eff6ff; border-color: #93c5fd; }
  .sb-quick-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sb-input-row {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: white;
    border-top: 1px solid #e2e8f0;
  }
  .sb-input {
    flex: 1;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    resize: none;
    font-family: inherit;
  }
  .sb-input:focus { border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,0.1); }
  .sb-send-btn {
    background: #1d4ed8;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 9px 16px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
    white-space: nowrap;
  }
  .sb-send-btn:hover:not(:disabled) { background: #1e40af; }
  .sb-send-btn:disabled { background: #94a3b8; cursor: not-allowed; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function BotMessage(props) {
  var lines = props.text.split("\n");
  return (
    React.createElement("div", { className: "sb-message-content" },
      lines.map(function(line, i) {
        if (!line.trim()) return React.createElement("br", { key: i });
        return React.createElement("p", { key: i, className: "sb-message-line" }, line);
      })
    )
  );
}

BotMessage.propTypes = {
  text: PropTypes.string.isRequired,
};

function TypingIndicator() {
  return (
    React.createElement("div", { className: "sb-message-row sb-message-row--bot" },
      React.createElement("div", { className: "sb-avatar sb-avatar--bot" }, "🤖"),
      React.createElement("div", { className: "sb-typing" },
        React.createElement("div", { className: "sb-dot" }),
        React.createElement("div", { className: "sb-dot" }),
        React.createElement("div", { className: "sb-dot" })
      )
    )
  );
}

function MessageBubble(props) {
  var msg = props.msg;
  var formatTime = props.formatTime;

  var bubbleClass = "sb-bubble sb-bubble--" + msg.role + (msg.isError ? " sb-bubble--error" : "");

  return (
    React.createElement("div", { key: msg.id, className: "sb-message-row sb-message-row--" + msg.role },
      React.createElement("div", { className: "sb-avatar sb-avatar--" + msg.role },
        msg.role === "bot" ? "🤖" : "U"
      ),
      React.createElement("div", null,
        React.createElement("div", { className: bubbleClass },
          msg.role === "bot"
            ? React.createElement(BotMessage, { text: msg.text })
            : msg.text
        ),
        React.createElement("div", { className: "sb-timestamp" },
          formatTime(msg.timestamp)
        )
      )
    )
  );
}

MessageBubble.propTypes = {
  msg: PropTypes.shape({
    id: PropTypes.number.isRequired,
    role: PropTypes.oneOf(["bot", "user"]).isRequired,
    text: PropTypes.string.isRequired,
    timestamp: PropTypes.instanceOf(Date).isRequired,
    isError: PropTypes.bool,
  }).isRequired,
  formatTime: PropTypes.func.isRequired,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

function StockBotChat(props) {
  var title = props.title || "🤖 StockBot";
  var placeholder = props.placeholder || "Ask about stock levels, reorder needs, predictions...";
  var height = props.height || "500px";
  var onSessionChange = props.onSessionChange || null;

  var initialMessage = {
    id: 0,
    role: "bot",
    text: "Hi! I'm StockBot 👋\nI can help you track inventory, predict stockouts, and plan reorders.\n\nWhat would you like to know?",
    timestamp: new Date(),
  };

  var messagesState = useState([initialMessage]);
  var messages = messagesState[0];
  var setMessages = messagesState[1];

  var inputState = useState("");
  var input = inputState[0];
  var setInput = inputState[1];

  var loadingState = useState(false);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  var sessionState = useState(null);
  var sessionId = sessionState[0];
  var setSessionId = sessionState[1];

  var quickPromptsState = useState(true);
  var showQuickPrompts = quickPromptsState[0];
  var setShowQuickPrompts = quickPromptsState[1];

  var messagesEndRef = useRef(null);
  var inputRef = useRef(null);
  var msgIdRef = useRef(1);

  // Restore session from localStorage
  useEffect(function() {
    var saved = localStorage.getItem(SESSION_KEY);
    if (saved) setSessionId(saved);
  }, []);

  // Auto-scroll to bottom
  useEffect(function() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // Focus input on mount
  useEffect(function() {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Send message
  var sendMessage = useCallback(function(text) {
    var trimmed = text.trim();
    if (!trimmed || loading) return;

    setShowQuickPrompts(false);
    setInput("");

    var userMsg = {
      id: msgIdRef.current++,
      role: "user",
      text: trimmed,
      timestamp: new Date(),
    };

    setMessages(function(prev) { return prev.concat(userMsg); });
    setLoading(true);

    // 5 minute timeout — AI agent can take 30-60s to think + query DB
    var controller = new AbortController();
    var fetchTimeout = setTimeout(function() { controller.abort(); }, 300000);

    fetch(PHP_BRIDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        message: trimmed,
        session_id: sessionId || undefined,
      }),
    })
      .then(function(res) {
        clearTimeout(fetchTimeout);
        if (!res.ok) {
          return res.json().then(function(err) {
            throw new Error(err.error || err.detail || "Server error");
          });
        }
        return res.json();
      })
      .then(function(data) {
        if (data.session_id && data.session_id !== sessionId) {
          setSessionId(data.session_id);
          localStorage.setItem(SESSION_KEY, data.session_id);
          if (onSessionChange) onSessionChange(data.session_id);
        }

        var botMsg = {
          id: msgIdRef.current++,
          role: "bot",
          text: data.reply,
          timestamp: new Date(),
        };
        setMessages(function(prev) { return prev.concat(botMsg); });
      })
      .catch(function(err) {
        clearTimeout(fetchTimeout);
        var errorText = err.name === "AbortError"
          ? "⚠️ Request timed out after 5 minutes.\nThe server may be busy — please try again."
          : "⚠️ " + err.message + "\nPlease try again.";
        var errMsg = {
          id: msgIdRef.current++,
          role: "bot",
          text: errorText,
          timestamp: new Date(),
          isError: true,
        };
        setMessages(function(prev) { return prev.concat(errMsg); });
      })
      .finally(function() {
        setLoading(false);
        setTimeout(function() {
          if (inputRef.current) inputRef.current.focus();
        }, 100);
      });
  }, [loading, sessionId, onSessionChange]);

  // Clear conversation
  var clearChat = useCallback(function() {
    if (sessionId) {
      // Tell PHP bridge to clear the session on the Python server
      fetch(PHP_BRIDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear", session_id: sessionId }),
      }).catch(function() {});
    }
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setMessages([{
      id: msgIdRef.current++,
      role: "bot",
      text: "Conversation cleared! How can I help you?",
      timestamp: new Date(),
    }]);
    setShowQuickPrompts(true);
  }, [sessionId]);

  // Keyboard — Enter to send, Shift+Enter for new line
  var handleKeyDown = function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  var formatTime = function(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    React.createElement(React.Fragment, null,
      React.createElement("style", null, STYLES),

      React.createElement("div", { className: "sb-container" },

        // Header
        React.createElement("div", { className: "sb-header" },
          React.createElement("span", { className: "sb-header-title" }, title),
          React.createElement("div", { className: "sb-header-actions" },
            sessionId && React.createElement("span", { className: "sb-session-badge" },
              "Session: " + sessionId.slice(0, 8) + "..."
            ),
            React.createElement("button", { className: "sb-btn-clear", onClick: clearChat },
              "New Chat"
            )
          )
        ),

        // Messages
        React.createElement("div", {
          className: "sb-messages",
          style: { height: "calc(" + height + " - 120px)" }
        },
          messages.map(function(msg) {
            return React.createElement(MessageBubble, {
              key: msg.id,
              msg: msg,
              formatTime: formatTime,
            });
          }),
          loading && React.createElement(TypingIndicator, null),
          React.createElement("div", { ref: messagesEndRef })
        ),

        // Quick prompts
        showQuickPrompts && React.createElement("div", { className: "sb-quick-prompts" },
          React.createElement("div", { className: "sb-quick-label" }, "Quick questions"),
          React.createElement("div", { className: "sb-quick-list" },
            QUICK_PROMPTS.map(function(p) {
              return React.createElement("button", {
                key: p,
                className: "sb-quick-btn",
                onClick: function() { sendMessage(p); },
                disabled: loading,
              }, p);
            })
          )
        ),

        // Input row
        React.createElement("div", { className: "sb-input-row" },
          React.createElement("textarea", {
            ref: inputRef,
            className: "sb-input",
            rows: 1,
            value: input,
            onChange: function(e) { setInput(e.target.value); },
            onKeyDown: handleKeyDown,
            placeholder: placeholder,
            disabled: loading,
          }),
          React.createElement("button", {
            className: "sb-send-btn",
            onClick: function() { sendMessage(input); },
            disabled: loading || !input.trim(),
          }, loading ? "..." : "Send ↑")
        )
      )
    )
  );
}

StockBotChat.propTypes = {
  title: PropTypes.string,
  placeholder: PropTypes.string,
  height: PropTypes.string,
  onSessionChange: PropTypes.func,
};

StockBotChat.defaultProps = {
  title: "🤖 StockBot",
  placeholder: "Ask about stock levels, reorder needs, predictions...",
  height: "500px",
  onSessionChange: null,
};

export default StockBotChat;