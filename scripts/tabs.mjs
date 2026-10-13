import container from 'markdown-it-container';

// Library-backed containers keep nested groups and fenced content intact.
export function sourceInfo(info) {
  const start = info.indexOf('{');
  const [language, ...label] = (start < 0 ? info : info.slice(0, start)).trim().split(/\s+/);
  return { language, label: label.join(' '), ...(start < 0 ? {} : JSON.parse(info.slice(start))) };
}
export function tabsPlugin(md) {
  for (const name of ['tabs', 'compare', 'dialect']) md.use(container, name);
  md.core.ruler.after('inline', 'source_groups', state => {
    const lines = state.src.split('\n');
    function collect(tokens) {
      const result = [];
      for (let i = 0; i < tokens.length; i++) {
        const open = tokens[i];
        const match = /^container_(tabs|compare|dialect)_open$/.exec(open.type);
        if (!match) { result.push(open); continue; }
        const name = match[1];
        let depth = 1, end = i + 1;
        for (; end < tokens.length; end++) {
          if (tokens[end].type === open.type) depth++;
          if (tokens[end].type === 'container_' + name + '_close') depth--;
          if (!depth) break;
        }
        const closing = (lines[open.map[1]] ?? '').trim();
        if (end === tokens.length || !/^:+$/.test(closing) || closing.length < open.markup.length) throw new Error('Unclosed :::' + name + ' group');
        const children = collect(tokens.slice(i + 1, end));
        open.type = {tabs: 'code_tabs', compare: 'code_compare', dialect: 'code_dialect'}[name];
        open.nesting = 0;
        open.children = children;
        const params = open.info.trim().slice(name.length).trim();
        open.meta = name === 'compare' ? (params ? JSON.parse(params) : {}) : {dialect: params};
        if (name === 'tabs' && (children.length < 2 || children.length > 3 || children.some(t => !['fence', 'code_compare'].includes(t.type)))) throw new Error(':::tabs needs two or three fenced code blocks or comparisons');
        if (name === 'compare') {
          const variants = children.map(t => sourceInfo(t.info ?? ''));
          const languages = variants.map(v => v.language);
          open.meta.presentation ??= 'adaptive';
          open.meta.locks ??= {};
          if (!['adaptive','showcase'].includes(open.meta.presentation)) throw new Error('Invalid presentation');
          if (Object.entries(open.meta.locks).some(([key,value]) => !['dialect','style','os','shell'].includes(key) || typeof value !== 'boolean')) throw new Error('Invalid property lock');
          for (const v of variants) {
            if ((v.style && !['indentation','braces'].includes(v.style)) || (v.os && !['windows','macos','linux'].includes(v.os)) || (v.shell && !['powershell','cmd','bash','zsh'].includes(v.shell)) || (v.dialect && !['kalm','kalms'].includes(v.dialect))) throw new Error('Invalid source preference');
          }
          const keys = variants.map(v => JSON.stringify([v.language,v.style,v.os,v.shell,v.pane]));
          if (!children.length || children.some(t => t.type !== 'fence') || new Set(keys).size !== keys.length) throw new Error('Duplicate or invalid source variant');
          const terminal = languages.every(l => ['bash','zsh','powershell','batch','text'].includes(l));
          if (!terminal && languages.some(language => !['kalm', 'kalms', 'java'].includes(language))) throw new Error(':::compare needs programming or terminal sources');
          if (open.meta.scriptUnavailable && (typeof open.meta.scriptUnavailable !== 'string' || !open.meta.scriptUnavailable.trim())) throw new Error('scriptUnavailable must explain the limitation');
          if (open.meta.primary && !['kalm', 'java'].includes(open.meta.primary)) throw new Error('primary must be kalm or java');
        }
        if (name === 'dialect' && !['kalm','kalms'].includes(params)) throw new Error(':::dialect needs kalm or kalms');
        result.push(open);
        i = end;
      }
      return result;
    }
    state.tokens = collect(state.tokens);
  });
}

export function fences(tokens, dialect = 'kalm', comparisons = 'primary', style = 'indentation') {
  return tokens.flatMap(token => {
    if (token.type === 'fence') return [token];
    if (token.type === 'code_dialect' && token.meta.dialect !== dialect) return [];
    if (token.type === 'code_compare') return comparisons === 'all' ? token.children : token.children.filter(t => { const v = sourceInfo(t.info); return v.language === (comparisons === 'primary' && dialect === 'kalm' ? token.meta.primary ?? dialect : dialect) && (!v.style || v.style === style || token.meta.locks.style); });
    return token.children && token.type !== 'inline' ? fences(token.children, dialect, comparisons, style) : [];
  });
}
