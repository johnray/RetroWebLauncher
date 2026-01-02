/**
 * RetroWebLauncher - iOS-like Scroll Physics Engine
 *
 * Implements physics-based scrolling with:
 * - 1:1 touch tracking during drag
 * - Momentum with exponential friction (iOS deceleration)
 * - Rubber-band effect at edges
 * - Spring snap to nearest item
 *
 * Physics values derived from iOS UIScrollView:
 * - Deceleration rate: 0.998 per millisecond (normal)
 * - Rubber-band coefficient: 0.55
 * - Spring: damping = 1, frequency = 2
 *
 * Sources:
 * - https://developer.apple.com/documentation/uikit/uiscrollview/decelerationrate-swift.struct
 * - https://holko.pl/2014/07/06/inertia-bouncing-rubber-banding-uikit-dynamics/
 */

export class ScrollPhysics {
  constructor(options = {}) {
    // Callback when position changes
    this.onPositionChange = options.onPositionChange || (() => {});
    // Callback when scroll ends (for snap)
    this.onScrollEnd = options.onScrollEnd || (() => {});
    // Get item count for bounds checking
    this.getItemCount = options.getItemCount || (() => 0);
    // Whether to wrap around (infinite) or rubber-band at edges
    this.wrapAround = options.wrapAround !== false; // Default true

    // Physics constants (iOS-derived)
    this._decelerationRate = 0.998; // Per millisecond (iOS normal)
    this._rubberBandCoeff = 0.55; // iOS rubber-band constant
    this._dragThreshold = 10; // Pixels before drag starts
    this._snapVelocityThreshold = 50; // px/s - below this, start snapping
    this._snapDistanceThreshold = 0.3; // Within 0.3 items, snap immediately

    // Spring constants for snap animation (higher values = faster/snappier)
    this._springDamping = 25; // Damping coefficient
    this._springStiffness = 500; // Spring stiffness (higher = snappier)

    // State
    this._position = 0; // Current position (can be fractional)
    this._velocity = 0; // Current velocity (items per second)
    this._isDragging = false;
    this._isAnimating = false;
    this._animationRaf = null;
    this._lastFrameTime = 0;

    // Touch tracking
    this._touchStartPosition = 0;
    this._touchStartOffset = 0;
    this._touchSamples = []; // Recent touch samples for velocity calculation
    this._maxSamples = 5; // Number of samples to keep

    // Item size (pixels per item) - set by carousel
    this._itemSize = 100;
  }

  /**
   * Set the item size in pixels (width for horizontal, height for vertical)
   */
  setItemSize(size) {
    this._itemSize = size;
  }

  /**
   * Set current position (in items, can be fractional)
   */
  setPosition(position) {
    this._position = position;
    this._velocity = 0;
  }

  /**
   * Get current position
   */
  getPosition() {
    return this._position;
  }

  /**
   * Start drag at given pixel position
   */
  startDrag(pixelPosition) {
    this._stopAnimation();
    this._isDragging = true;
    this._touchStartPosition = pixelPosition;
    this._touchStartOffset = this._position;
    this._touchSamples = [{
      position: pixelPosition,
      time: performance.now()
    }];
  }

  /**
   * Update drag with current pixel position
   * Returns true if drag threshold exceeded
   */
  updateDrag(pixelPosition) {
    if (!this._isDragging) return false;

    const deltaPixels = pixelPosition - this._touchStartPosition;
    const deltaItems = deltaPixels / this._itemSize;

    // Check if we've exceeded drag threshold
    if (Math.abs(deltaPixels) < this._dragThreshold && this._touchSamples.length <= 1) {
      return false;
    }

    // Add touch sample for velocity calculation
    const now = performance.now();
    this._touchSamples.push({ position: pixelPosition, time: now });
    if (this._touchSamples.length > this._maxSamples) {
      this._touchSamples.shift();
    }

    // Calculate new position
    let newPosition = this._touchStartOffset - deltaItems;

    const itemCount = this.getItemCount();
    if (itemCount > 0) {
      if (this.wrapAround) {
        // Normalize position for wrap-around
        while (newPosition < 0) newPosition += itemCount;
        while (newPosition >= itemCount) newPosition -= itemCount;
      } else {
        // Apply rubber-band effect at edges
        if (newPosition < 0) {
          newPosition = this._rubberBand(newPosition, this._itemSize * 2);
        } else if (newPosition > itemCount - 1) {
          const overshoot = newPosition - (itemCount - 1);
          newPosition = (itemCount - 1) + this._rubberBand(overshoot, this._itemSize * 2);
        }
      }
    }

    this._position = newPosition;
    this.onPositionChange(this._position);
    return true;
  }

