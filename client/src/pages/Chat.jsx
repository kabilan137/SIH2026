import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Send, Bot, User, Sparkles, AlertCircle, History,
  MessageSquare, ChevronRight, X, Mic, MicOff, StopCircle,
  Settings, Key, Eye, EyeOff, Check, Menu
} from 'lucide-react';
import { useAnalysis } from '../hooks/useAnalysis.js';
import { sendChatMessage, sendGeneralChatMessage } from '../api/analysisApi.js';

function ProviderLogo({ provider, className = 'ai-avatar-img', style }) {
  let src = '/images/mistral.png';
  let alt = 'Mistral AI';

  if (provider === 'openai') {
    src = '/images/openai.png';
    alt = 'OpenAI';
  } else if (provider === 'anthropic') {
    src = '/images/anthropic-light.png';
    alt = 'Anthropic';
  } else if (provider === 'gemini') {
    src = '/images/gemini-color-light.png';
    alt = 'Google Gemini';
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ objectFit: 'contain', ...style }}
      draggable="false"
    />
  );
}

const PROVIDERS = [
  { id: 'mistral', name: 'Mistral AI' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'gemini', name: 'Google Gemini' }
];

const MODEL_OPTIONS = {
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'mistral-medium-latest', name: 'Mistral Medium' },
    { id: 'mistral-small-latest', name: 'Mistral Small' },
    { id: 'mistral-tiny-latest', name: 'Mistral Tiny' }
  ],
  openai: [
    { id: 'gpt-5.5', name: 'GPT-5.5' },
    { id: 'gpt-5.5-thinking', name: 'GPT-5.5 Thinking' },
    { id: 'gpt-5.5-instant', name: 'GPT-5.5 Instant' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano' }
  ],
  anthropic: [
    { id: 'claude-fable-5', name: 'Claude 5 Fable' },
    { id: 'claude-sonnet-4-6', name: 'Claude 4.6 Sonnet' },
    { id: 'claude-opus-4-8', name: 'Claude 4.8 Opus' },
    { id: 'claude-haiku-4-5', name: 'Claude 4.5 Haiku' }
  ],
  gemini: [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
    { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
  ]
};

/* ── Markdown parser ────────────────────────────────────────── */
function parseMarkdownToHtml(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');

  // Bold & italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`(.*?)`/g, '<code class="chat-badge">$1</code>');

  // Markdown tables
  const tableRegex = /\|([^\n]*)\|(\s*\n\s*\|[ :-]*\|[^\n]*\n)([\s\S]*?)(?=\n\n|\n[^\s|]|$)/g;
  html = html.replace(tableRegex, (match, headerLine, alignLine, bodyContent) => {
    const headers = headerLine.split('|').map(h => h.trim()).slice(1, -1);
    const rows = bodyContent.split('\n')
      .map(r => r.trim())
      .filter(r => r.startsWith('|'))
      .map(row => row.split('|').map(c => c.trim()).slice(1, -1));
    const headerHtml = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    const bodyHtml = rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<div class="chat-table-wrapper"><table class="chat-table"><thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody></table></div>`;
  });

  // Lists
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n(?!<\/?ul>|<\/?li>|<\/?div>|<\/?table>|<\/?thead>|<\/?tbody>|<\/?tr>|<h[1-3])/g, '<br />');

  return `<p>${html}</p>`;
}

/* ── Visual Chart ───────────────────────────────────────────── */
function VisualChart({ content }) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const data = lines.map(line => {
    const segments = line.split('|').map(s => s.trim());
    return { label: segments[0] || '', val: parseFloat(segments[1]) || 0, color: segments[2] || 'green' };
  });
  const maxVal = Math.max(...data.map(d => d.val), 100);

  const colorMap = {
    green: 'var(--accent)', blue: 'var(--blue)', red: 'var(--red)',
    amber: 'var(--amber)', teal: 'var(--teal)', orange: 'var(--orange)', purple: 'var(--purple)'
  };

  return (
    <div className="chat-visual-chart">
      {data.map((item, idx) => {
        const pct = Math.min((item.val / maxVal) * 100, 100);
        const barColor = colorMap[item.color] || 'var(--accent)';
        return (
          <div key={idx} className="chart-bar-row">
            <span className="chart-bar-label">{item.label}</span>
            <div className="chart-bar-wrapper">
              <div className="chart-bar-fill" style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}50` }} />
              <span className="chart-bar-value">{item.val}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Message Content ─────────────────────────────────────────── */
function MessageContent({ text }) {
  if (!text) return null;
  const parts = [];
  const regex = /```chart([\s\S]*?)```/g;
  let lastIndex = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    parts.push({ type: 'chart', content: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ type: 'text', content: text.substring(lastIndex) });

  return (
    <div className="message-content-wrapper">
      {parts.map((part, i) =>
        part.type === 'chart'
          ? <VisualChart key={i} content={part.content} />
          : <div key={i} dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(part.content) }} />
      )}
    </div>
  );
}

