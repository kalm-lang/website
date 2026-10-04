import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { contentRoot, readDocument } from './content.mjs';
import { code, escape } from './code.mjs';
import { markdown } from './render.mjs';

function noteCard(note, index) {
  return `<details class="feature" data-reveal>
    <summary>
      <span class="feature-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
      <span class="feature-title">${escape(note.title)}</span>
      <span class="feature-description">${escape(note.description)}</span>
      <code class="feature-preview">${escape(note.preview)}</code>
      <span class="feature-toggle" aria-hidden="true">+</span>
    </summary>
    <div class="feature-body">${markdown(note.content, note.source, `note-${index}`)}
      <a class="learn-more" href="${escape(note.doc)}">Learn more <span aria-hidden="true">↗</span></a>
    </div>
  </details>`;
}
export function home() {
  const greeting = readDocument(resolve(contentRoot, 'home/greeting.md'));
  const directory = resolve(contentRoot, 'home/notes');
  const notes = readdirSync(directory).filter(file => file.endsWith('.md'))
    .map(file => readDocument(resolve(directory, file))).sort((a, b) => a.order - b.order);
  return `<main id="main" class="home">
    <section class="hero">
      <div data-reveal>
        <h1>Less ceremony.<br><em>More JVM.</em></h1>
        <p class="hero-description">A little room to think. Explicit nullability, steady values, and the Java libraries you already know.</p>
        <div class="actions">
          <a class="button primary" href="/docs/quick-start/">Start writing <span aria-hidden="true">↗</span></a>
          <a class="button" href="/examples/">Explore examples <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <div class="terminal" data-reveal>
        <div class="terminal-bar"><span class="file-mark" aria-hidden="true">⌘</span> App.kalm</div>
        ${markdown(greeting.content, greeting.source, 'greeting')}
        <div class="terminal-output">$ kalm run<strong>Hello, Guest!</strong></div>
      </div>
    </section>
    <section class="notes-section" aria-labelledby="language-notes">
      <div class="section-heading"><h2 id="language-notes">Language notes<span aria-hidden="true">↴</span></h2></div>
      <div class="feature-grid">${notes.map(noteCard).join('')}</div>
    </section>
    <section class="start-box" data-reveal aria-labelledby="learn-kalm">
      <div>
        <h2 id="learn-kalm">Learn Kalm</h2>
        <p>One small program, a few new ideas. Read a file, count its words, and give your text-statistics CLI a set of tests.</p>
        <a class="learn-more" href="/learn/">Follow the learning path <span aria-hidden="true">→</span></a>
      </div>
      <div class="learning-sample">
        ${code('kalm run -- notes.txt', 'bash')}
        <p class="sample-result">2 lines / 3 words</p>
      </div>
    </section>
  </main>`;
}
