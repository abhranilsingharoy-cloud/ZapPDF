// html-to-pdf.js — HTML/URL to PDF via browser print dialog
// Supports: raw HTML input, URL input (opens in iframe), or current page print

window.ZapHTMLtoPDF = {
  state: { phase: 'idle', mode: 'html' },

  init() {
    this.buildUI();
  },

  buildUI() {
    const workspace = document.querySelector('.tool-workspace') || document.querySelector('main') || document.body;
    
    // Find or create the tool section
    let toolSection = document.getElementById('html-pdf-tool');
    if (!toolSection) {
      toolSection = document.createElement('div');
      toolSection.id = 'html-pdf-tool';
      toolSection.style.cssText = 'max-width:700px;margin:0 auto;padding:0 16px;';
      // Insert after upload zone if it exists, else after h1
      const uploadZone = document.getElementById('upload-zone');
      if (uploadZone) {
        uploadZone.style.display = 'none'; // hide default upload zone
        uploadZone.parentNode.insertBefore(toolSection, uploadZone.nextSibling);
      } else {
        const h1 = workspace.querySelector('h1');
        if (h1) h1.parentNode.insertBefore(toolSection, h1.nextSibling);
        else workspace.prepend(toolSection);
      }
    }

    toolSection.innerHTML = `
      <div style="margin-bottom:20px;">
        <div style="display:flex;gap:8px;margin-bottom:16px;background:var(--color-surface-2);border-radius:10px;padding:4px;">
          <button class="tab-btn active" id="tab-html" style="flex:1;padding:8px 12px;border:none;background:var(--color-surface);border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;color:var(--color-primary);">✏️ HTML Input</button>
          <button class="tab-btn" id="tab-url" style="flex:1;padding:8px 12px;border:none;background:transparent;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;color:var(--color-text-muted);">🔗 URL (Open)</button>
        </div>
        
        <div id="panel-html">
          <label style="font-size:13px;font-weight:500;color:var(--color-text-muted);display:block;margin-bottom:6px;">Paste your HTML code:</label>
          <textarea id="html-input" placeholder="&lt;!DOCTYPE html&gt;&#10;&lt;html&gt;&#10;&lt;body&gt;&#10;  &lt;h1&gt;My Document&lt;/h1&gt;&#10;  &lt;p&gt;Hello world!&lt;/p&gt;&#10;&lt;/body&gt;&#10;&lt;/html&gt;" style="width:100%;height:200px;padding:12px;font-family:monospace;font-size:13px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:8px;color:var(--color-text);resize:vertical;box-sizing:border-box;"></textarea>
        </div>
        
        <div id="panel-url" style="display:none;">
          <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:12px;font-size:13px;color:#92400e;">
            <strong>⚠️ Note:</strong> Due to browser security (CORS), not all websites can be loaded. This works best with URLs you control or public pages that allow framing.
          </div>
          <label style="font-size:13px;font-weight:500;color:var(--color-text-muted);display:block;margin-bottom:6px;">Enter a URL to convert:</label>
          <div style="display:flex;gap:8px;">
            <input id="url-input" type="url" placeholder="https://example.com" style="flex:1;padding:10px 12px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:8px;color:var(--color-text);font-size:14px;">
            <button id="btn-load-url" class="btn btn-outline">Load</button>
          </div>
          <iframe id="url-frame" style="width:100%;height:300px;margin-top:12px;border:1px solid var(--color-border);border-radius:8px;display:none;background:#fff;"></iframe>
        </div>
        
        <div style="margin-top:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <button id="btn-print-pdf" class="btn btn-primary" style="min-width:180px;">
            🖨️ Print to PDF
          </button>
          <button id="btn-preview" class="btn btn-outline">Preview</button>
        </div>
        
        <div id="preview-pane" style="display:none;margin-top:16px;border:1px solid var(--color-border);border-radius:8px;overflow:hidden;">
          <div style="background:var(--color-surface-2);padding:8px 12px;font-size:12px;color:var(--color-text-muted);border-bottom:1px solid var(--color-border);">Preview</div>
          <iframe id="preview-frame" style="width:100%;height:400px;border:none;background:#fff;"></iframe>
        </div>
        
        <div style="margin-top:20px;padding:16px;background:var(--color-surface-2);border-radius:8px;font-size:13px;color:var(--color-text-muted);">
          <strong style="color:var(--color-text);">How to save as PDF:</strong>
          <ol style="margin:8px 0 0;padding-left:20px;line-height:1.8;">
            <li>Click <strong>"Print to PDF"</strong> above</li>
            <li>In the print dialog, set <strong>Destination → Save as PDF</strong></li>
            <li>Adjust page size, margins, and orientation as needed</li>
            <li>Click <strong>Save</strong> to download your PDF</li>
          </ol>
        </div>
      </div>`;

    this.bindTabEvents();
  },

  bindTabEvents() {
    const tabHTML = document.getElementById('tab-html');
    const tabURL = document.getElementById('tab-url');
    const panelHTML = document.getElementById('panel-html');
    const panelURL = document.getElementById('panel-url');
    const btnPrint = document.getElementById('btn-print-pdf');
    const btnPreview = document.getElementById('btn-preview');
    const btnLoadURL = document.getElementById('btn-load-url');

    if (tabHTML) tabHTML.addEventListener('click', () => {
      this.state.mode = 'html';
      tabHTML.style.cssText = 'flex:1;padding:8px 12px;border:none;background:var(--color-surface);border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;color:var(--color-primary);';
      tabURL.style.cssText = 'flex:1;padding:8px 12px;border:none;background:transparent;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;color:var(--color-text-muted);';
      panelHTML.style.display = '';
      panelURL.style.display = 'none';
    });

    if (tabURL) tabURL.addEventListener('click', () => {
      this.state.mode = 'url';
      tabURL.style.cssText = 'flex:1;padding:8px 12px;border:none;background:var(--color-surface);border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;color:var(--color-primary);';
      tabHTML.style.cssText = 'flex:1;padding:8px 12px;border:none;background:transparent;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;color:var(--color-text-muted);';
      panelHTML.style.display = 'none';
      panelURL.style.display = '';
    });

    if (btnLoadURL) btnLoadURL.addEventListener('click', () => {
      const url = document.getElementById('url-input')?.value?.trim();
      if (!url) return;
      const frame = document.getElementById('url-frame');
      if (frame) { frame.src = url; frame.style.display = ''; }
    });

    if (btnPreview) btnPreview.addEventListener('click', () => {
      const pane = document.getElementById('preview-pane');
      const frame = document.getElementById('preview-frame');
      if (!pane || !frame) return;
      const html = document.getElementById('html-input')?.value;
      if (this.state.mode === 'html') {
        if (!html) { alert('Please enter some HTML first.'); return; }
        pane.style.display = '';
        frame.srcdoc = html;
      }
    });

    if (btnPrint) btnPrint.addEventListener('click', () => this.printToPDF());
  },

  printToPDF() {
    const mode = this.state.mode;

    if (mode === 'url') {
      const url = document.getElementById('url-input')?.value?.trim();
      if (!url) { alert('Please enter a URL first.'); return; }
      // Open in new window and print from there
      const win = window.open(url, '_blank');
      if (!win) { alert('Popup blocked. Please allow popups for this site and try again.'); return; }
      win.addEventListener('load', () => {
        setTimeout(() => win.print(), 800);
      });
      return;
    }

    // HTML mode
    const html = document.getElementById('html-input')?.value?.trim();
    if (!html) { alert('Please enter some HTML to convert.'); return; }

    // Inject print styles if not present
    const printDoc = html.includes('<html') ? html : `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; margin: 1.5cm; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>${html}</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:none;top:-9999px;left:-9999px;';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(printDoc);
    iframe.contentDocument.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 3000);
      }, 300);
    };
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ZapHTMLtoPDF.init();
});
