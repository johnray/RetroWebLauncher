/**
 * RetroWebLauncher - Sidebar Component (Lit)
 * System navigation and collections
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';

const { LitElement, html, css } = window.Lit;

class RwlSidebar extends LitElement {
  static properties = {
    _systems: { state: true },
    _collections: { state: true },
    _selectedSystem: { state: true },
    _collapsedSections: { state: true }
  };

  static styles = css`
    :host {
      display: block;
      width: var(--sidebar-width, 280px);
      height: 100%;
      background: var(--sidebar-background, rgba(0,0,0,0.6));
      border-right: 1px solid var(--sidebar-border-color, rgba(255,255,255,0.1));
      overflow-y: auto;
      overflow-x: hidden;
    }

    .sidebar-section {
      padding: var(--spacing-md, 1rem);
    }

    .section-title {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: var(--font-size-xs, 0.625rem);
      color: var(--color-primary, #ff0066);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: var(--spacing-md, 1rem);
      padding-bottom: var(--spacing-xs, 0.25rem);
      border-bottom: 1px solid var(--sidebar-section-border, rgba(255,0,102,0.3));
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      transition: color var(--transition-fast, 150ms);
    }

    .section-title:hover {
      color: var(--color-primary-light, #ff3388);
    }

    .section-toggle {
      font-size: var(--font-size-sm, 0.75rem);
      transition: transform var(--transition-fast, 150ms);
    }

    .section-toggle.collapsed {
      transform: rotate(-90deg);
    }

    .section-content {
      overflow: hidden;
      transition: max-height var(--transition-normal, 250ms) ease-out,
                  opacity var(--transition-normal, 250ms) ease-out;
      max-height: 2000px;
      opacity: 1;
    }

    .section-content.collapsed {
      max-height: 0;
      opacity: 0;
    }

    .system-group {
      margin-bottom: var(--spacing-lg, 1.5rem);
    }

    .group-header {
      font-size: var(--font-size-xs, 0.625rem);
      color: var(--sidebar-group-header-color, var(--color-text-muted, #888));
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: var(--spacing-xs, 0.25rem);
      padding: var(--spacing-xs, 0.25rem);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      border-radius: var(--radius-sm, 4px);
      transition: background var(--transition-fast, 150ms),
                  color var(--transition-fast, 150ms);
    }

    .group-header:hover {
      background: var(--sidebar-item-hover, rgba(255,255,255,0.05));
      color: var(--color-text, #fff);
    }

    .group-toggle {
      font-size: 0.5rem;
      opacity: 0.6;
      transition: transform var(--transition-fast, 150ms);
    }

    .group-toggle.collapsed {
      transform: rotate(-90deg);
    }

    .group-content {
      overflow: hidden;
      transition: max-height var(--transition-normal, 250ms) ease-out,
                  opacity var(--transition-normal, 250ms) ease-out;
      max-height: 1000px;
      opacity: 1;
    }

    .group-content.collapsed {
      max-height: 0;
      opacity: 0;
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
      background: var(--sidebar-item-hover, rgba(255,255,255,0.1));
    }

    .system-item:focus-visible,
    .collection-item:focus-visible {
      outline: 2px solid var(--color-primary, #ff0066);
      outline-offset: -2px;
      background: var(--sidebar-item-selected, rgba(255,0,102,0.2));
    }

    .system-item.selected {
      background: var(--sidebar-item-selected, rgba(255,0,102,0.3));
      border-left: 3px solid var(--color-primary, #ff0066);
    }

    .system-name,
    .collection-name {
      flex: 1;
      font-size: var(--font-size-sm, 0.75rem);
      color: var(--sidebar-text-color, var(--color-text, #fff));
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
      background: var(--sidebar-count-bg, rgba(255,255,255,0.1));
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

    :host::-webkit-scrollbar {
      width: 6px;
    }

    :host::-webkit-scrollbar-track {
      background: transparent;
    }

    :host::-webkit-scrollbar-thumb {
      background: var(--content-scrollbar-thumb, rgba(255,255,255,0.2));
      border-radius: 3px;
    }

    :host::-webkit-scrollbar-thumb:hover {
      background: var(--content-scrollbar-thumb-hover, rgba(255,255,255,0.3));
    }

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
  `;

  constructor() {
    super();
    this._systems = [];
    this._collections = [];
    this._selectedSystem = null;
    this._unsubscribers = [];
    this._collapsedSections = this._loadCollapsedState();
  }

  _loadCollapsedState() {
    try {
      const saved = localStorage.getItem('rwl-sidebar-collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  _saveCollapsedState() {
    try {
      localStorage.setItem('rwl-sidebar-collapsed', JSON.stringify(this._collapsedSections));
    } catch {
      // localStorage unavailable
    }
  }

  _toggleSection(sectionId) {
    this._collapsedSections = {
      ...this._collapsedSections,
      [sectionId]: !this._collapsedSections[sectionId]
    };
    this._saveCollapsedState();
  }

  _isSectionCollapsed(sectionId) {
    return !!this._collapsedSections[sectionId];
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadData();

    this._unsubscribers.push(
      state.on('navigate', (data) => {
        if (data.systemId) {
          this._selectedSystem = data.systemId;
        }
      })
    );

    this._unsubscribers.push(
      state.on('libraryUpdated', () => {
        this._loadData();
      })
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
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
    } catch (error) {
      console.error('Failed to load sidebar data:', error);
    }
  }

  _handleSystemClick(systemId) {
    this._selectedSystem = systemId;
    router.navigate(`/system/${systemId}`);
  }

  _handleCollectionClick(collectionId) {
    router.navigate(`/collection/${collectionId}`);
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

  _renderSystems() {
    if (this._systems.length === 0) {
      return html`<p class="empty-message">No systems found</p>`;
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

    const hwLabels = {
      'arcade': 'Arcade',
      'console': 'Consoles',
      'portable': 'Portables',
      'computer': 'Computers',
      'engine': 'Game Engines',
      'other': 'Other'
    };

    const hwOrder = ['arcade', 'console', 'portable', 'computer', 'engine', 'other'];

    return hwOrder.filter(hw => grouped[hw]?.length > 0).map(hw => {
      const systems = grouped[hw].sort((a, b) => a.fullname.localeCompare(b.fullname));
      const groupId = `group-${hw}`;
      const isCollapsed = this._isSectionCollapsed(groupId);
      return html`
        <div class="system-group">
          <div class="group-header" @click=${() => this._toggleSection(groupId)}>
            <span>${hwLabels[hw] || hw}</span>
            <span class="group-toggle ${isCollapsed ? 'collapsed' : ''}">▼</span>
          </div>
          <div class="group-content ${isCollapsed ? 'collapsed' : ''}">
            ${systems.map(sys => html`
              <div
                class="system-item ${sys.id === this._selectedSystem ? 'selected' : ''}"
                tabindex="0"
                @click=${() => this._handleSystemClick(sys.id)}
                @keydown=${(e) => e.key === 'Enter' && this._handleSystemClick(sys.id)}
              >
                <span class="system-name">${sys.fullname}</span>
                <span class="game-count">${sys.gameCount}</span>
              </div>
            `)}
          </div>
        </div>
      `;
    });
  }

  _renderCollections() {
    if (this._collections.length === 0) {
      return html`<p class="empty-message">No collections</p>`;
    }

    return this._collections.map(col => html`
      <div
        class="collection-item"
        tabindex="0"
        @click=${() => this._handleCollectionClick(col.id)}
        @keydown=${(e) => e.key === 'Enter' && this._handleCollectionClick(col.id)}
      >
        <span class="collection-icon">${this._getCollectionIcon(col.icon)}</span>
        <span class="collection-name">${col.name}</span>
        <span class="game-count">${col.gameCount}</span>
      </div>
    `);
  }

  render() {
    const collectionsCollapsed = this._isSectionCollapsed('collections');
    const systemsCollapsed = this._isSectionCollapsed('systems');

    return html`
      <div class="sidebar-section">
        <div class="section-title" @click=${() => this._toggleSection('collections')}>
          <span>Collections</span>
          <span class="section-toggle ${collectionsCollapsed ? 'collapsed' : ''}">▼</span>
        </div>
        <div id="collections-list" class="section-content ${collectionsCollapsed ? 'collapsed' : ''}">
          ${this._collections.length === 0 && this._systems.length === 0
            ? html`<p class="empty-message">Loading...</p>`
            : this._renderCollections()}
        </div>
      </div>

      <div class="sidebar-section">
        <div class="section-title" @click=${() => this._toggleSection('systems')}>
          <span>Systems</span>
          <span class="section-toggle ${systemsCollapsed ? 'collapsed' : ''}">▼</span>
        </div>
        <div id="systems-list" class="section-content ${systemsCollapsed ? 'collapsed' : ''}">
          ${this._systems.length === 0 && this._collections.length === 0
            ? html`<p class="empty-message">Loading...</p>`
            : this._renderSystems()}
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-sidebar', RwlSidebar);