  /**
   * End drag - calculate velocity and start momentum/snap animation
   */
  endDrag() {
    if (!this._isDragging) return;
    this._isDragging = false;

    // Calculate velocity from recent touch samples
    this._velocity = this._calculateVelocity();

    // Start momentum animation
    this._startMomentum();
  }

  /**
   * Cancel drag without momentum
   */
  cancelDrag() {
    this._isDragging = false;
    this._velocity = 0;
    this._touchSamples = [];
  }

  /**
   * Navigate by delta items (for keyboard/gamepad/wheel)
   */
  navigateBy(delta) {
    this._stopAnimation();
    const itemCount = this.getItemCount();
    if (itemCount === 0) return;

    let targetIndex = Math.round(this._position) + delta;

    if (this.wrapAround) {
      targetIndex = ((targetIndex % itemCount) + itemCount) % itemCount;
    } else {
      targetIndex = Math.max(0, Math.min(itemCount - 1, targetIndex));
    }

    // Animate to target with spring
    this._springToTarget(targetIndex);
  }

  /**
   * Snap to specific index with spring animation
   */
  snapTo(index) {
    this._stopAnimation();
    this._springToTarget(index);
  }

  /**
   * Apply iOS-style rubber band effect
   * Formula: f(x, d, c) = (x * d * c) / (d + c * x)
   */
  _rubberBand(offset, dimension) {
    const c = this._rubberBandCoeff;
    const absOffset = Math.abs(offset);
    const sign = offset < 0 ? -1 : 1;
    return sign * (absOffset * dimension * c) / (dimension + c * absOffset);
  }

  /**
   * Calculate velocity from touch samples (items per second)
   */
  _calculateVelocity() {
    if (this._touchSamples.length < 2) return 0;

    const oldest = this._touchSamples[0];
    const newest = this._touchSamples[this._touchSamples.length - 1];
    const deltaTime = (newest.time - oldest.time) / 1000; // seconds

    if (deltaTime === 0) return 0;

    const deltaPixels = newest.position - oldest.position;
    const deltaItems = deltaPixels / this._itemSize;

    // Velocity in items per second (negative because drag direction is opposite scroll direction)
    return -deltaItems / deltaTime;
  }

  /**
   * Start momentum animation with exponential friction
   */
  _startMomentum() {
    this._isAnimating = true;
    this._lastFrameTime = performance.now();

    const animate = () => {
      if (!this._isAnimating) return;

      const now = performance.now();
      const deltaTime = now - this._lastFrameTime;
      this._lastFrameTime = now;

      // Apply exponential friction (iOS deceleration)
      // velocity *= decelerationRate ^ deltaTime
      const friction = Math.pow(this._decelerationRate, deltaTime);
      this._velocity *= friction;

      // Update position
      const deltaPosition = this._velocity * (deltaTime / 1000);
      let newPosition = this._position + deltaPosition;

      const itemCount = this.getItemCount();
      if (itemCount > 0) {
        if (this.wrapAround) {
          // Normalize for wrap-around
          while (newPosition < 0) newPosition += itemCount;
          while (newPosition >= itemCount) newPosition -= itemCount;
        } else {
          // Bounce back from edges
          if (newPosition < 0 || newPosition > itemCount - 1) {
            // Reduce velocity when hitting edge
            this._velocity *= 0.5;
            newPosition = Math.max(0, Math.min(itemCount - 1, newPosition));
          }
        }
      }

      this._position = newPosition;
      this.onPositionChange(this._position);

      // Check if we should snap
      const absVelocity = Math.abs(this._velocity);
      let nearestItem = Math.round(this._position);

      // Ensure nearestItem is within bounds for wrap-around
      if (this.wrapAround && itemCount > 0) {
        nearestItem = ((nearestItem % itemCount) + itemCount) % itemCount;
      }

      // Calculate distance considering wrap-around
      let distanceToNearest = Math.abs(this._position - nearestItem);
      if (this.wrapAround && itemCount > 0) {
        // Also check wrap-around distance
        const wrapDistance = itemCount - distanceToNearest;
        distanceToNearest = Math.min(distanceToNearest, wrapDistance);
      }

      if (absVelocity < this._snapVelocityThreshold / this._itemSize ||
          distanceToNearest < this._snapDistanceThreshold) {
        // Start spring snap to nearest item
        this._springToTarget(nearestItem);
        return;
      }

      this._animationRaf = requestAnimationFrame(animate);
    };

    this._animationRaf = requestAnimationFrame(animate);
  }

