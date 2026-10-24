// api/chat.js - Groq and Gemini AI endpoint for ZapPDF

module.exports = async (req, res) => {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    return res.status(500).json({
      error: 'No AI API key configured. Please set GROQ_API_KEY (from https://console.groq.com/keys) or GEMINI_API_KEY in your environment variables.'
    });
  }

  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const systemInstruction = `You are ZapBot, the fast and helpful AI assistant for ZapPDF (https://zappdf.com).
You specialize in document analysis, summarization, translation, and explaining PDF tools.
ZapPDF core architecture knowledge base:
- 100% Client-Side Privacy: All PDF processing (merge, split, compress, convert, edit, ocr, redact) happens locally inside browser RAM and WebAssembly. No files are ever uploaded or stored on servers.
- Supported tools: 35 tools including Merge, Split, Compress (Extreme, Recommended, Low, Target Size), PDF to Word, Word to PDF, OCR (Tesseract), Sign, Watermark, Redact, Compare, Scan to PDF, Batch Workflows, and AI Summarizer.
- If asked for document summaries, provide clear, structured Markdown with Overview, Key Bullet Points, and Takeaways.
- If asked for translation, output clean, accurate translations preserving paragraph structure.`;

  // 1. Primary: Groq API (https://console.groq.com/keys)
  if (groqKey) {
    try {
      const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      const messages = [
        { role: 'system', content: systemInstruction }
      ];

      if (history && Array.isArray(history)) {
        history.forEach(msg => {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.text || msg.content || ''
          });
        });
      }

      messages.push({ role: 'user', content: message });

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: groqModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      if (!groqResponse.ok) {
        const errText = await groqResponse.text();
        console.error('Groq API Error Response:', errText);
        throw new Error(`Groq API responded with status ${groqResponse.status}: ${errText}`);
      }

      const groqData = await groqResponse.json();
      const answer = groqData.choices && groqData.choices[0] && groqData.choices[0].message
        ? groqData.choices[0].message.content
        : '';

      return res.status(200).json({ text: answer, response: answer, provider: 'groq', model: groqModel });
    } catch (groqErr) {
      console.error('Groq execution failed:', groqErr);
      if (!geminiKey) {
        return res.status(500).json({ error: `Groq Error: ${groqErr.message}` });
      }
      // If Gemini key is also available, seamlessly fallback to Gemini
    }
  }

  // 2. Fallback: Google Gemini API
  if (geminiKey) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });

      const contents = [];
      if (history && Array.isArray(history)) {
        history.forEach(msg => {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text || msg.content || '' }]
          });
        });
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          maxOutputTokens: 2048,
          temperature: 0.7,
        }
      });

      const answer = response.text || '';
      return res.status(200).json({ text: answer, response: answer, provider: 'gemini', model: 'gemini-2.5-flash' });
    } catch (geminiErr) {
      console.error('Gemini error:', geminiErr);
      return res.status(500).json({ error: `Gemini Error: ${geminiErr.message}` });
    }
  }
};
