import { GuideData } from "../types";

export function exportHtmlDocument(guideData: GuideData) {
  let stepsHtml = '';
  
  guideData.steps.forEach(step => {
    const imageTag = step.screenshotDataUrl
      ? `<div class="step-image-container">
          <img src="${step.screenshotDataUrl}" alt="Step ${step.step_number} screenshot" />
         </div>`
      : `<div class="step-no-image">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-camera"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          <span>No Screenshot Captured</span>
         </div>`;

    stepsHtml += `
      <div class="step-card">
        <div class="step-media">
          ${imageTag}
          <div class="step-timestamp">⏱️ ${step.timestamp}</div>
        </div>
        <div class="step-content">
          <div class="step-badge">Step ${step.step_number}</div>
          <h3 class="step-title">${escapeHtml(step.title)}</h3>
          
          <div class="section-block">
            <span class="block-label">Instructional Action:</span>
            <p class="block-text action-text">${escapeHtml(step.action)}</p>
          </div>
          
          <div class="section-block">
            <span class="block-label">On-Screen Feedback / Visual Cue:</span>
            <p class="block-text cue-text">${escapeHtml(step.visual_cue)}</p>
          </div>
        </div>
      </div>`;
  });

  const docStr = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(guideData.guide_title)}</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-label: #64748b;
      --bg-page: #f8fafc;
      --bg-card: #ffffff;
      --border: #e2e8f0;
      --radius: 12px;
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-page);
      color: var(--text-main);
      line-height: 1.6;
      padding: 40px 20px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    /* Print Button */
    .actions-bar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }

    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: var(--primary);
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
      box-shadow: 0 2px 4px rgb(0 0 0 / 0.1);
    }

    .btn-print:hover {
      background-color: var(--primary-hover);
    }

    /* Header Card */
    .guide-header {
      background-color: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 36px;
      margin-bottom: 32px;
      box-shadow: var(--shadow);
    }

    .guide-logo {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--primary);
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }

    .guide-title {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: var(--text-main);
      margin-bottom: 16px;
      line-height: 1.25;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      margin-top: 20px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-label);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .meta-value {
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--text-muted);
    }

    .guide-summary {
      font-size: 1.05rem;
      color: var(--text-muted);
      margin-top: 16px;
    }

    /* Step Card */
    .step-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 28px;
      align-items: start;
      page-break-inside: avoid;
    }

    @media (max-width: 768px) {
      .step-card {
        grid-template-columns: 1fr;
        gap: 20px;
        padding: 20px;
      }
    }

    .step-media {
      position: relative;
      width: 100%;
    }

    .step-image-container {
      width: 100%;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid var(--border);
      background-color: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step-image-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .step-no-image {
      width: 100%;
      aspect-ratio: 16 / 10;
      background-color: #f1f5f9;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-label);
      font-size: 0.85rem;
    }

    .step-timestamp {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background-color: rgba(15, 23, 42, 0.85);
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      backdrop-filter: blur(4px);
    }

    .step-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .step-badge {
      align-self: flex-start;
      background-color: #eff6ff;
      color: var(--primary);
      border: 1px solid #dbeafe;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 9999px;
      letter-spacing: 0.02em;
    }

    .step-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
      line-height: 1.3;
    }

    .section-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .block-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-label);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .block-text {
      font-size: 0.95rem;
      color: var(--text-muted);
    }

    .action-text {
      font-weight: 500;
      color: #1e293b;
    }

    .cue-text {
      font-style: italic;
      color: #475569;
    }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      color: var(--text-label);
      font-size: 0.8rem;
    }

    /* Print Styles */
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .actions-bar {
        display: none;
      }
      .guide-header, .step-card {
        border: none;
        box-shadow: none;
        padding: 0;
        margin-bottom: 40px;
      }
      .guide-header {
        border-bottom: 2px solid #000;
        padding-bottom: 20px;
      }
      .step-card {
        page-break-inside: avoid;
        border-bottom: 1px solid #ccc;
        padding-bottom: 30px;
      }
      .footer {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="actions-bar">
      <button class="btn-print" onclick="window.print()">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
        <span>Print or Save to PDF</span>
      </button>
    </div>

    <header class="guide-header">
      <div class="guide-logo">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M6 6h10M6 10h10"/></svg>
        <span>AI Generated User Guide</span>
      </div>
      <h1 class="guide-title">${escapeHtml(guideData.guide_title)}</h1>
      
      <p class="guide-summary">${escapeHtml(guideData.summary)}</p>

      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Target Audience</span>
          <span class="meta-value">${escapeHtml(guideData.target_audience)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Total Steps</span>
          <span class="meta-value">${guideData.steps.length} Steps</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Generated On</span>
          <span class="meta-value">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>
    </header>

    <main class="steps-container">
      ${stepsHtml}
    </main>

    <footer class="footer">
      Generated beautifully by <strong>AI Guide Builder</strong>
    </footer>
  </div>
</body>
</html>`;

  const blob = new Blob([docStr], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = guideData.guide_title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_guide.html';
  link.click();
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