/* ── Typing dots ─────────────────────────────────────────────── */
function TypingIndicator({ provider }) {
  return (
    <div className="chat-typing-indicator">
      <div className="typing-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ProviderLogo provider={provider} className="ai-avatar-img" />
      </div>
      <div className="typing-dots">
        <span /><span /><span />
      </div>
    </div>
  );
}

/* ── Voice Button ────────────────────────────────────────────── */
function VoiceButton({ onTranscript, disabled }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const start = useCallback(() => {
    if (!supported || listening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onTranscript(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  }, [supported, listening, onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  if (!supported) {
    return (
      <button
        type="button"
        className="voice-btn"
        disabled
        title="Voice input is not natively supported in Firefox. Use Chrome, Edge, or Safari for voice input."
        aria-label="Voice input not supported"
      >
        <MicOff size={16} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`voice-btn ${listening ? 'voice-btn--active' : ''}`}
      onClick={listening ? stop : start}
      disabled={disabled}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      title={listening ? 'Stop recording' : 'Speak your prompt'}
    >
      {listening ? <MicOff size={16} /> : <Mic size={16} />}
      {listening && <span className="voice-ripple" />}
    </button>
  );
}

/* ── Chat Input ──────────────────────────────────────────────── */
function ChatInput({ onSend, loading, placeholder }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text || loading) return;
    onSend(text);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceTranscript = (transcript) => {
    setValue(prev => prev ? `${prev} ${transcript}` : transcript);
    textareaRef.current?.focus();
  };

  const canSend = value.trim().length > 0 && !loading;

  return (
    <div className={`chat-input-container ${value ? 'has-text' : ''}`}>
      <form className="chat-input-box" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={1}
          aria-label="Prompt input"
        />
        <div className="chat-input-actions">
          <VoiceButton onTranscript={handleVoiceTranscript} disabled={loading} />
          <button
            type="submit"
            className={`send-btn ${canSend ? 'send-btn--active' : ''}`}
            disabled={!canSend}
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Main Chat Component ─────────────────────────────────────── */
function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const analysisId = searchParams.get('analysisId');

  const { state, loadHistory, loadAnalysis } = useAnalysis();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [provider, setProvider] = useState(() => localStorage.getItem('byok_provider') || 'mistral');
  const [apiKeys, setApiKeys] = useState(() => ({
    mistral: localStorage.getItem('byok_key_mistral') || '',
    openai: localStorage.getItem('byok_key_openai') || '',
    anthropic: localStorage.getItem('byok_key_anthropic') || '',
    gemini: localStorage.getItem('byok_key_gemini') || '',
  }));
  const [apiModels, setApiModels] = useState(() => {
    const storedMistral = localStorage.getItem('byok_model_mistral');
    const validMistral = ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'mistral-tiny-latest'].includes(storedMistral)
      ? storedMistral
      : 'mistral-large-latest';
    return {
      mistral: validMistral,
      openai: localStorage.getItem('byok_model_openai') || 'gpt-5.5',
      anthropic: localStorage.getItem('byok_model_anthropic') || 'claude-fable-5',
      gemini: localStorage.getItem('byok_model_gemini') || 'gemini-3.5-flash',
    };
  });

  const [showSettings, setShowSettings] = useState(false);
  const [tempProvider, setTempProvider] = useState(provider);
  const [tempApiKeys, setTempApiKeys] = useState(apiKeys);
  const [tempApiModels, setTempApiModels] = useState(apiModels);
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    return localStorage.getItem('chat_sidebar_pinned') === 'true';
  });
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isSidebarExpanded = isSidebarLocked || isSidebarHovered;

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Sync temp state when modal opens
  useEffect(() => {
    if (showSettings) {
      setTempProvider(provider);
      setTempApiKeys(apiKeys);
      setTempApiModels(apiModels);
      setSaveSuccess(false);
      setShowKey(false);
    }
  }, [showSettings, provider, apiKeys, apiModels]);

  const handleKeyChange = (prov, val) => {
    setTempApiKeys(prev => ({ ...prev, [prov]: val }));
  };

  const handleModelChange = (prov, val) => {
    setTempApiModels(prev => ({ ...prev, [prov]: val }));
  };

  const saveSettings = () => {
    localStorage.setItem('byok_provider', tempProvider);
    localStorage.setItem('byok_key_mistral', tempApiKeys.mistral);
    localStorage.setItem('byok_key_openai', tempApiKeys.openai);
    localStorage.setItem('byok_key_anthropic', tempApiKeys.anthropic);
    localStorage.setItem('byok_key_gemini', tempApiKeys.gemini);

    localStorage.setItem('byok_model_mistral', tempApiModels.mistral);
    localStorage.setItem('byok_model_openai', tempApiModels.openai);
    localStorage.setItem('byok_model_anthropic', tempApiModels.anthropic);
    localStorage.setItem('byok_model_gemini', tempApiModels.gemini);

    setProvider(tempProvider);
    setApiKeys(tempApiKeys);
    setApiModels(tempApiModels);
    setSaveSuccess(true);

    window.dispatchEvent(new Event('byok_provider_change'));

    setTimeout(() => {
      setSaveSuccess(false);
      setShowSettings(false);
    }, 1000);
  };

  const getDisclaimerText = () => {
    const providerName = PROVIDERS.find(p => p.id === provider)?.name || 'Mistral AI';
    const modelName = MODEL_OPTIONS[provider]?.find(m => m.id === apiModels[provider])?.name || '';
    return `AI insights may be inaccurate. Cross-reference independently. Powered by ${providerName}${modelName ? ` (${modelName})` : ''}.`;
  };

  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);

  // Load history on mount
  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, [loadHistory]);

  // Load report context
  useEffect(() => {
    if (analysisId) {
      setLoading(true);
      setError(null);
      loadAnalysis(analysisId)
        .then((doc) => {
          const businessType = doc?.input?.businessType || 'business';
          const locationName = doc?.input?.location || 'the location';
          setMessages([{
            role: 'assistant',
            content: `Hello! I've loaded the report for **${businessType}** at **${locationName}**.\n\nAsk me anything about competitors, demand signals, pricing, or strategic opportunities.`
          }]);
        })
        .catch((err) => {
          setError(`Failed to load report context: ${err.message}`);
          setSearchParams({});
        })
        .finally(() => setLoading(false));
    } else {
      setMessages([{
        role: 'assistant',
        content: 'Hello! I am your AI Market Analyst assistant. How can I help you evaluate location ideas, analyze general market demand, or brainstorm startups today?'
      }]);
      setError(null);
    }
  }, [analysisId, loadAnalysis, setSearchParams]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text) => {
    if (!text || loading) return;
    setError(null);
    setLoading(true);

    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const apiMessages = updatedMessages.slice(1).map(msg => ({ role: msg.role, content: msg.content }));
      const byokSettings = {
        provider,
        apiKey: apiKeys[provider] || '',
        model: apiModels[provider] || ''
      };
      const response = analysisId
        ? await sendChatMessage(analysisId, apiMessages, byokSettings)
        : await sendGeneralChatMessage(apiMessages, byokSettings);

      setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to reach AI server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => setSearchParams({});
  const loadContext = (id) => setSearchParams({ analysisId: id });

  const isEmptyState = messages.length <= 1 && !loading;

  const generalSuggestions = [
    { title: 'Austin Cafe', desc: 'Startup margins and competitor gaps in Austin.', prompt: 'What shop/startup can I start in Austin to maximize profits? Show me startup margin estimates in a table.' },
    { title: 'Location Choice', desc: 'Best locations for a fitness studio.', prompt: 'Compare Austin, Denver, and Seattle for opening a new boutique fitness studio. Format details in a table.' },
    { title: 'Standout Factors', desc: 'How to beat local restaurant saturation.', prompt: 'What strategies can a new restaurant use to survive in a highly saturated local market?' },
    { title: 'Demand Trends', desc: 'High demand startup niches in 2026.', prompt: 'What are some high-demand startup niches in growing metro locations? Give a chart of estimated demand levels.' }
  ];

  const contextualSuggestions = [
    { title: 'Evaluate Threat', desc: 'Who is the most threatening competitor?', prompt: 'Who is the most threatening competitor here and what are their strengths?' },
    { title: 'Compare Pricing', desc: 'Show pricing ranges and budget gaps.', prompt: 'Can you show me a comparison table and chart of competitor pricing and the sweet spot?' },
    { title: 'Positioning Tips', desc: 'Suggest positioning tactics to stand out.', prompt: 'Suggest strategic positioning tactics and key angles to stand out in this location.' },
    { title: 'Overall Health', desc: 'Is the opportunity score realistic?', prompt: 'Explain the opportunity score here. Do you think this concept has a realistic chance of success?' }
  ];

  const suggestions = analysisId ? contextualSuggestions : generalSuggestions;
  const currentContext = state.currentAnalysis;
  const placeholder = analysisId ? 'Ask about this analysis report…' : 'Ask about locations, startups, or market trends…';

  return (
    <div className={`chat-shell ${isSidebarLocked ? 'sidebar-locked' : 'sidebar-collapsed'} ${isSidebarHovered ? 'sidebar-hovered' : ''}`} aria-label="AI Chat Workspace">
      {/* ── Sidebar ── */}
      <aside 
        className={`chat-sidebar-v2 ${isSidebarExpanded ? 'is-expanded' : 'is-collapsed'}`}
        onMouseEnter={() => !isSidebarLocked && setIsSidebarHovered(true)}
        onMouseLeave={() => !isSidebarLocked && setIsSidebarHovered(false)}
      >
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <button 
              className="sidebar-toggle-btn" 
              onClick={() => {
                const newValue = !isSidebarLocked;
                setIsSidebarLocked(newValue);
                localStorage.setItem('chat_sidebar_pinned', String(newValue));
                if (newValue) {
                  setIsSidebarHovered(false);
                }
              }}
              title={isSidebarLocked ? "Collapse sidebar" : "Pin sidebar"}
            >
              <Menu size={18} />
            </button>
          </div>
          <button className="new-chat-btn" onClick={startNewChat} title={!isSidebarExpanded ? "New Chat" : undefined}>
            <Plus size={15} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-label">
            <History size={12} />
            <span>Recent Analyses</span>
          </p>
          <div className="sidebar-items">
            {state.history.length === 0 ? (
              <span className="sidebar-empty-msg">
                {isSidebarExpanded ? "No analyses yet" : ""}
              </span>
            ) : (
              state.history.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-item-v2 ${analysisId === item.id ? 'is-active' : ''}`}
                  onClick={() => loadContext(item.id)}
                  title={!isSidebarExpanded ? `${item.businessType} · ${item.location}` : undefined}
                >
                  <MessageSquare size={16} className="sidebar-icon" />
                  <div className="sidebar-item-text-v2">
                    <span className="item-title">{item.businessType}</span>
                    <span className="item-loc">{item.location}</span>
                  </div>
                  <ChevronRight size={12} className="item-chevron" />
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main className="chat-main-v2">
        {/* Mobile History Toggle Button */}
        <button 
          className="mobile-history-toggle-btn" 
          onClick={() => setIsMobileDrawerOpen(true)}
          title="Recent Analyses"
        >
          <History size={16} />
        </button>

        {/* Mobile History Drawer Overlay */}
        {isMobileDrawerOpen && (
          <div className="mobile-history-drawer-overlay" onClick={() => setIsMobileDrawerOpen(false)}>
            <div className="mobile-history-drawer" onClick={(e) => e.stopPropagation()}>
              <header className="mobile-drawer-header">
                <h3>Recent Analyses</h3>
                <button className="mobile-drawer-close-btn" onClick={() => setIsMobileDrawerOpen(false)} title="Close menu">
                  <X size={18} />
                </button>
              </header>
              <div className="mobile-drawer-content">
                {state.history.length === 0 ? (
                  <span className="sidebar-empty-msg">No analyses yet</span>
                ) : (
                  state.history.map((item) => (
                    <button
                      key={item.id}
                      className={`sidebar-item-v2 ${analysisId === item.id ? 'is-active' : ''}`}
                      onClick={() => {
                        loadContext(item.id);
                        setIsMobileDrawerOpen(false);
                      }}
                    >
                      <MessageSquare size={16} className="sidebar-icon" />
                      <div className="sidebar-item-text-v2">
                        <span className="item-title">{item.businessType}</span>
                        <span className="item-loc">{item.location}</span>
                      </div>
                      <ChevronRight size={12} className="item-chevron" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="chat-messages-v2" ref={messagesAreaRef}>
          {/* Empty / Welcome state */}
          {isEmptyState && (
            <div className="welcome-state">
              <div className="welcome-orb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ProviderLogo provider={provider} className="welcome-logo-img" />
              </div>
              <h2 className="welcome-heading">How can I help you today?</h2>
              <p className="welcome-sub">Ask about competitor densities, pricing sweet spots, or brainstorm startup locations.</p>
              <div className="suggestions-grid">
                {suggestions.map((s, i) => (
                  <button key={i} className="suggestion-card" onClick={() => handleSend(s.prompt)}>
                    <span className="sug-title">{s.title}</span>
                    <span className="sug-desc">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`msg-row msg-row--${msg.role}`}
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              {msg.role === 'assistant' ? (
                <div className="msg-avatar msg-avatar--ai" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ProviderLogo provider={provider} className="ai-avatar-img" />
                </div>
              ) : (
                <div className="msg-avatar msg-avatar--user">
                  <User size={14} />
                </div>
              )}
              <div className="msg-bubble">
                {msg.role === 'assistant'
                  ? <MessageContent text={msg.content} />
                  : <span className="user-text">{msg.content}</span>
                }
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && <TypingIndicator provider={provider} />}

          {/* Error */}
          {error && (
            <div className="chat-error-banner">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <footer className="chat-footer-v2">
          <ChatInput onSend={handleSend} loading={loading} placeholder={placeholder} />
          <div className="chat-footer-meta">
            {analysisId && currentContext ? (
              <div className="context-pill">
                <Sparkles size={11} className="context-sparkle" />
                <div className="context-text">
                  <span className="context-mode">Context Mode</span>
                  <span className="context-name">{currentContext.input.businessType} · {currentContext.input.location}</span>
                </div>
                <button className="context-clear-btn" onClick={startNewChat} title="Clear context">
                  <X size={10} />
                </button>
              </div>
            ) : (
              <div />
            )}

            <p className="chat-disclaimer-v2">
              {getDisclaimerText()}
            </p>

            <button
              onClick={() => setShowSettings(true)}
              className="chat-provider-btn"
              title="Configure AI Provider & Key"
            >
              <ProviderLogo provider={provider} className="ai-avatar-img" style={{ width: '14px', height: '14px', marginTop: 0 }} />
              <span>{PROVIDERS.find(p => p.id === provider)?.name} ({MODEL_OPTIONS[provider]?.find(m => m.id === apiModels[provider])?.name})</span>
              <Settings size={12} style={{ opacity: 0.7 }} />
            </button>
          </div>
        </footer>
      </main>

      {/* ── BYOK Settings Modal ── */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <header className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={20} style={{ color: 'var(--accent)' }} />
                <span>AI Provider Settings</span>
              </h2>
              <button className="modal-close-btn" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </header>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: '1.5' }}>
                Configure the LLM engine powering your chat assistant. You can use the default Mistral API or supply your own keys.
              </p>
              
              {/* Provider Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {PROVIDERS.map(p => {
                  const isActive = tempProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setTempProvider(p.id);
                        setShowKey(false);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '16px 8px 12px',
                        borderRadius: '12px',
                        border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: isActive ? 'var(--accent-glow)' : 'var(--surface-1)',
                        cursor: 'pointer',
                        transition: 'all 0.22s var(--ease-out)',
                        height: '114px'
                      }}
                      className="provider-tile"
                    >
                      <div style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ProviderLogo provider={p.id} className="tile-logo-img" style={{ width: '36px', height: '36px' }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: isActive ? '700' : '500', color: isActive ? 'var(--ink)' : 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.2' }}>
                        {p.name}
                      </span>
                      {p.id === 'mistral' && !tempApiKeys[p.id] && (
                        <span style={{ fontSize: '0.62rem', background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', marginTop: '-2px' }}>
                          Default
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Key Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {tempProvider === 'mistral' ? 'Mistral API Key (Optional)' : `${PROVIDERS.find(p => p.id === tempProvider)?.name} API Key`}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={tempApiKeys[tempProvider]}
                    onChange={e => handleKeyChange(tempProvider, e.target.value)}
                    placeholder={tempProvider === 'mistral' ? 'Leave empty to use system default' : `Enter your ${PROVIDERS.find(p => p.id === tempProvider)?.name} API Key`}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                      color: 'var(--ink)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {tempProvider === 'mistral'
                    ? 'Using the default Mistral engine. No API key is required, but you can enter your own key here.'
                    : `To use ${PROVIDERS.find(p => p.id === tempProvider)?.name}, you must provide an API key. Your key is stored locally in your browser.`}
                </span>
              </div>

              {/* Model Picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Model Selection
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <select
                    value={tempApiModels[tempProvider] || ''}
                    onChange={e => handleModelChange(tempProvider, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                      color: 'var(--ink)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 14px center',
                      backgroundSize: '16px',
                    }}
                  >
                    {(MODEL_OPTIONS[tempProvider] || []).map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Select the model version to use for this provider.
                </span>
              </div>
            </div>
            
            {/* Modal Footer */}
            <footer className="modal-footer-search-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.015)', alignItems: 'center' }}>
              {saveSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '0.84rem', fontWeight: '600', marginRight: 'auto' }}>
                  <Check size={16} />
                  <span>Settings saved successfully!</span>
                </div>
              )}
              <button
                type="button"
                className="voice-btn"
                style={{ borderRadius: '8px', width: 'auto', height: '38px', padding: '0 16px', fontSize: '0.85rem' }}
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="new-chat-btn"
                style={{ width: 'auto', height: '38px', padding: '0 20px', fontSize: '0.85rem' }}
                onClick={saveSettings}
              >
                Save Settings
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
