// chat.js
document.addEventListener('DOMContentLoaded', () => {
  const MAX_MESSAGES = 15;
  let messageCount = 0;
  let history = [];

  // Inject Chat HTML
  const chatHTML = `
    <div class="chat-widget" id="zap-chat-widget">
      <div class="chat-window" id="zap-chat-window">
        <div class="chat-header">
          <h3><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: var(--color-primary);"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> ZapBot</h3>
          <button class="chat-close" id="zap-chat-close">&times;</button>
        </div>
        <div class="chat-messages" id="zap-chat-messages">
          <div class="chat-message bot">Hi there! I'm ZapBot. How can I help you with ZapPDF today?</div>
        </div>
        <div class="chat-input-area">
          <input type="text" class="chat-input" id="zap-chat-input" placeholder="Type your message..." autocomplete="off">
          <button class="chat-send" id="zap-chat-send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <div class="chat-limit-warning" id="zap-chat-limit">0 / 15 messages</div>
      </div>
      <button class="chat-trigger" id="zap-chat-trigger" aria-label="Open Chat">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', chatHTML);

  const win = document.getElementById('zap-chat-window');
  const trigger = document.getElementById('zap-chat-trigger');
  const closeBtn = document.getElementById('zap-chat-close');
  const msgContainer = document.getElementById('zap-chat-messages');
  const input = document.getElementById('zap-chat-input');
  const sendBtn = document.getElementById('zap-chat-send');
  const limitText = document.getElementById('zap-chat-limit');

  // Toggle Window
  trigger.addEventListener('click', () => win.classList.toggle('open'));
  closeBtn.addEventListener('click', () => win.classList.remove('open'));

  // Sending Logic
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || messageCount >= MAX_MESSAGES) return;

    // Check for Groq API Key command
    if (text.startsWith('/key ') || text.startsWith('gsk_')) {
      const newKey = text.replace('/key ', '').trim();
      if (newKey.startsWith('gsk_')) {
        localStorage.setItem('zap_groq_api_key', newKey);
        appendMessage(text, 'user');
        input.value = '';
        appendMessage('✅ <strong>Groq API key saved securely!</strong> All AI features (ZapBot, AI Summarizer, Translate) will now run with ultra-fast Groq LPU inference.', 'bot', true);
        return;
      }
    }

    // Add user message
    appendMessage(text, 'user');
    input.value = '';
    messageCount++;
    limitText.textContent = `${messageCount} / ${MAX_MESSAGES} messages`;

    if (messageCount >= MAX_MESSAGES) {
      input.disabled = true;
      sendBtn.disabled = true;
      input.placeholder = "Message limit reached for this session.";
    }

    // Add typing indicator
    const typingId = 'typing-' + Date.now();
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-typing';
    typingEl.id = typingId;
    typingEl.textContent = 'ZapBot is thinking...';
    msgContainer.appendChild(typingEl);
    scrollToBottom();

    let botText = null;
    const localGroqKey = localStorage.getItem('zap_groq_api_key');

    // 1. Try serverless /api/chat first (Vercel with GROQ_API_KEY)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history })
      });

      if (response.ok) {
        const data = await response.json();
        botText = data.text || data.response;
      }
    } catch (e) {
      console.warn('/api/chat unreachable, checking client-side Groq key:', e);
    }

    // 2. Direct client-side Groq call if server didn't respond and user set key
    if (!botText && localGroqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localGroqKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are ZapBot, the helpful AI assistant for ZapPDF (https://zappdf.com).' },
              ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
              { role: 'user', content: text }
            ],
            temperature: 0.7,
            max_tokens: 1024
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          botText = groqData.choices && groqData.choices[0] && groqData.choices[0].message
            ? groqData.choices[0].message.content
            : null;
        }
      } catch (gErr) {
        console.warn('Direct Groq fetch failed:', gErr);
      }
    }

    document.getElementById(typingId)?.remove();

    if (botText) {
      const formattedText = botText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      appendMessage(formattedText, 'bot', true);
      history.push({ role: 'user', text: text });
      history.push({ role: 'bot', text: botText });
    } else {
      appendMessage('To activate ZapBot, configure your free Groq API key (from <a href="https://console.groq.com/keys" target="_blank" style="color:var(--color-primary);text-decoration:underline;font-weight:600;">console.groq.com/keys</a>). Set <code>GROQ_API_KEY</code> on Vercel, or paste your key right here (e.g. <code>/key gsk_...</code>)!', 'bot', true);
      messageCount--; // refund
      limitText.textContent = `${messageCount} / ${MAX_MESSAGES} messages`;
      if (messageCount < MAX_MESSAGES) {
        input.disabled = false;
        sendBtn.disabled = false;
        input.placeholder = "Type your message or /key gsk_...";
      }
    }
  }

  function appendMessage(text, role, isHTML = false) {
    const el = document.createElement('div');
    el.className = `chat-message ${role}`;
    if (isHTML) {
        el.innerHTML = text;
    } else {
        el.textContent = text;
    }
    msgContainer.appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() {
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  // Events
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
});
