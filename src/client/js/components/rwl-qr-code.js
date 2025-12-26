/**
 * RetroWebLauncher - QR Code Component (Lit)
 * Displays QR code for easy mobile device access
 */

const { LitElement, html, css } = window.Lit;

class RwlQrCode extends LitElement {
  static properties = {
    url: { type: String },
    _qrDataUrl: { state: true }
  };

  static styles = css`
    :host {
      display: block;
    }

    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-md, 1rem);
      padding: var(--spacing-lg, 1.5rem);
      background: var(--content-overlay-dark, rgba(255,255,255,0.05));
      border-radius: var(--radius-lg, 12px);
      border: 1px solid var(--content-border, rgba(255,255,255,0.1));
    }

    .qr-title {
      font-size: var(--font-size-sm, 0.75rem);
      color: var(--color-text-muted, #888);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin: 0;
    }

    .qr-image {
      width: 200px;
      height: 200px;
      background: white;
      border-radius: var(--radius-md, 8px);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow:
        0 0 30px rgba(255,0,102,0.3),
        0 10px 40px rgba(0,0,0,0.5);
      animation: qr-pulse 3s ease-in-out infinite;
    }

    .qr-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .qr-url {
      font-size: var(--font-size-xs, 0.625rem);
      color: var(--color-primary, #ff0066);
      font-family: monospace;
      word-break: break-all;
      text-align: center;
      max-width: 250px;
    }

    .qr-hint {
      font-size: var(--font-size-xs, 0.625rem);
      color: var(--color-text-muted, #888);
      text-align: center;
    }

    @keyframes qr-pulse {
      0%, 100% { box-shadow: 0 0 30px rgba(255,0,102,0.3), 0 10px 40px rgba(0,0,0,0.5); }
      50% { box-shadow: 0 0 50px rgba(255,0,102,0.5), 0 10px 40px rgba(0,0,0,0.5); }
    }
  `;

  constructor() {
    super();
    this.url = '';
    this._qrDataUrl = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.url) {
      this._loadServerUrl();
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('url') && this.url) {
      this._generateQR();
    }
  }

  async _loadServerUrl() {
    try {
      const response = await fetch('/api/qrcode');
      const data = await response.json();
      this.url = data.url;
      this._qrDataUrl = data.qrcode;
    } catch (error) {
      console.error('Failed to load QR code:', error);
    }
  }

  async _generateQR() {
    if (!this.url) return;

    try {
      const response = await fetch(`/api/qrcode?url=${encodeURIComponent(this.url)}`);
      const data = await response.json();
      this._qrDataUrl = data.qrcode;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }

  render() {
    return html`
      <div class="qr-container">
        <h3 class="qr-title">Scan to Connect</h3>
        <div class="qr-image">
          ${this._qrDataUrl
            ? html`<img src="${this._qrDataUrl}" alt="QR Code" />`
            : html`<span class="loading">Loading...</span>`}
        </div>
        <p class="qr-url">${this.url || 'Loading...'}</p>
        <p class="qr-hint">Scan with your phone or tablet to access your arcade</p>
      </div>
    `;
  }
}

customElements.define('rwl-qr-code', RwlQrCode);
