import { extractText } from 'unpdf';
export async function extractPdfText(bytes) {
    const extracted = await extractText(bytes, { mergePages: false });
    const rawPages = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
    const pages = rawPages.flatMap((value, index) => {
        const text = value.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        return text ? [{ page: index + 1, text }] : [];
    });
    if (pages.length === 0) {
        throw new Error('This PDF has no selectable text. A scanned file needs a text layer before requirements can be read.');
    }
    return {
        pages,
        text: pages.map((page) => `[page ${page.page}]\n${page.text}`).join('\n\n'),
    };
}
