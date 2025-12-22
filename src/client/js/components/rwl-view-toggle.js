/**
 * RetroWebLauncher - View Toggle Component
 * Button bar to switch between grid, wheel, and list views
 * Preferences saved in localStorage per-section (client-side only)
 */

import { state } from '../state.js';
import { themeService } from '../theme-service.js';

class RwlViewToggle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._systemId = null;
    this._currentView = 'wheel'; // Will be loaded per-section
    this._views = [
      { id: 'grid', icon: '⊞', label: 'Grid' },
      { id: 'wheel', icon: '◎', label: 'Carousel' },
      { id: 'spin', icon: '🎡', label: 'Spin Wheel' },
      { id: 'spinner', icon: '◔', label: 'Wheel of Fortune' },
      { id: 'list', icon: '☰', label: 'List' }
    ];
  }

  static get observedAttributes() {
    return ['view', 'system-id'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'view' && newValue !== oldValue) {
      this._currentView = newValue;
      this._updateSelection();
    } else if (name === 'system-id' && newValue !== oldValue) {
      this._systemId = newValue;
      this._loadSectionView();
    }
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
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
      // Fall back to theme default based on context
      this._currentView = themeService.getDefaultView('system') || 'wheel';
    }
    this._updateSelection();
  }

  /**
   * Save view preference for this section to localStorage
   */
  _saveSectionView() {
    const key = this._getSectionKey();
    localStorage.setItem(`rwl-view-type-${key}`, this._currentView);
  }

  get systemId() {
    return this._systemId;
  }

  set systemId(id) {
    if (this._systemId !== id) {
      this._systemId = id;
      this._loadSectionView();
    }
  }

  get view() {
    return this._currentView;
  }

  set view(value) {
    if (this._currentView !== value) {
      this._currentView = value;
      this._saveSectionView();
      this._updateSelection();
    }
  }

  _bindEvents() {
    this.shadowRoot.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        if (viewId !== this._currentView) {
          this._currentView = viewId;
          this._saveSectionView();
          this._updateSelection();

          // Emit event for parent to handle
          this.dispatchEvent(new CustomEvent('viewchange', {
            detail: { view: viewId },
            bubbles: true,
            composed: true
          }));

          // Also emit to state for global handling
          state.emit('viewTypeChanged', viewId);
        }
      });
    });
  }

  _updateSelection() {
    this.shadowRoot.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === this._currentView);
    });
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
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
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #888;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .view-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .view-btn.active {
          background: rgba(255, 0, 102, 0.2);
          border-color: rgba(255, 0, 102, 0.5);
          color: #ff0066;
        }

        .view-btn:focus {
          outline: 2px solid rgba(255, 0, 102, 0.5);
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
          background: #222;
          color: #fff;
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
      </style>

      ${this._views.map(v => `
        <button
          class="view-btn ${v.id === this._currentView ? 'active' : ''}"
          data-view="${v.id}"
          title="${v.label}"
          aria-label="${v.label} view"
        >${v.icon}</button>
      `).join('')}
    `;
  }
}

customElements.define('rwl-view-toggle', RwlViewToggle);
