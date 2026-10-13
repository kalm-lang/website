const names = ['Mira', 'Ari', 'Ava', 'Lena', 'Leo', 'Noah'];
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
  private greetingSlot() {
    const dialect = document.documentElement.dataset.dialect === 'kalms' ? 'kalms' : 'kalm';
    return this.querySelector<HTMLElement>(`[data-language="${dialect}"][data-visible="true"] [data-greeting-slot]`) ?? this.querySelector<HTMLElement>('[data-greeting-slot]');
  }
  private readonly onDialect = () => {
    if (this.input?.closest<HTMLElement>('[data-visible]')?.dataset.visible === 'true') return;
    const slot = this.greetingSlot();
    if (!slot || !this.input) return;
    const placeholder = document.createElement('span');
    placeholder.dataset.greetingSlot = '';
    placeholder.textContent = this.input.value;
    const focused = document.activeElement === this.input;
    const start = this.input.selectionStart, end = this.input.selectionEnd;
    this.input.replaceWith(placeholder);
    slot.replaceWith(this.input);
    if (focused) { this.input.focus({preventScroll:true}); this.input.setSelectionRange(start,end); }
  };

  connectedCallback() {
    this.input = this.querySelector<HTMLInputElement>('[data-greeting-name]') ?? undefined;
    if (!this.input) {
      const slot = this.greetingSlot();
      if (slot) {
        this.input = document.createElement('input');
        this.input.className = 'greeting-name';
        this.input.dataset.greetingName = '';
        this.input.maxLength = 24;
        this.input.autocomplete = 'off';
        this.input.spellcheck = false;
        this.input.setAttribute('aria-label', 'Greeting name');
        this.input.hidden = true;
        slot.replaceWith(this.input);
      }
    }
    this.output = this.querySelector<HTMLElement>('[data-greeting-output]') ?? undefined;
    this.loader = this.querySelector<HTMLElement>('[data-greeting-loading]') ?? undefined;
    this.status = this.querySelector<HTMLElement>('[data-greeting-status]') ?? undefined;
    if (!this.input || !this.output) return;

    this.touched = false;
    this.input.value = '';
    this.resizeInput();
    this.input.addEventListener('input', this.onInput);
    this.input.addEventListener('focus', this.onFocus);
    this.addEventListener('kalm-source-change', this.onDialect);
    this.scheduleGreeting(650);
    this.scheduleNameChange(0);
  }

  disconnectedCallback() {
    this.input?.removeEventListener('input', this.onInput);
    this.input?.removeEventListener('focus', this.onFocus);
    this.removeEventListener('kalm-source-change', this.onDialect);
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
    const greeting = `Hello, ${this.input.value}!`;
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

  private scheduleNameChange(delay = 20_000) {
    clearTimeout(this.nameTimer);
    if (this.touched || !this.input) return;
    this.nameTimer = setTimeout(() => this.changeName(), delay);
  }

  private changeName() {
    if (this.touched || !this.input) return;
    const options = names.filter(name => name !== this.input!.value);
    const next = options[Math.floor(Math.random() * options.length)];
    const update = () => {
      if (this.touched || !this.input) return;
      this.input.value = next;
      this.resizeInput();
      this.input.classList.remove('is-changing');
      this.input.hidden = false;
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
