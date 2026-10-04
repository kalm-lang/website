// A tab group contains two or three fenced blocks; fence labels become tab names.
export function tabsPlugin(md) {
  md.block.ruler.before('fence', 'code_tabs', (state, start, end, silent) => {
    const line = state.src.slice(state.bMarks[start] + state.tShift[start], state.eMarks[start]);
    if (line.trim() !== ':::tabs') return false;
    if (silent) return true;
    let close = start + 1;
    while (close < end && state.src.slice(state.bMarks[close], state.eMarks[close]).trim() !== ':::') close++;
    if (close === end) throw new Error('Unclosed :::tabs group');
    const body = state.src.slice(state.bMarks[start + 1], state.bMarks[close]);
    const children = md.parse(body, state.env);
    if (children.length < 2 || children.length > 3 || children.some(token => token.type !== 'fence')) {
      throw new Error(':::tabs needs two or three fenced code blocks');
    }
    const token = state.push('code_tabs', '', 0);
    token.children = children;
    state.line = close + 1;
    return true;
  });
}
