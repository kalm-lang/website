import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { code, repository, escape } from './render.mjs';

const features = [
  ['Absence has a type.', 'Safe access and lazy fallbacks make nullable values visible at the call site.', 'Text? / ?. / ??'],
  ['Values stay put.', 'Immutable bindings and JVM records keep everyday data small and explicit.', 'fix / data'],
  ['Java stays within reach.', 'Call libraries directly. Java sees ordinary methods, records, and interfaces.', 'use java.time.LocalDate;'],
  ['Two ways to breathe.', 'Indented suites for a light layout. Braces when explicit boundaries suit the code.', 'fun main():'],
  ['Concurrency, without ceremony.', 'Virtual-thread tasks and blocking await use the JDK rather than a separate runtime model.', 'task / async / await'],
  ['Tools share one compiler.', 'CLI, Maven, Gradle, and editor services agree on the language they compile.', 'check / run / test / format'],
];

function featureCard([title, description, sample], index) {
  return `<article class="feature" data-reveal>
    <span class="feature-number">[0${index + 1}]</span>
    <h3>${escape(title)}</h3>
    <p>${escape(description)}</p>
    <code>${escape(sample)}</code>
  </article>`;
}

export function home() {
  const greeting = readFileSync(resolve(repository, 'examples/hello/src/main/kalm/example/App.kalm'), 'utf8');
  return `<main id="main" class="home">
    <section class="hero">
      <div data-reveal>
        <p class="eyebrow">a compact language for the JVM</p>
        <h1>Less ceremony.<br><em>More JVM.</em></h1>
        <p class="hero-description">Explicit nullability. Immutable bindings. Readable Java underneath. Kalm keeps the code close to what you mean.</p>
        <div class="actions">
          <a class="button primary" href="/docs/quick-start/">start writing <span>↗</span></a>
          <a class="button" href="/examples/">read the examples <span>→</span></a>
        </div>
      </div>
      <div class="terminal" data-reveal>
        <div class="terminal-bar">example/App.kalm <span>UTF-8 · Kalm</span></div>
        ${code(greeting)}
        <div class="terminal-output">$ kalm run<strong>Hello, Guest!</strong></div>
      </div>
    </section>
    <div class="strip">
      <span><b>01</b> JVM bytecode</span>
      <span><b>02</b> Java interoperability</span>
      <span><b>03</b> JDK 25+</span>
      <span><b>04</b> open source / MIT</span>
    </div>
    <section>
      <div class="section-heading">
        <span class="eyebrow">language notes</span><h2>Small syntax. Real machinery.</h2>
      </div>
      <div class="feature-grid">${features.map(featureCard).join('')}</div>
    </section>
    <section class="start-box" data-reveal>
      <div>
        <p class="eyebrow">from the first line</p><h2>A greeting is enough to begin.</h2>
        <p>Build Kalm locally, create a project, then work through the tutorial toward a concurrent task-report CLI.</p>
        <a href="/tutorial/">follow the learning path →</a>
      </div>
      <div>
        ${code('kalm init hello\ncd hello\nkalm run\nkalm test', 'bash')}
        <p class="eyebrow">Install Kalm first. Full JDK 25+ required.</p>
      </div>
    </section>
  </main>`;
}
