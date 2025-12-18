/**
 * RetroWebLauncher - PDF Viewer Component
 * Displays game manuals in PDF format
 */

class RwlPdfViewer extends HTMLElement {
  static get observedAttributes() {
    return ['src'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._src = '';
    this._loading = true;
    this._error = false;
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'src' && newValue !== oldValue) {
      this._src = newValue;
      this._loadPdf();
    }
  }

  set src(value) {
    this._src = value;
    this.setAttribute('src', value);
  }

  get src() {
    return this._src;
  }

  _loadPdf() {
    this._loading = true;
    this._error = false;
    this._render();

    // For now, use an iframe embed for PDF display
    // PDF.js could be integrated for more control
    const viewer = this.shadowRoot.querySelector('.pdf-frame');
    if (viewer) {
      viewer.onload = () => {
        this._loading = false;
        this._render();
      };
      viewer.onerror = () => {
        this._loading = false;
        this._error = true;
        this._render();
      };
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          min-height: 400px;
        }

        .pdf-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(0,0,0,0.6);
          border-radius: var(--radius-md, 8px);
          overflow: hidden;
        }

        .pdf-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-sm, 0.5rem);
          background: rgba(0,0,0,0.4);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .toolbar-title {
          font-size: var(--font-size-sm, 0.75rem);
          color: var(--color-text-muted, #888);
        }

        .toolbar-actions {
          display: flex;
          gap: var(--spacing-xs, 0.25rem);
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-xs, 0.25rem) var(--spacing-sm, 0.5rem);
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: var(--radius-sm, 4px);
          color: var(--color-text, #fff);
          font-size: var(--font-size-xs, 0.625rem);
          cursor: pointer;
          transition: background var(--transition-fast, 150ms);
        }

        .toolbar-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .pdf-content {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pdf-frame {
          width: 100%;
          height: 100%;
          border: none;
          background: #fff;
        }

        .loading-state,
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md, 1rem);
          padding: var(--spacing-xl, 2rem);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: var(--color-primary, #ff0066);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-icon {
          font-size: 3rem;
          opacity: 0.5;
        }

        .error-state p {
          color: var(--color-text-muted, #888);
          text-align: center;
          margin: 0;
        }

        .download-link {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs, 0.25rem);
          padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
          background: var(--color-primary, #ff0066);
          border-radius: var(--radius-md, 8px);
          color: var(--color-text, #fff);
          text-decoration: none;
          font-size: var(--font-size-sm, 0.75rem);
          transition: background var(--transition-fast, 150ms);
        }

        .download-link:hover {
          background: var(--color-primary-hover, #ff3388);
        }

        /* Safari-specific adjustments */
        @supports (-webkit-touch-callout: none) {
          .pdf-frame {
            -webkit-overflow-scrolling: touch;
          }
        }
      </style>

      <div class="pdf-container">
        <div class="pdf-toolbar">
          <span class="toolbar-title">Game Manual</span>
          <div class="toolbar-actions">
            <a class="toolbar-btn" href="${this._src}" target="_blank" rel="noopener" title="Open in new tab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
              </svg>
              Open
            </a>
            <a class="toolbar-btn" href="${this._src}" download title="Download PDF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Download
            </a>
          </div>
        </div>

        <div class="pdf-content">
          ${this._loading ? `
            <div class="loading-state">
              <span class="spinner"></span>
              <p>Loading manual...</p>
            </div>
          ` : this._error ? `
            <div class="error-state">
              <span class="error-icon">📄</span>
              <p>Unable to display PDF in browser.</p>
              <a class="download-link" href="${this._src}" target="_blank" rel="noopener">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                Download PDF
              </a>
            </div>
          ` : ''}

          ${this._src && !this._error ? `
            <iframe
              class="pdf-frame"
              src="${this._src}#view=FitH"
              title="Game Manual PDF"
              loading="lazy"
            ></iframe>
          ` : ''}
        </div>
      </div>
    `;

    // Set up load handlers after render
    if (this._src && !this._error) {
      const frame = this.shadowRoot.querySelector('.pdf-frame');
      if (frame) {
        frame.onload = () => {
          this._loading = false;
          const loadingState = this.shadowRoot.querySelector('.loading-state');
          if (loadingState) loadingState.remove();
        };
        frame.onerror = () => {
          this._loading = false;
          this._error = true;
          this._render();
        };

        // Fallback timeout for browsers that don't fire onload for PDFs
        setTimeout(() => {
          if (this._loading) {
            this._loading = false;
            const loadingState = this.shadowRoot.querySelector('.loading-state');
            if (loadingState) loadingState.remove();
          }
        }, 3000);
      }
    }
  }
}

customElements.define('rwl-pdf-viewer', RwlPdfViewer);
