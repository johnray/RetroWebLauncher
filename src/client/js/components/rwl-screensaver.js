/**
 * RetroWebLauncher - Screensaver Manager
 * Manages and switches between different screensaver implementations
 */

import { state } from '../state.js';

// Import screensaver implementations
import './rwl-screensaver-floating-tvs.js';
// Future screensavers can be imported here:
// import './rwl-screensaver-slideshow.js';
// import './rwl-screensaver-marquee.js';

const { LitElement, html, css } = window.Lit;

/**
 * Registry of available screensavers
 * Add new screensavers here with their tag name and display info
 */
const SCREENSAVERS = {
  'floating-tvs': {
    tag: 'rwl-screensaver-floating-tvs',
    name: 'Floating TVs',
    description: 'Bouncing retro CRT TVs playing game videos'
  }
  // Future screensavers:
  // 'slideshow': {
  //   tag: 'rwl-screensaver-slideshow',
  //   name: 'Game Slideshow',
  //   description: 'Full-screen game artwork slideshow'
  // },
  // 'marquee': {
  //   tag: 'rwl-screensaver-marquee',
  //   name: 'Arcade Marquee',
  //   description: 'Scrolling arcade marquee display'
  // }
};

const DEFAULT_SCREENSAVER = 'floating-tvs';

class RwlScreensaver extends LitElement {
  static properties = {
    _currentScreensaver: { type: String, state: true }
  };

  static styles = css`
    :host {
      display: contents;
    }
  `;

  constructor() {
    super();
    this._currentScreensaver = DEFAULT_SCREENSAVER;
    this._unsubscribers = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadPreference();
    this._bindEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  /**
   * Get the list of available screensavers for settings UI
   */
  static getAvailableScreensavers() {
    return Object.entries(SCREENSAVERS).map(([id, info]) => ({
      id,
      name: info.name,
      description: info.description
    }));
  }

  /**
   * Get the current screensaver ID
   * Validates that the stored value exists in the registry
   */
  static getCurrentScreensaver() {
    const stored = localStorage.getItem('rwl-screensaver-type');
    // Validate that the stored screensaver still exists in registry
    if (stored && SCREENSAVERS[stored]) {
      return stored;
    }
    return DEFAULT_SCREENSAVER;
  }

  /**
   * Set the screensaver type
   */
  static setScreensaver(id) {
    if (SCREENSAVERS[id]) {
      localStorage.setItem('rwl-screensaver-type', id);
      state.emit('screensaverTypeChanged', id);
    }
  }

  _loadPreference() {
    const stored = localStorage.getItem('rwl-screensaver-type');
    if (stored && SCREENSAVERS[stored]) {
      this._currentScreensaver = stored;
    } else {
      this._currentScreensaver = DEFAULT_SCREENSAVER;
    }
  }

  _bindEvents() {
    // Listen for screensaver type changes
    this._unsubscribers.push(
      state.on('screensaverTypeChanged', (id) => {
        if (SCREENSAVERS[id]) {
          this._currentScreensaver = id;
        }
      })
    );
  }

  render() {
    const screensaver = SCREENSAVERS[this._currentScreensaver];
    if (!screensaver) {
      return html``;
    }

    // Dynamically render the selected screensaver component
    const tag = screensaver.tag;
    return html`${this._renderScreensaver(tag)}`;
  }

  _renderScreensaver(tag) {
    // Use dynamic tag rendering
    switch (tag) {
      case 'rwl-screensaver-floating-tvs':
        return html`<rwl-screensaver-floating-tvs></rwl-screensaver-floating-tvs>`;
      // Add cases for future screensavers:
      // case 'rwl-screensaver-slideshow':
      //   return html`<rwl-screensaver-slideshow></rwl-screensaver-slideshow>`;
      default:
        return html`<rwl-screensaver-floating-tvs></rwl-screensaver-floating-tvs>`;
    }
  }
}

customElements.define('rwl-screensaver', RwlScreensaver);

// Export for use in settings
export { RwlScreensaver, SCREENSAVERS };
