// Extract plain text from a PDF so topics can be found and questions generated from it.
// Uses Mozilla's pdf.js (pure JavaScript, no native dependencies).

export interface PdfText {
  text: string;
  pageCount: number;
}

export const extractPdfText = async (data: Uint8Array): Promise<PdfText> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false });
  const doc = await loadingTask.promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    const lines: string[] = [];
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      if (typeof item.str !== 'string') continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = '';
      } else if (item.str && !item.str.endsWith(' ')) {
        line += ' ';
      }
    }
    if (line) lines.push(line);
    pages.push(lines.join('\n'));
  }
  const pageCount = doc.numPages;
  await loadingTask.destroy();
  return { text: pages.join('\n\n').replace(/[ \t]+/g, ' ').trim(), pageCount };
};
