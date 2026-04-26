// src/components/TeamChatAssistant.jsx
import React, { useState, useEffect, useRef } from "react";
import "./TeamChatAssistant.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const TeamChatAssistant = ({ complaintId, attackType }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "I'm your cybercrime case assistant. Ask me how to proceed with this case, mitigation steps, or next actions.",
      id: "init-1",
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const pushMessage = (msg) => {
    setMessages((prev) => [...prev, { ...msg, id: `${msg.role}-${Date.now()}`, time: new Date().toLocaleTimeString() }]);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    pushMessage({ role: "user", text: trimmed });
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/get_ai_guidance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attack_type: attackType || "general",
          question: trimmed,
          complaint_id: complaintId || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg = data.error || "Failed to get AI guidance.";
        pushMessage({ role: "assistant", text: `⚠️ Backend Error: ${errMsg}` });
      } else {
        // preserve newlines
        pushMessage({ role: "assistant", text: data.guidance || "No guidance returned." });
      }
    } catch (err) {
      console.error("Chat assistant error:", err);
      pushMessage({
        role: "assistant",
        text: "⚠️ Unable to contact AI assistance service. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tca-root" aria-live="polite">
      <div className="tca-header">
        <div className="tca-title">Case Assistant</div>
        <div className="tca-sub">Ask about next steps, triage, and mitigation</div>
      </div>

      <div className="tca-window" ref={chatRef} role="log" aria-label="Chat messages">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`tca-message ${m.role === "user" ? "tca-user" : "tca-assistant"}`}
          >
            <div className="tca-avatar" aria-hidden>
              {m.role === "user" ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="#fff" strokeWidth="1.2"/><path d="M4.2 20.2c.8-3 3.8-5.2 7.8-5.2s7 2.2 7.8 5.2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/></svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="#0b66cc" strokeWidth="1.2"/><path d="M7 12h10" stroke="#0b66cc" strokeWidth="1.2" strokeLinecap="round"/></svg>
              )}
            </div>

            <div className="tca-bubble-wrap">
              <div className={`tca-bubble ${m.role === "user" ? "bubble-user" : "bubble-assistant"}`}>
                {m.text.split("\n").map((line, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <p key={i} className="tca-line">{line}</p>
                ))}
              </div>
              <div className="tca-meta">
                <span className="tca-role">{m.role === "user" ? "You" : "Assistant"}</span>
                <span className="tca-time">{m.time}</span>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="tca-message tca-assistant">
            <div className="tca-avatar" />
            <div className="tca-bubble-wrap">
              <div className="tca-bubble bubble-assistant typing">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
              <div className="tca-meta"><span className="tca-role">Assistant</span></div>
            </div>
          </div>
        )}
      </div>

      <form className="tca-input-row" onSubmit={handleSend}>
        <input
          aria-label="Ask the assistant"
          placeholder="Ask how to proceed with this case..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="tca-send" disabled={loading || !input.trim()}>
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default TeamChatAssistant;
