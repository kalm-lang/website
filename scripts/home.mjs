import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { contentRoot, readDocument } from './content.mjs';
import { escape } from './code.mjs';
import { markdown } from './render.mjs';
import { icon } from '../shared/icons.mjs';

function noteCard(note, index) {
  const dialogId = `note-${index}-dialog`;
  return `<article class="feature">
    <a class="feature-trigger" href="${escape(note.doc)}" aria-haspopup="dialog" aria-controls="${dialogId}">
      <span class="feature-meta"><span class="feature-symbol">${icon(note.icon)}</span><span class="feature-number">${String(index + 1).padStart(2, '0')}</span></span>
      <span class="feature-title">${escape(note.title)}</span>
      <span class="feature-description">${escape(note.description)}</span>
    </a>
    <dialog class="feature-dialog" id="${dialogId}" aria-labelledby="${dialogId}-title">
      <div class="feature-dialog-header">
        <div class="feature-dialog-heading">
          <span class="feature-symbol">${icon(note.icon)}</span>
          <span class="feature-dialog-title" id="${dialogId}-title">${escape(note.title)}</span>
        </div>
        <button class="feature-close" type="button" aria-label="Close ${escape(note.title)} example">${icon('x')}</button>
      </div>
      <div class="feature-dialog-content">
      <p class="feature-dialog-description">${escape(note.description)}</p>
      <div class="prose">${markdown(note.content, note.source, `note-${index}`)}</div>
      <a class="learn-more" href="${escape(note.doc)}">Read the full guide ${icon('arrow-up-right')}</a>
      </div>
    </dialog>
  </article>`;
}
export function home() {
  const greeting = readDocument(resolve(contentRoot, 'home/greeting.md'));
  const directory = resolve(contentRoot, 'home/notes');
  const notes = readdirSync(directory).filter(file => file.endsWith('.md'))
    .map(file => readDocument(resolve(directory, file))).sort((a, b) => a.order - b.order);
  return `<main id="main" tabindex="0" class="home">
    <section class="hero">
      <div>
        <h1>A calmer way<br><em>to write for the JVM.</em></h1>
        <p class="hero-description">Friendly JVM syntax. Full access to Java libraries.</p>
        <div class="actions">
          <a class="button primary" href="/docs/quick-start/">Start writing ${icon('arrow-up-right')}</a>
          <a class="button" href="/examples/">Explore examples ${icon('arrow-right')}</a>
        </div>
      </div>
      <div class="hero-sample">
        ${markdown(greeting.content, greeting.source, 'greeting')}
      </div>
    </section>
    <section class="notes-section" aria-labelledby="language-notes">
      <div class="section-heading"><h2 id="language-notes">Language notes</h2></div>
      <div class="feature-grid">${notes.map(noteCard).join('')}</div>
    </section>
    <section class="start-box" aria-labelledby="learn-kalm">
      <div class="section-heading"><h2 id="learn-kalm">Learn Kalm</h2></div>
      <div class="start-content">
        <p>Start with a word counter. Add file input, handle errors, and finish with tests. Eight small steps, one useful program.</p>
        <a class="button" href="/learn/">Follow the learning path ${icon('arrow-right')}</a>
      </div>
    </section>
  </main>`;
}
