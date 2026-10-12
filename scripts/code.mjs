import { createKalmHighlighter, resolveLanguage, themes } from '@kalm-lang/syntax-highlighting';
import powershell from '@shikijs/langs/powershell';
import batch from '@shikijs/langs/batch';
import { icon } from '../shared/icons.mjs';

export const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const highlighter = await createKalmHighlighter();
await highlighter.loadLanguage(powershell, batch);
export function code(source, language = 'kalm', label = '') {
  const lang = ['powershell','batch'].includes(language) ? language : resolveLanguage(language === 'zsh' ? 'bash' : language);
  const name = label || ({ kalm: 'Kalm', kalms: 'Kalm Script', bash: 'Terminal', text: 'Text', java: 'Java' }[language] ?? language);
  return `<kalm-code-block><div class="code-header">
    <span class="code-caption">${icon(['bash','zsh','powershell','batch'].includes(language) ? 'terminal' : 'file-code')}<span>${escape(name)}</span></span>
    <span class="code-actions"></span>
    </div>${highlighter.codeToHtml(source.trimEnd(), { lang, themes })}</kalm-code-block>`;
}
