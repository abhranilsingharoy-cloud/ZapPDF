// pdf-to-markdown.js - Extract formatted Markdown from PDF using pdf.js text items and font heuristics

window.convertToMarkdown = async function(file, onProgress) {
    if (!window.pdfjsLib) {
        throw new Error("pdf.js library is not loaded.");
    }
    
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    let fullMarkdown = '';
    const allItems = [];

    // First pass: collect items and compute global font size statistics
    let totalFontSize = 0;
    let totalItems = 0;

    for (let p = 1; p <= numPages; p++) {
        if (onProgress) onProgress(Math.round((p / numPages) * 40));
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        for (const item of tc.items) {
            if (item.str && item.str.trim()) {
                const fontSize = item.transform ? Math.abs(item.transform[0] || item.transform[3] || 12) : 12;
                totalFontSize += fontSize;
                totalItems++;
            }
        }
    }

    const avgFontSize = totalItems > 0 ? (totalFontSize / totalItems) : 12;

    // Second pass: structure each page into Markdown
    for (let p = 1; p <= numPages; p++) {
        if (onProgress) onProgress(40 + Math.round((p / numPages) * 55));
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();

        // Sort items: top-to-bottom (y descending), then left-to-right (x ascending)
        const items = tc.items.filter(it => it.str && it.str.length > 0).sort((a, b) => {
            const ay = a.transform ? a.transform[5] : 0;
            const by = b.transform ? b.transform[5] : 0;
            if (Math.abs(ay - by) > 4) {
                return by - ay; // higher y first
            }
            const ax = a.transform ? a.transform[4] : 0;
            const bx = b.transform ? b.transform[4] : 0;
            return ax - bx;
        });

        // Group into lines based on y-coordinate proximity
        const lines = [];
        let currentLine = [];
        let currentLineY = null;
        let currentLineMaxFont = 12;

        for (const item of items) {
            const y = item.transform ? Math.round(item.transform[5]) : 0;
            const fontSize = item.transform ? Math.abs(item.transform[0] || item.transform[3] || 12) : 12;

            if (currentLineY !== null && Math.abs(y - currentLineY) > 5) {
                if (currentLine.length > 0) {
                    lines.push({
                        text: currentLine.join(' ').replace(/\s+/g, ' ').trim(),
                        fontSize: currentLineMaxFont
                    });
                }
                currentLine = [];
                currentLineMaxFont = fontSize;
            } else {
                currentLineMaxFont = Math.max(currentLineMaxFont, fontSize);
            }

            currentLine.push(item.str);
            currentLineY = y;
        }

        if (currentLine.length > 0) {
            lines.push({
                text: currentLine.join(' ').replace(/\s+/g, ' ').trim(),
                fontSize: currentLineMaxFont
            });
        }

        if (numPages > 1) {
            fullMarkdown += `\n\n---\n\n### Page ${p}\n\n`;
        }

        // Convert lines to Markdown constructs
        for (const lineObj of lines) {
            const text = lineObj.text;
            if (!text) continue;

            const ratio = lineObj.fontSize / avgFontSize;

            // Check if heading
            if (ratio >= 1.7 && text.length < 120) {
                fullMarkdown += `\n# ${text}\n\n`;
            } else if (ratio >= 1.35 && text.length < 150) {
                fullMarkdown += `\n## ${text}\n\n`;
            } else if (ratio >= 1.15 && text.length < 180 && (text === text.toUpperCase() || /^[A-Z0-9\s:.-]+$/.test(text))) {
                fullMarkdown += `\n### ${text}\n\n`;
            } else if (/^[-*•]\s+/.test(text)) {
                // Bullet list item
                fullMarkdown += `* ${text.replace(/^[-*•]\s+/, '')}\n`;
            } else if (/^\d+[\.)]\s+/.test(text)) {
                // Numbered list item
                fullMarkdown += `${text}\n`;
            } else if (/^(note|warning|important|caution):/i.test(text)) {
                // Blockquote
                fullMarkdown += `> ${text}\n\n`;
            } else {
                // Standard paragraph text
                fullMarkdown += `${text}\n\n`;
            }
        }
    }

    if (onProgress) onProgress(100);
    return fullMarkdown.trim();
};
