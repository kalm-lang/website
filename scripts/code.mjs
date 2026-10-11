import { assets } from '@kalm-lang/documentation';
import { resolve } from 'node:path';
import { createHighlighter } from 'shiki';
import { repository } from './content.mjs';
import { icon } from '../shared/icons.mjs';

export const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const grammar = assets['assets/kalm.tmLanguage.json'];
const highlighter = await createHighlighter({ themes: ['github-light', 'github-dark'],
  langs: [{ ...grammar, name: 'kalm' }, 'java', 'bash', 'xml', 'kotlin', 'json'] });
export function code(source, language = 'kalm', label = '') {
  const lang = highlighter.getLoadedLanguages().includes(language) ? language : 'text';
  const name = label || ({ kalm: 'Kalm', bash: 'Terminal', text: 'Text', java: 'Java' }[language] ?? language);
  return `<kalm-code-block><div class="code-header">
    <span class="code-caption">${icon(language === 'bash' ? 'terminal' : 'file-code')}<span>${escape(name)}</span></span>
    <span class="code-actions"></span>
    </div>${highlighter.codeToHtml(source.trimEnd(), { lang, themes: { light: 'github-light', dark: 'github-dark' } })}</kalm-code-block>`;
}
