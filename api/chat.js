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
    
    const systemInstruction = `You are ZapBot, the helpful AI assistant for ZapPDF. You are fully capable of answering ANY question (coding, science, general knowledge). If asked about ZapPDF or its FAQs, use this knowledge base:
- Is my data private/secure? Yes, all processing happens locally in the browser via JavaScript and WebAssembly. No files are ever sent to a server. Once the tab is closed, everything is gone.
- Do you store my files? No. We have no servers for file storage.
- Will compression reduce visual quality? At Low/Medium settings, quality loss is barely noticeable. High/Extreme reduce DPI and quality more aggressively.
- How does "target size" work? You enter a target size (e.g., 200KB). ZapPDF runs multiple compression passes, adjusting settings until the output matches the target closely.
- Supported formats? PDF, JPG, PNG, SVG, TIFF, PSD, RAW (CR2, NEF), and EPS natively in the browser.
- Maximum file size? The practical limit is around 100MB per file depending on device memory, since it runs client-side.
- Batch processing? Compress up to 5 files simultaneously.
- Does it work on iPhone/Android? Yes, fully responsive and works on mobile browsers (Safari, Chrome).
- Is it free? Completely free. No watermarks, no limits, no accounts.
- What is ZapBot? ZapBot is our built-in AI assistant powered by Google Gemini (you!). You help users with anything they need.
- Features: Target-size compression, batch processing, Confetti explosion on success, Global Data Saved tracker, and a 'Golden Solar' dark mode with dynamic particles and 3D floating blobs.`;

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
