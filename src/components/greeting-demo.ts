const names = ['Mira', 'Ari', 'Sam', 'Lena', 'Kai', 'Noah'];

export class GreetingDemo extends HTMLElement {
  private input?: HTMLInputElement;
  private output?: HTMLElement;
  private status?: HTMLElement;
  private debounce?: ReturnType<typeof setTimeout>;
  private characterTimer?: ReturnType<typeof setTimeout>;
  private generation = 0;

  private readonly onInput = () => {
    this.resizeInput();
    this.showGreeting(260);
  };

  connectedCallback() {
    this.input = this.querySelector<HTMLInputElement>('[data-greeting-name]') ?? undefined;
    this.output = this.querySelector<HTMLElement>('[data-greeting-output]') ?? undefined;
    this.status = this.querySelector<HTMLElement>('[data-greeting-status]') ?? undefined;
    if (!this.input || !this.output) return;

    this.input.value = names[Math.floor(Math.random() * names.length)];
    this.resizeInput();
    this.input.addEventListener('input', this.onInput);
    this.showGreeting(650);
  }

  disconnectedCallback() {
    this.input?.removeEventListener('input', this.onInput);
    clearTimeout(this.debounce);
    clearTimeout(this.characterTimer);
    this.generation++;
  }

  private resizeInput() {
    if (this.input) this.input.style.width = `${Math.max(4, Math.min(24, this.input.value.length + 1))}ch`;
  }

  private showGreeting(delay: number) {
    if (!this.input || !this.output) return;
    clearTimeout(this.debounce);
    clearTimeout(this.characterTimer);
    const generation = ++this.generation;
    this.output.textContent = '';
    if (this.status) this.status.textContent = '';
    this.debounce = setTimeout(() => this.typeGreeting(generation), delay);
  }

  private typeGreeting(generation: number) {
    if (!this.input || !this.output || generation !== this.generation) return;
    const name = this.input.value.trim();
    const greeting = name ? `Hello, ${name}!` : 'Hello!';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.output.textContent = greeting;
      if (this.status) this.status.textContent = greeting;
      return;
    }

    let index = 0;
    const typeNext = () => {
      if (!this.output || generation !== this.generation) return;
      this.output.textContent = greeting.slice(0, ++index);
      if (index < greeting.length) {
        this.characterTimer = setTimeout(typeNext, 24);
      } else if (this.status) {
        this.status.textContent = greeting;
      }
    };
    typeNext();
  }
}

customElements.define('kalm-greeting-demo', GreetingDemo);
