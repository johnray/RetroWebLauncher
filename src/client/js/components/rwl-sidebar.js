/**
 * RetroWebLauncher - Sidebar Component
 * System navigation and collections
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';

class RwlSidebar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._systems = [];
    this._collections = [];
    this._selectedSystem = null;
    this._unsubscribers = [];
  }

  connectedCallback() {
    this._render();
    this._loadData();
    this._bindEvents();

    // Listen for navigation
    this._unsubscribers.push(
      state.on('navigate', (data) => {
        if (data.systemId) {
          this._selectedSystem = data.systemId;
          this._highlightSelected();
        }
      })
    );

    // Listen for library updates
    this._unsubscribers.push(
      state.on('libraryUpdated', () => {
        this._loadData();
      })
    );
  }

  disconnectedCallback() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  async _loadData() {
    try {
      const [systemsRes, collectionsRes] = await Promise.all([
        api.getSystems(),
        api.getCollections()
      ]);

      this._systems = systemsRes.systems || [];
      this._collections = collectionsRes.collections || [];

      this._renderSystems();
      this._renderCollections();
    } catch (error) {
      console.error('Failed to load sidebar data:', error);
    }
  }

  _bindEvents() {
    // Delegate click events
    this.shadowRoot.addEventListener('click', (e) => {
      const systemItem = e.target.closest('.system-item');
      if (systemItem) {
        const systemId = systemItem.dataset.systemId;
        this._selectedSystem = systemId;
        router.navigate(`/system/${systemId}`);
        this._highlightSelected();
      }

      const collectionItem = e.target.closest('.collection-item');
      if (collectionItem) {
        const collectionId = collectionItem.dataset.collectionId;
        router.navigate(`/collection/${collectionId}`);
      }
    });
  }

  _highlightSelected() {
    // Remove previous selection
    this.shadowRoot.querySelectorAll('.system-item.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Add selection to current
    if (this._selectedSystem) {
      const selected = this.shadowRoot.querySelector(`[data-system-id="${this._selectedSystem}"]`);
      if (selected) {
        selected.classList.add('selected');
      }
    }
  }

  _renderSystems() {
    const container = this.shadowRoot.querySelector('#systems-list');
    if (!container) return;

    if (this._systems.length === 0) {
      container.innerHTML = `
        <p class="empty-message">No systems found</p>
      `;
      return;
    }

    // Group systems by hardware type
    const grouped = {};
    for (const system of this._systems) {
      const hw = system.hardware || 'other';
      if (!grouped[hw]) {
        grouped[hw] = [];
      }
      grouped[hw].push(system);
    }

    // Hardware type labels
    const hwLabels = {
      'arcade': 'Arcade',
      'console': 'Consoles',
      'portable': 'Portables',
      'computer': 'Computers',
      'engine': 'Game Engines',
      'other': 'Other'
    };

    // Sort order
    const hwOrder = ['arcade', 'console', 'portable', 'computer', 'engine', 'other'];

    let html = '';
    for (const hw of hwOrder) {
      if (!grouped[hw] || grouped[hw].length === 0) continue;

      // Sort systems within group alphabetically
      grouped[hw].sort((a, b) => a.fullname.localeCompare(b.fullname));

      html += `
        <div class="system-group">
          <div class="group-header">${hwLabels[hw] || hw}</div>
          ${grouped[hw].map(sys => `
            <div class="system-item" data-system-id="${sys.id}" tabindex="0">
              <span class="system-name">${sys.fullname}</span>
              <span class="game-count">${sys.gameCount}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    container.innerHTML = html;
  }

  _renderCollections() {
    const container = this.shadowRoot.querySelector('#collections-list');
    if (!container) return;

    if (this._collections.length === 0) {
      container.innerHTML = `
        <p class="empty-message">No collections</p>
      `;
      return;
    }

    container.innerHTML = this._collections.map(col => `
      <div class="collection-item" data-collection-id="${col.id}" tabindex="0">
        <span class="collection-icon">${this._getCollectionIcon(col.icon)}</span>
        <span class="collection-name">${col.name}</span>
        <span class="game-count">${col.gameCount}</span>
      </div>
    `).join('');
  }

  _getCollectionIcon(icon) {
    const icons = {
      'heart': '❤️',
      'clock': '🕐',
      'star': '⭐',
      'folder': '📁'
    };
    return icons[icon] || '📁';
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: var(--sidebar-width, 280px);
          height: 100%;
          background: rgba(0,0,0,0.6);
          border-right: 1px solid rgba(255,255,255,0.1);
          overflow-y: auto;
          overflow-x: hidden;
        }

        .sidebar-section {
          padding: var(--spacing-md, 1rem);
        }

        .section-title {
          font-family: var(--font-display, 'Press Start 2P', monospace);
          font-size: var(--font-size-xs, 0.625rem);
          color: var(--color-primary, #ff0066);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: var(--spacing-md, 1rem);
          padding-bottom: var(--spacing-xs, 0.25rem);
          border-bottom: 1px solid rgba(255,0,102,0.3);
        }

        .system-group {
          margin-bottom: var(--spacing-lg, 1.5rem);
        }

        .group-header {
          font-size: var(--font-size-xs, 0.625rem);
          color: var(--color-text-muted, #888);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: var(--spacing-xs, 0.25rem);
          padding-left: var(--spacing-xs, 0.25rem);
        }

        .system-item,
        .collection-item {
          display: flex;
          align-items: center;
          padding: var(--spacing-sm, 0.5rem) var(--spacing-sm, 0.5rem);
          border-radius: var(--radius-sm, 4px);
          cursor: pointer;
          transition: all var(--transition-fast, 150ms);
          margin-bottom: 2px;
        }

        .system-item:hover,
        .collection-item:hover {
          background: rgba(255,255,255,0.1);
        }

        .system-item:focus-visible,
        .collection-item:focus-visible {
          outline: 2px solid var(--color-primary, #ff0066);
          outline-offset: -2px;
          background: rgba(255,0,102,0.2);
        }

        .system-item.selected {
          background: rgba(255,0,102,0.3);
          border-left: 3px solid var(--color-primary, #ff0066);
        }

        .system-name,
        .collection-name {
          flex: 1;
          font-size: var(--font-size-sm, 0.75rem);
          color: var(--color-text, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .collection-icon {
          margin-right: var(--spacing-sm, 0.5rem);
          font-size: var(--font-size-base, 1rem);
        }

        .game-count {
          font-size: var(--font-size-xs, 0.625rem);
          color: var(--color-text-muted, #888);
          background: rgba(255,255,255,0.1);
          padding: 2px 6px;
          border-radius: var(--radius-full, 9999px);
          min-width: 24px;
          text-align: center;
        }

        .empty-message {
          font-size: var(--font-size-sm, 0.75rem);
          color: var(--color-text-muted, #888);
          font-style: italic;
        }

        /* Scrollbar */
        :host::-webkit-scrollbar {
          width: 6px;
        }

        :host::-webkit-scrollbar-track {
          background: transparent;
        }

        :host::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }

        :host::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }

        /* Mobile */
        @media (max-width: 768px) {
          :host {
            position: fixed;
            left: 0;
            top: var(--header-height, 64px);
            bottom: 0;
            transform: translateX(-100%);
            transition: transform var(--transition-normal, 250ms);
            z-index: var(--z-sidebar, 100);
          }

          :host(.open) {
            transform: translateX(0);
          }
        }
      </style>

      <div class="sidebar-section">
        <div class="section-title">Collections</div>
        <div id="collections-list">
          <p class="empty-message">Loading...</p>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="section-title">Systems</div>
        <div id="systems-list">
          <p class="empty-message">Loading...</p>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-sidebar', RwlSidebar);
