import {icon} from '../shared/icons.mjs';

function sunlight() {
  const rays = Array.from({length: 14}, (_, index) => {
    const halfWidth = (index % 3 === 0 ? 2.6 : 1.8) * Math.PI / 180;
    const x = (Math.cos(halfWidth) * 1000).toFixed(2);
    const y = (Math.sin(halfWidth) * 1000).toFixed(2);
    return `<path d="M 0 0 L ${x} -${y} L ${x} ${y} Z" transform="rotate(${-70 + index * 140 / 13})"/>`;
  }).join('');
  return `<div class="setup-sunlight" aria-hidden="true" hidden>
    <svg class="setup-sunlight-rays" viewBox="-1000 -1000 2000 2000" focusable="false">
      <defs>
        <radialGradient id="setup-sunlight-fade" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1000">
          <stop offset="0" stop-color="currentColor" stop-opacity="0"/>
          <stop offset=".08" stop-color="currentColor" stop-opacity=".7"/>
          <stop offset=".28" stop-color="currentColor"/>
          <stop offset=".74" stop-color="currentColor" stop-opacity=".28"/>
          <stop offset="1" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <g fill="url(#setup-sunlight-fade)">${rays}</g>
    </svg>
  </div>`;
}

function choice(setting, value, title, description, example) {
  return `<button class="setup-choice" type="button" data-setup-choice="${setting}" data-value="${value}" aria-pressed="false">
    <span class="setup-choice-heading"><strong>${title}</strong>${icon('arrow-right')}</span>
    <span class="setup-choice-description">${description}</span>
    <span class="setup-example"><code>${example}</code></span>
  </button>`;
}

export function setupWizard() {
  return `<kalm-setup-wizard class="setup-wizard" aria-label="Personalize your examples" hidden>
    <div class="setup-welcome" aria-hidden="true">
      <span class="setup-welcome-line" data-welcome-line="welcome">Hi there</span>
      <span class="setup-welcome-line" data-welcome-line="setup">Let’s set this up</span>
    </div>
    <div class="setup-wizard-inner">
      <button class="setup-icon-button setup-dismiss" type="button" data-setup-dismiss aria-label="Dismiss setup" title="Dismiss setup">${icon('x')}</button>
      <div class="setup-invitation">
        <span class="setup-invitation-copy">Choose how you write Kalm and use your terminal</span>
      </div>
      <button class="setup-start" type="button" data-setup-open aria-haspopup="dialog" aria-controls="setup-dialog">Let’s set up ${icon('arrow-up-right')}</button>
    </div>
    <dialog class="setup-dialog" id="setup-dialog" aria-labelledby="setup-heading-language" aria-describedby="setup-description-language">
      ${sunlight()}
      <div class="setup-dialog-surface">
      <div class="setup-dialog-header"><span>Setup</span><button class="setup-icon-button" type="button" data-setup-close aria-label="Close setup" title="Close setup">${icon('x')}</button></div>
      <div class="setup-dialog-progress" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0"><span></span></div>
      <div class="setup-stage">
        <section data-setup-step="0" data-setup-heading="setup-heading-language" data-setup-description="setup-description-language">
          <h2 id="setup-heading-language" tabindex="-1">What would you like to write?</h2>
          <p class="setup-description" id="setup-description-language">Choose a starting point for the code examples you’ll see here.</p>
          <div class="setup-choices">
            ${choice('dialect', 'kalm', 'Kalm', 'Build applications and libraries. Your program starts in a main function.', '<span>pub fun</span> main() -&gt; Unit:\n    sayLine(<em>"Hello"</em>)')}
            ${choice('dialect', 'kalms', 'Kalm Script', 'Write quick scripts. Start with a statement and get straight to it.', 'sayLine(<em>"Hello"</em>)')}
          </div>
        </section>
        <section data-setup-step="1" data-setup-heading="setup-heading-style" data-setup-description="setup-description-style" hidden>
          <h2 id="setup-heading-style" tabindex="-1">How do you like your blocks?</h2>
          <p class="setup-description" id="setup-description-style">The same code, two ways to lay it out. Pick what feels natural.</p>
          <div class="setup-choices">
            ${choice('style', 'indentation', 'Indentation', 'Keep it light. Indent to show which lines belong together.', '<span>fun</span> hello() -&gt; Unit:\n    sayLine(<em>"Hello"</em>)')}
            ${choice('style', 'braces', 'Braces', 'Make the boundaries explicit with opening and closing braces.', '<span>fun</span> hello() -&gt; Unit {\n    sayLine(<em>"Hello"</em>)\n}')}
          </div>
        </section>
        <section data-setup-step="2" data-setup-heading="setup-heading-shell" data-setup-description="setup-description-shell" hidden>
          <h2 id="setup-heading-shell" tabindex="-1">Which shell do you use?</h2>
          <p class="setup-description" id="setup-description-shell">We’ll match installation commands to your terminal.</p>
          <div class="setup-choices setup-shell-choices" data-setup-shell-options></div>
        </section>
        <section class="setup-complete" data-setup-step="3" data-setup-heading="setup-heading-done" data-setup-description="setup-description-done" hidden>
          <span class="setup-success" aria-hidden="true">${icon('check')}</span>
          <h2 id="setup-heading-done" tabindex="-1">You’re all set</h2>
          <p class="setup-description" id="setup-description-done">Click the gear ${icon('settings')} to change this anytime.</p>
          <button class="setup-finish" type="button" data-setup-finish>Start exploring ${icon('arrow-right')}</button>
        </section>
      </div>
      <div class="setup-dialog-footer">
        <button class="setup-icon-button" type="button" data-setup-back aria-label="Previous step" title="Previous step">${icon('arrow-left')}</button>
        <span data-setup-position>1 of 3</span>
        <button class="setup-icon-button" type="button" data-setup-next aria-label="Next step" title="Next step">${icon('arrow-right')}</button>
      </div>
      </div>
    </dialog>
  </kalm-setup-wizard>`;
}
