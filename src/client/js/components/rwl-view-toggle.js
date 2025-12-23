/**
 * RetroWebLauncher - View Toggle Component (Lit)
 * Button bar to switch between grid, wheel, and list views
 * Preferences saved in localStorage per-section (client-side only)
 */

import { state } from '../state.js';
import { themeService } from '../theme-service.js';

const { LitElement, html, css } = window.Lit;

class RwlViewToggle extends LitElement {
  static properties = {
    view: { type: String, reflect: true },
    systemId: { type: String, attribute: 'system-id' },
    _currentView: { state: true }
  };

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .view-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--button-secondary-bg, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--button-secondary-border, rgba(255, 255, 255, 0.1));
      border-radius: 6px;
      color: var(--color-text-muted, #888);
      font-size: 16px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-btn:hover {
      background: var(--button-secondary-hover, rgba(255, 255, 255, 0.1));
      color: var(--color-text, #fff);
    }

    .view-btn.active {
      background: var(--button-active-bg, rgba(255, 0, 102, 0.2));
      border-color: var(--button-active-border, rgba(255, 0, 102, 0.5));
      color: var(--color-primary, #ff0066);
    }

    .view-btn:focus {
      outline: 2px solid var(--focus-ring-color, rgba(255, 0, 102, 0.5));
      outline-offset: 2px;
    }

    /* Optional label tooltip */
    .view-btn {
      position: relative;
    }

    .view-btn::after {
      content: attr(title);
      position: absolute;
      bottom: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--tooltip-bg, #222);
      color: var(--tooltip-color, #fff);
      font-size: 10px;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s;
    }

    .view-btn:hover::after {
      opacity: 1;
    }
  `;

  constructor() {
    super();
    this._systemId = null;
    this._currentView = 'wheel';
    this._views = [
      { id: 'grid', icon: '⊞', label: 'Grid' },
      { id: 'wheel', icon: '◎', label: 'Carousel' },
      { id: 'spin', icon: '🎡', label: 'Spin Wheel' },
      { id: 'spinner', icon: '◔', label: 'Wheel of Fortune' },
      { id: 'list', icon: '☰', label: 'List' }
    ];
  }

  updated(changedProperties) {
    if (changedProperties.has('view') && this.view) {
      this._currentView = this.view;
    }
    if (changedProperties.has('systemId') && this.systemId) {
      this._systemId = this.systemId;
      this._loadSectionView();
    }
  }

  /**
   * Get the storage key for this section
   */
  _getSectionKey() {
    return this._systemId || 'default';
  }

  /**
   * Load view preference for this section from localStorage, with theme default fallback
   */
  _loadSectionView() {
    const key = this._getSectionKey();
    const stored = localStorage.getItem(`rwl-view-type-${key}`);
    if (stored) {
      this._currentView = stored;
    } else {
      this._currentView = themeService.getDefaultView('system') || 'wheel';
    }
  }

  /**
   * Save view preference for this section to localStorage
   */
  _saveSectionView() {
    const key = this._getSectionKey();
    localStorage.setItem(`rwl-view-type-${key}`, this._currentView);
  }

  _handleViewClick(viewId) {
    if (viewId !== this._currentView) {
      this._currentView = viewId;
      this._saveSectionView();

      this.dispatchEvent(new CustomEvent('viewchange', {
        detail: { view: viewId },
        bubbles: true,
        composed: true
      }));

      state.emit('viewTypeChanged', viewId);
    }
  }

  render() {
    return html`
      ${this._views.map(v => html`
        <button
          class="view-btn ${v.id === this._currentView ? 'active' : ''}"
          @click=${() => this._handleViewClick(v.id)}
          title="${v.label}"
          aria-label="${v.label} view"
        >${v.icon}</button>
      `)}
    `;
  }
}

customElements.define('rwl-view-toggle', RwlViewToggle);
