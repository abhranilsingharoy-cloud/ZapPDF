const { GoogleGenAI } = require('@google/genai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const { message, history } = req.body;
    
    if (!message) return res.status(400).json({ error: 'Message is required' });
    
    const systemInstruction = "You are ZapBot, the helpful AI assistant for ZapPDF, a 100% free client-side PDF compression tool. Keep responses concise (under 2 paragraphs), friendly, and helpful. Do not offer features we don't have. ZapPDF features: High-speed local compression (no servers/uploads), customizable DPI/levels, custom exact target size rasterization, bulk processing to ZIP, and a 'Golden Solar' dark mode design. Only talk about ZapPDF and PDF-related questions.";

    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 250, // Keep responses short
        temperature: 0.7,
      }
    });

    res.status(200).json({ text: response.text });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Failed to generate response.' });
  }
};