  /**
   * Spring animation to target index
   */
  _springToTarget(targetIndex) {
    this._isAnimating = true;
    this._lastFrameTime = performance.now();

    const itemCount = this.getItemCount();

    // Calculate the effective target considering wrap-around
    // We need to find the shortest path to the target
    let effectiveTarget = targetIndex;
    if (this.wrapAround && itemCount > 0) {
      const normalizedTarget = ((targetIndex % itemCount) + itemCount) % itemCount;
      const directDistance = normalizedTarget - this._position;
      const wrapForwardDistance = directDistance - itemCount; // Go backwards via wrap
      const wrapBackwardDistance = directDistance + itemCount; // Go forwards via wrap

      // Pick the shortest path
      if (Math.abs(wrapForwardDistance) < Math.abs(directDistance)) {
        effectiveTarget = this._position + wrapForwardDistance;
      } else if (Math.abs(wrapBackwardDistance) < Math.abs(directDistance)) {
        effectiveTarget = this._position + wrapBackwardDistance;
      } else {
        effectiveTarget = this._position + directDistance;
      }
    }

    // Spring state - use unwrapped position for smooth animation
    let position = this._position;
    let velocity = this._velocity;
    const target = effectiveTarget;

    const animate = () => {
      if (!this._isAnimating) return;

      const now = performance.now();
      const deltaTime = Math.min((now - this._lastFrameTime) / 1000, 0.1); // Cap at 100ms
      this._lastFrameTime = now;

      // Spring physics: F = -kx - cv
      // Where k = stiffness, c = damping, x = displacement, v = velocity
      const displacement = position - target;
      const springForce = -this._springStiffness * displacement;
      const dampingForce = -this._springDamping * velocity;
      const acceleration = springForce + dampingForce;

      // Update velocity and position
      velocity += acceleration * deltaTime;
      position += velocity * deltaTime;

      // Handle wrap-around for position display
      const currentItemCount = this.getItemCount();
      let displayPosition = position;
      if (this.wrapAround && currentItemCount > 0) {
        while (displayPosition < 0) displayPosition += currentItemCount;
        while (displayPosition >= currentItemCount) displayPosition -= currentItemCount;
      }

      this._position = displayPosition;
      this._velocity = velocity;
      this.onPositionChange(this._position);

      // Check if spring has settled
      if (Math.abs(displacement) < 0.001 && Math.abs(velocity) < 0.001) {
        // Snap to exact target
        this._position = this.wrapAround && currentItemCount > 0
          ? ((targetIndex % currentItemCount) + currentItemCount) % currentItemCount
          : Math.max(0, Math.min(currentItemCount - 1, targetIndex));
        this._velocity = 0;
        this._isAnimating = false;
        this.onPositionChange(this._position);
        this.onScrollEnd(Math.round(this._position));
        return;
      }

      this._animationRaf = requestAnimationFrame(animate);
    };

    this._animationRaf = requestAnimationFrame(animate);
  }

  /**
   * Stop any running animation
   */
  _stopAnimation() {
    this._isAnimating = false;
    if (this._animationRaf) {
      cancelAnimationFrame(this._animationRaf);
      this._animationRaf = null;
    }
  }

  /**
   * Clean up
   */
  destroy() {
    this._stopAnimation();
    this._isDragging = false;
  }
}
