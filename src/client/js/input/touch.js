/**
 * RetroWebLauncher - Touch Handler
 * Touch and swipe gesture support for mobile/tablet
 *
 * Gestures:
 * - Swipe left/right: Navigate
 * - Swipe up/down: Scroll/Navigate
 * - Tap: Select
 * - Long press: Context menu / Favorite
 * - Two-finger swipe: Page navigation
 */

export class TouchHandler {
  constructor(manager) {
    this._manager = manager;

    // Touch tracking
    this._startX = 0;
    this._startY = 0;
    this._startTime = 0;
    this._touchCount = 0;

    // Configuration - optimized for carousel navigation
    this._swipeThreshold = 30;  // Minimum distance for swipe (reduced for responsiveness)
    this._swipeVelocity = 0.15; // Minimum velocity (px/ms) - reduced for easier swiping
    this._longPressDelay = 500; // Long press threshold
    this._tapThreshold = 15;    // Max movement for tap (slightly increased for touch tolerance)

    // Long press timer
    this._longPressTimer = null;
    this._longPressTriggered = false;

    // Bind handlers
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    // Attach listeners (passive for scroll performance)
    document.addEventListener('touchstart', this._onTouchStart, { passive: true });
    document.addEventListener('touchmove', this._onTouchMove, { passive: true });
    document.addEventListener('touchend', this._onTouchEnd, { passive: true });
  }

  destroy() {
    document.removeEventListener('touchstart', this._onTouchStart);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);
    this._cancelLongPress();
  }

  _onTouchStart(event) {
    const touch = event.touches[0];

    this._startX = touch.clientX;
    this._startY = touch.clientY;
    this._startTime = Date.now();
    this._touchCount = event.touches.length;
    this._longPressTriggered = false;

    // Start long press timer
    this._startLongPress(touch.clientX, touch.clientY);
  }

  _onTouchMove(event) {
    const touch = event.touches[0];
    const deltaX = touch.clientX - this._startX;
    const deltaY = touch.clientY - this._startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Cancel long press if moved too much
    if (distance > this._tapThreshold) {
      this._cancelLongPress();
    }
  }

  _onTouchEnd(event) {
    this._cancelLongPress();

    // Don't process if long press was triggered
    if (this._longPressTriggered) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this._startX;
    const deltaY = touch.clientY - this._startY;
    const deltaTime = Date.now() - this._startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / deltaTime;

    // Determine gesture type
    if (distance < this._tapThreshold) {
      // Tap
      this._onTap(touch.clientX, touch.clientY);
    } else if (distance >= this._swipeThreshold && velocity >= this._swipeVelocity) {
      // Swipe with velocity
      this._onSwipe(deltaX, deltaY, velocity);
    }
  }

  _startLongPress(x, y) {
    this._cancelLongPress();

    this._longPressTimer = setTimeout(() => {
      this._longPressTriggered = true;
      this._onLongPress(x, y);
    }, this._longPressDelay);
  }

  _cancelLongPress() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  _onTap(x, y) {
    // Taps are typically handled by click events on elements
    // This is for areas without specific click handlers
    this._manager.emit('tap', { x, y }, 'touch');
  }

  _onSwipe(deltaX, deltaY, velocity) {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Two-finger swipe = page navigation
    if (this._touchCount >= 2) {
      if (absX > absY) {
        if (deltaX < 0) {
          this._manager.pageRight('touch');
        } else {
          this._manager.pageLeft('touch');
        }
      }
      return;
    }

    // Calculate directional velocity for momentum scrolling
    const velocityX = deltaX / (Date.now() - this._startTime);
    const velocityY = deltaY / (Date.now() - this._startTime);

    // Single finger swipe = navigation with velocity for momentum
    // For carousel UX: swipe left (deltaX < 0) = content moves left = show NEXT item = navigate right
    if (absX > absY) {
      // Horizontal swipe
      const direction = deltaX < 0 ? 'right' : 'left';
      this._manager.emit('navigate', { direction, velocity: Math.abs(velocityX), raw: velocityX }, 'touch');
    } else {
      // Vertical swipe
      const direction = deltaY < 0 ? 'down' : 'up';
      this._manager.emit('navigate', { direction, velocity: Math.abs(velocityY), raw: velocityY }, 'touch');
    }
  }

  _onLongPress(x, y) {
    // Long press triggers favorite
    this._manager.favorite('touch');

    // Haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }
}
