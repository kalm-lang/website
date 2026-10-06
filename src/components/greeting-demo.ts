const names = ['Mira', 'Ari', 'Sam', 'Lena', 'Kai', 'Noah'];
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class GreetingDemo extends HTMLElement {
  private input?: HTMLInputElement;
  private output?: HTMLElement;
  private loader?: HTMLElement;
  private status?: HTMLElement;
  private debounce?: ReturnType<typeof setTimeout>;
  private beforeType?: ReturnType<typeof setTimeout>;
  private characterTimer?: ReturnType<typeof setTimeout>;
  private nameTimer?: ReturnType<typeof setTimeout>;
  private nameSwapTimer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private touched = false;

  private readonly onInput = () => {
    this.markTouched();
    this.resizeInput();
    this.scheduleGreeting(320);
  };

  private readonly onFocus = () => this.markTouched();

  connectedCallback() {
    this.input = this.querySelector<HTMLInputElement>('[data-greeting-name]') ?? undefined;
    this.output = this.querySelector<HTMLElement>('[data-greeting-output]') ?? undefined;
    this.loader = this.querySelector<HTMLElement>('[data-greeting-loading]') ?? undefined;
    this.status = this.querySelector<HTMLElement>('[data-greeting-status]') ?? undefined;
    if (!this.input || !this.output) return;

    this.touched = false;
    this.input.value = names[Math.floor(Math.random() * names.length)];
    this.resizeInput();
    this.input.addEventListener('input', this.onInput);
    this.input.addEventListener('focus', this.onFocus);
    this.scheduleGreeting(650);
    this.scheduleNameChange();
  }

  disconnectedCallback() {
    this.input?.removeEventListener('input', this.onInput);
    this.input?.removeEventListener('focus', this.onFocus);
    this.clearTimers();
    this.generation++;
  }

  private clearTimers() {
    clearTimeout(this.debounce);
    clearTimeout(this.beforeType);
    clearTimeout(this.characterTimer);
    clearTimeout(this.nameTimer);
    clearTimeout(this.nameSwapTimer);
  }

  private markTouched() {
    if (this.touched) return;
    this.touched = true;
    clearTimeout(this.nameTimer);
    clearTimeout(this.nameSwapTimer);
    this.input?.classList.remove('is-changing');
  }

  private resizeInput() {
    if (this.input) this.input.style.width = `${Math.max(1, Math.min(24, this.input.value.length))}ch`;
  }

  private scheduleGreeting(debounceMs: number) {
    if (!this.input || !this.output) return;
    clearTimeout(this.debounce);
    clearTimeout(this.beforeType);
    clearTimeout(this.characterTimer);
    const generation = ++this.generation;
    this.output.textContent = '';
    if (this.status) this.status.textContent = '';
    if (this.loader) this.loader.hidden = false;
    this.debounce = setTimeout(() => {
      this.beforeType = setTimeout(() => this.typeGreeting(generation), 240);
    }, debounceMs);
  }

  private typeGreeting(generation: number) {
    if (!this.input || !this.output || generation !== this.generation) return;
    if (this.loader) this.loader.hidden = true;
    const name = this.input.value.trim();
    const greeting = name ? `Hello, ${name}!` : 'Hello!';
    if (reduceMotion()) {
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

  private scheduleNameChange() {
    clearTimeout(this.nameTimer);
    if (this.touched || !this.input) return;
    this.nameTimer = setTimeout(() => this.changeName(), 5000);
  }

  private changeName() {
    if (this.touched || !this.input) return;
    const current = this.input.value;
    const options = names.filter(name => name !== current);
    const next = options[Math.floor(Math.random() * options.length)];
    const update = () => {
      if (this.touched || !this.input) return;
      this.input.value = next;
      this.resizeInput();
      this.input.classList.remove('is-changing');
      this.scheduleGreeting(320);
      this.scheduleNameChange();
    };

    if (reduceMotion()) {
      update();
      return;
    }
    this.input.classList.add('is-changing');
    this.nameSwapTimer = setTimeout(update, 160);
  }
}

customElements.define('kalm-greeting-demo', GreetingDemo);
