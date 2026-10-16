import {icon} from '../shared/icons.mjs';

export function setupWizard() {
  return `<kalm-setup-wizard class="setup-wizard" aria-labelledby="setup-title" hidden>
    <div class="setup-progress" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0" aria-valuetext="Step 1 of 3"></div>
    <div class="setup-wizard-inner">
      <div class="setup-wizard-leading">
        <button class="setup-icon-button setup-dismiss" type="button" data-setup-dismiss aria-label="Dismiss setup" title="Dismiss setup">${icon('x')}</button>
        <h2 class="setup-label" id="setup-title" data-setup-current-title tabindex="-1">Choose language</h2>
      </div>
      <div class="setup-wizard-content">
        <section class="setup-step" data-setup-step="0" data-setup-title="Choose language" aria-labelledby="setup-title">
          <div class="setup-options" role="group" aria-label="Kalm language">
            <button type="button" data-setup-choice="dialect" data-value="kalm" aria-pressed="false">Kalm</button>
            <button type="button" data-setup-choice="dialect" data-value="kalms" aria-pressed="false">Kalm Script</button>
          </div>
        </section>
        <section class="setup-step" data-setup-step="1" data-setup-title="Choose block style" aria-labelledby="setup-title" hidden>
          <div class="setup-options" role="group" aria-label="Code block style">
            <button type="button" data-setup-choice="style" data-value="indentation" aria-pressed="false">Indentation</button>
            <button type="button" data-setup-choice="style" data-value="braces" aria-pressed="false">Braces</button>
          </div>
        </section>
        <section class="setup-step" data-setup-step="2" data-setup-title="Choose shell" aria-labelledby="setup-title" hidden>
          <div class="setup-options" role="group" aria-label="Shell" data-setup-shell-options></div>
        </section>
      </div>
      <div class="setup-wizard-footer">
        <button class="setup-icon-button setup-back" type="button" data-setup-back aria-label="Back" title="Back" hidden>${icon('arrow-left')}</button>
        <button class="setup-icon-button setup-next" type="button" data-setup-next aria-label="Next" title="Next">${icon('arrow-right')}</button>
      </div>
    </div>
  </kalm-setup-wizard>`;
}
