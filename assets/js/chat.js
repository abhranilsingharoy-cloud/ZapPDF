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
          <h3><img src="assets/icons/lightning.svg" width="16" height="16"> ZapBot</h3>
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
    typingEl.textContent = 'ZapBot is typing...';
    msgContainer.appendChild(typingEl);
    scrollToBottom();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history })
      });

      document.getElementById(typingId)?.remove();

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      
      // format response basic markdown bolding
      const formattedText = data.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      appendMessage(formattedText, 'bot', true);
      
      // Save to history
      history.push({ role: 'user', text: text });
      history.push({ role: 'bot', text: data.text });

    } catch (e) {
      document.getElementById(typingId)?.remove();
      appendMessage('Sorry, I encountered an error. Please check if GEMINI_API_KEY is set in Vercel.', 'bot');
      messageCount--; // refund
      limitText.textContent = `${messageCount} / ${MAX_MESSAGES} messages`;
      
      if (messageCount < MAX_MESSAGES) {
          input.disabled = false;
          sendBtn.disabled = false;
          input.placeholder = "Type your message...";
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
