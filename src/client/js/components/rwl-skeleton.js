/**
 * RetroWebLauncher - Skeleton Loading Component
 * Provides animated placeholder content during loading states
 */

const { LitElement, html, css } = window.Lit;

class RwlSkeleton extends LitElement {
  static properties = {
    variant: { type: String }, // 'card', 'text', 'circle', 'rect'
    width: { type: String },
    height: { type: String },
    count: { type: Number }
  };

  static styles = css`
    :host {
      display: block;
    }

    .skeleton {
      background: linear-gradient(
        90deg,
        var(--skeleton-base, rgba(255, 255, 255, 0.05)) 0%,
        var(--skeleton-highlight, rgba(255, 255, 255, 0.1)) 50%,
        var(--skeleton-base, rgba(255, 255, 255, 0.05)) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite ease-in-out;
      border-radius: var(--radius-sm, 4px);
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Text skeleton */
    .skeleton-text {
      height: 1em;
      margin-bottom: 0.5em;
      border-radius: 4px;
    }

    .skeleton-text:last-child {
      width: 70%;
    }

    /* Circle skeleton (avatars, icons) */
    .skeleton-circle {
      border-radius: 50%;
    }

    /* Card skeleton */
    .skeleton-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: var(--color-surface, #1a1a1a);
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
    }

    .skeleton-card-image {
      aspect-ratio: 4/3;
      border-radius: var(--radius-sm, 4px);
    }

    .skeleton-card-title {
      height: 1.2em;
      width: 80%;
    }

    .skeleton-card-subtitle {
      height: 0.9em;
      width: 50%;
    }

    /* Game card skeleton */
    .skeleton-game-card {
      background: var(--game-card-background, #1a1a1a);
      border-radius: var(--radius-md, 8px);
      overflow: hidden;
      border: 1px solid var(--game-card-border, rgba(255, 255, 255, 0.1));
    }

    .skeleton-game-image {
      aspect-ratio: 3/4;
    }

    .skeleton-game-info {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .skeleton-game-title {
      height: 1em;
      width: 85%;
    }

    .skeleton-game-year {
      height: 0.8em;
      width: 40%;
    }

    /* List item skeleton */
    .skeleton-list-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      background: var(--color-surface, #1a1a1a);
      border-radius: var(--radius-sm, 4px);
      margin-bottom: 4px;
    }

    .skeleton-list-thumb {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      border-radius: 4px;
    }

    .skeleton-list-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .skeleton-list-title {
      height: 1em;
      width: 60%;
    }

    .skeleton-list-meta {
      height: 0.8em;
      width: 40%;
    }

    /* Grid container for multiple cards */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
    }

    /* System card skeleton */
    .skeleton-system-card {
      aspect-ratio: 16/9;
      border-radius: var(--radius-lg, 12px);
      position: relative;
      overflow: hidden;
    }

    .skeleton-system-logo {
      position: absolute;
      bottom: 12px;
      left: 12px;
      height: 1.5em;
      width: 60%;
    }

    /* Wheel item skeleton */
    .skeleton-wheel-item {
      width: 120px;
      height: 160px;
      border-radius: var(--radius-md, 8px);
      flex-shrink: 0;
    }
  `;

  constructor() {
    super();
    this.variant = 'rect';
    this.width = '100%';
    this.height = '1em';
    this.count = 1;
  }

  render() {
    const items = Array(this.count).fill(0);

    switch (this.variant) {
      case 'card':
        return html`${items.map(() => html`
          <div class="skeleton-card">
            <div class="skeleton skeleton-card-image"></div>
            <div class="skeleton skeleton-card-title"></div>
            <div class="skeleton skeleton-card-subtitle"></div>
          </div>
        `)}`;

      case 'game-card':
        return html`${items.map(() => html`
          <div class="skeleton-game-card">
            <div class="skeleton skeleton-game-image"></div>
            <div class="skeleton-game-info">
              <div class="skeleton skeleton-game-title"></div>
              <div class="skeleton skeleton-game-year"></div>
            </div>
          </div>
        `)}`;

      case 'list-item':
        return html`${items.map(() => html`
          <div class="skeleton-list-item">
            <div class="skeleton skeleton-list-thumb"></div>
            <div class="skeleton-list-content">
              <div class="skeleton skeleton-list-title"></div>
              <div class="skeleton skeleton-list-meta"></div>
            </div>
          </div>
        `)}`;

      case 'system-card':
        return html`${items.map(() => html`
          <div class="skeleton skeleton-system-card">
            <div class="skeleton skeleton-system-logo"></div>
          </div>
        `)}`;

      case 'wheel-item':
        return html`${items.map(() => html`
          <div class="skeleton skeleton-wheel-item"></div>
        `)}`;

      case 'text':
        return html`${items.map(() => html`
          <div class="skeleton skeleton-text" style="width: ${this.width}; height: ${this.height}"></div>
        `)}`;

      case 'circle':
        return html`${items.map(() => html`
          <div class="skeleton skeleton-circle" style="width: ${this.width}; height: ${this.width}"></div>
        `)}`;

      case 'rect':
      default:
        return html`${items.map(() => html`
          <div class="skeleton" style="width: ${this.width}; height: ${this.height}"></div>
        `)}`;
    }
  }
}

customElements.define('rwl-skeleton', RwlSkeleton);
