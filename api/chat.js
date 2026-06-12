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
    
    const systemInstruction = "You are ZapBot, the helpful AI assistant for ZapPDF. While you represent ZapPDF, you are fully capable and willing to answer ANY question the user has on ANY topic (coding, science, general knowledge, etc.). Feel free to be helpful regardless of the subject matter. If asked about ZapPDF: It's a 100% free client-side PDF compression tool. Features: High-speed local compression, customizable DPI, custom target size rasterization, and a 'Golden Solar' design.";

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
        maxOutputTokens: 800, // Increased to allow full answers to general questions
        temperature: 0.7,
      }
    });

    res.status(200).json({ text: response.text });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Failed to generate response.' });
  }
};
