import * as highlighting from '@kalm-lang/syntax-highlighting';
import powershell from '@shikijs/langs/powershell';
import batch from '@shikijs/langs/batch';
import {icon} from '../shared/icons.mjs';

export const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const highlighter = await highlighting.createKalmHighlighter();
if (typeof highlighter.loadLanguage === 'function') await highlighter.loadLanguage(powershell, batch);
const legacyHighlighter = await highlighting.createKalmHighlighter({ edition: 'legacy' });
const themes = highlighting.themes ?? { light: 'github-light', dark: 'github-dark' };
const loaded = highlighter.getLoadedLanguages?.() ?? highlighting.languages ?? ['kalm', 'java', 'bash', 'xml', 'kotlin', 'json'];
const resolveLanguage = highlighting.resolveLanguage ?? (language => ({ kalms: 'kalm', sh: 'bash', shell: 'bash', kt: 'kotlin' }[language] ?? language));
export function code(source, language = 'kalm', label = '', edition = '1.2') {
  const resolved = ['powershell','batch'].includes(language) ? language : resolveLanguage(language === 'zsh' ? 'bash' : language);
  const lang = loaded.includes(resolved) ? resolved : 'text';
  const name = label || ({ kalm: 'Kalm', kalms: 'Kalm Script', bash: 'Terminal', text: 'Text', java: 'Java' }[language] ?? language);
  return `<kalm-code-block><div class="code-header">
    <span class="code-caption">${icon(['bash','zsh','powershell','batch'].includes(language) ? 'terminal' : 'file-code')}<span>${escape(name)}</span></span>
    <span class="code-actions"></span>
    </div>${(edition === 'legacy' ? legacyHighlighter : highlighter).codeToHtml(source.trimEnd(), { lang, themes })}</kalm-code-block>`;
}
