import {
    ArrowLeft,
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    Braces,
    Check,
    ChevronDown,
    CircleHelp,
    CodeXml,
    Columns2,
    Copy,
    FileCode,
    Layers,
    Link,
    Menu,
    Monitor,
    Moon,
    Plus,
    Route,
    Rows2,
    Search,
    Settings,
    SlidersHorizontal,
    Sun,
    Terminal,
    Timer,
    X
} from 'lucide';

const nodes = { 'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, 'arrow-up-right': ArrowUpRight,
  'book-open': BookOpen, braces: Braces, check: Check, 'chevron-down': ChevronDown,
  'circle-help': CircleHelp, 'code-xml': CodeXml, copy: Copy, 'file-code': FileCode,
  layers: Layers, link: Link, menu: Menu, monitor: Monitor, moon: Moon, plus: Plus,
  route: Route, search: Search, sun: Sun, terminal: Terminal, timer: Timer, x: X,
  'columns-2': Columns2, 'rows-2': Rows2, 'sliders-horizontal': SlidersHorizontal, settings: Settings };

// Render the same Lucide nodes at build time and during browser enhancement.
// All SVGs are decorative; their enclosing controls provide accessible names.
export function icon(name) {
  if (!Object.hasOwn(nodes, name)) throw new Error(`Unknown icon: ${name}`);
  const shapes = nodes[name].map(([tag, attributes]) => {
    const attrs = Object.entries(attributes).map(([key, value]) =>
      `${key}="${String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`).join(' ');
    return `<${tag} ${attrs}></${tag}>`;
  }).join('');
  return `<svg class="lucide icon icon-${name}" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes}</svg>`;
}
