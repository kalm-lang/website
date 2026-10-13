import MarkdownIt from 'markdown-it';
import {sourceInfo, tabsPlugin} from './tabs.mjs';

// Detect authored features rather than tying independent package versions together.
export function contentCapabilities(documents) {
  const md = new MarkdownIt().use(tabsPlugin);
  const features = { dialect: false, style: false, environment: false };
  function inspect(tokens) {
    for (const token of tokens) {
      if (token.type === 'code_dialect' && token.meta.dialect === 'kalms') features.dialect = true;
      if (token.type === 'fence') {
        const source = sourceInfo(token.info);
        if (source.language === 'kalms') features.dialect = true;
        if (source.style === 'braces') features.style = true;
        if (source.os || source.shell) features.environment = true;
      }
      if (token.children && token.type !== 'inline') inspect(token.children);
    }
  }
  for (const document of Object.values(documents)) {
    if (document.file?.startsWith('content/')) inspect(md.parse(document.content, {}));
  }
  return features;
}
