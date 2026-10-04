import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHighlighter } from 'shiki';
import { repository } from './content.mjs';

export const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const grammar = JSON.parse(readFileSync(resolve(repository, 'extensions/vscode-kalm/syntaxes/kalm.tmLanguage.json'), 'utf8'));
const highlighter = await createHighlighter({ themes: ['github-light', 'github-dark'],
  langs: [{ ...grammar, name: 'kalm' }, 'java', 'bash', 'xml', 'kotlin', 'json'] });
export function code(source, language = 'kalm') {
  const lang = highlighter.getLoadedLanguages().includes(language) ? language : 'text';
  return `<kalm-code-block>${highlighter.codeToHtml(source.trimEnd(), { lang, themes: { light: 'github-light', dark: 'github-dark' } })}</kalm-code-block>`;
}
