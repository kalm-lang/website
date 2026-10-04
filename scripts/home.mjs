import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { contentRoot, readDocument } from './content.mjs';
import { escape } from './code.mjs';
import { markdown } from './render.mjs';
import { icon } from '../shared/icons.mjs';

function noteCard(note, index) {
  return `<details class="feature" data-reveal>
    <summary>
      <span class="feature-symbol">${icon(note.icon)}</span>
      <span class="feature-title">${escape(note.title)}</span>
      <span class="feature-description">${escape(note.description)}</span>
      <code class="feature-preview">${escape(note.preview)}</code>
      <span class="feature-toggle">${icon('chevron-down')}</span>
    </summary>
    <div class="feature-body">${markdown(note.content, note.source, `note-${index}`)}
      <a class="learn-more" href="${escape(note.doc)}">Learn more ${icon('arrow-up-right')}</a>
    </div>
  </details>`;
}
export function home() {
  const greeting = readDocument(resolve(contentRoot, 'home/greeting.md'));
  const learning = readDocument(resolve(contentRoot, 'home/learning.md'));
  const directory = resolve(contentRoot, 'home/notes');
  const notes = readdirSync(directory).filter(file => file.endsWith('.md'))
    .map(file => readDocument(resolve(directory, file))).sort((a, b) => a.order - b.order);
  return `<main id="main" class="home">
    <section class="hero">
      <div data-reveal>
        <h1>Less ceremony.<br><em>More JVM.</em></h1>
        <p class="hero-description">A little room to think. Explicit nullability, steady values, and the Java libraries you already know.</p>
        <div class="actions">
          <a class="button primary" href="/docs/quick-start/">Start writing ${icon('arrow-up-right')}</a>
          <a class="button" href="/examples/">Explore examples ${icon('arrow-right')}</a>
        </div>
      </div>
      <div class="hero-sample" data-reveal>
        ${markdown(greeting.content, greeting.source, 'greeting')}
      </div>
    </section>
    <section class="notes-section" aria-labelledby="language-notes">
      <div class="section-heading"><h2 id="language-notes">Language notes</h2>${icon('book-open')}</div>
      <div class="feature-grid">${notes.map(noteCard).join('')}</div>
    </section>
    <section class="start-box" data-reveal aria-labelledby="learn-kalm">
      <div>
        <h2 id="learn-kalm">Learn Kalm</h2>
        <p>Start with a word counter. Add file input, handle errors, and finish with tests. Eight small steps, one useful program.</p>
        <a class="learn-more" href="/learn/">Follow the learning path ${icon('arrow-right')}</a>
      </div>
      <div class="learning-sample">
        ${markdown(learning.content, learning.source, 'learning')}
      </div>
    </section>
  </main>`;
}
