/**
 * RetroWebLauncher - Alphabet Bar Component
 * Reusable A-Z quick navigation bar for game lists
 */

const { LitElement, html, css } = window.Lit;

class RwlAlphabetBar extends LitElement {
  static properties = {
    letters: { type: Array },        // Available letters with games
    currentLetter: { type: String }, // Currently selected letter
    orientation: { type: String },   // 'horizontal' or 'vertical'
    showNumbers: { type: Boolean }   // Show # for numbers
  };

  static styles = css`
    :host {
      display: block;
    }

    .alphabet-bar {
      display: flex;
      background: var(--alphabet-bar-background, rgba(0, 0, 0, 0.8));
      border: 1px solid var(--alphabet-bar-border, transparent);
      border-radius: var(--radius-md, 8px);
      padding: 4px;
      gap: 2px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    /* Horizontal layout (default) */
    :host([orientation="horizontal"]) .alphabet-bar,
    .alphabet-bar {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
    }

    /* Vertical layout */
    :host([orientation="vertical"]) .alphabet-bar {
      flex-direction: column;
      align-items: center;
      max-height: 80vh;
      overflow-y: auto;
    }

    .alpha-letter {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 4px;
      border: none;
      background: transparent;
      color: var(--alphabet-letter-color, rgba(255, 255, 255, 0.7));
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 0.85rem;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.15s ease;
    }

    .alpha-letter:hover:not(.disabled) {
      background: var(--alphabet-letter-hover-bg, rgba(255, 255, 255, 0.1));
      color: var(--alphabet-letter-hover-color, #fff);
    }

    .alpha-letter.active {
      background: var(--alphabet-letter-active-bg, var(--color-primary, #ff0066));
      color: var(--alphabet-letter-active-color, #ffffff);
      box-shadow: 0 0 10px var(--alphabet-letter-active-bg, var(--color-primary, #ff0066));
    }

    .alpha-letter.disabled {
      color: var(--alphabet-letter-muted, rgba(255, 255, 255, 0.25));
      cursor: default;
      pointer-events: none;
    }

    .alpha-letter.has-games {
      color: var(--alphabet-letter-color, rgba(255, 255, 255, 0.7));
      cursor: pointer;
    }

    /* Compact mode for smaller screens */
    @media (max-width: 768px) {
      .alpha-letter {
        min-width: 20px;
        height: 20px;
        font-size: 0.75rem;
      }
    }

    /* Vertical scrollbar styling */
    :host([orientation="vertical"]) .alphabet-bar::-webkit-scrollbar {
      width: 4px;
    }

    :host([orientation="vertical"]) .alphabet-bar::-webkit-scrollbar-track {
      background: transparent;
    }

    :host([orientation="vertical"]) .alphabet-bar::-webkit-scrollbar-thumb {
      background: var(--color-primary, #ff0066);
      border-radius: 2px;
    }
  `;

  constructor() {
    super();
    this.letters = [];
    this.currentLetter = '';
    this.orientation = 'horizontal';
    this.showNumbers = true;
    this._allLetters = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  }

  _handleLetterClick(letter) {
    if (!this.letters.includes(letter)) return;

    this.dispatchEvent(new CustomEvent('letter-select', {
      detail: { letter },
      bubbles: true,
      composed: true
    }));
  }

  _handleKeyDown(e, letter) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleLetterClick(letter);
    }
  }

  render() {
    const displayLetters = this.showNumbers ? this._allLetters : this._allLetters.slice(1);

    return html`
      <div class="alphabet-bar" role="navigation" aria-label="Alphabetical navigation">
        ${displayLetters.map(letter => {
          const hasGames = this.letters.includes(letter);
          const isActive = this.currentLetter === letter;

          return html`
            <button
              class="alpha-letter ${hasGames ? 'has-games' : 'disabled'} ${isActive ? 'active' : ''}"
              data-letter="${letter}"
              @click=${() => this._handleLetterClick(letter)}
              @keydown=${(e) => this._handleKeyDown(e, letter)}
              ?disabled=${!hasGames}
              aria-label="Jump to ${letter === '#' ? 'numbers' : letter}"
              aria-current=${isActive ? 'true' : 'false'}
            >
              ${letter}
            </button>
          `;
        })}
      </div>
    `;
  }
}

customElements.define('rwl-alphabet-bar', RwlAlphabetBar);
