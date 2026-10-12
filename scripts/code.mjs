import { createKalmHighlighter, resolveLanguage, themes } from '@kalm-lang/syntax-highlighting';
import { icon } from '../shared/icons.mjs';

export const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const highlighter = await createKalmHighlighter();
export function code(source, language = 'kalm', label = '') {
  const lang = resolveLanguage(language);
  const name = label || ({ kalm: 'Kalm', kalms: 'Kalm Script', bash: 'Terminal', text: 'Text', java: 'Java' }[language] ?? language);
  return `<kalm-code-block><div class="code-header">
    <span class="code-caption">${icon(language === 'bash' ? 'terminal' : 'file-code')}<span>${escape(name)}</span></span>
    <span class="code-actions"></span>
    </div>${highlighter.codeToHtml(source.trimEnd(), { lang, themes })}</kalm-code-block>`;
}
