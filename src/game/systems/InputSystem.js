/**
 * InputSystem - Handles mouse/touch input for the game
 * Manages input state and event handling
 */
export class InputSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.isDragging = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;

    this.setupEventListeners();
  }

  /**
   * Setup mouse/touch event listeners
   */
  setupEventListeners() {
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);

    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
    this.dragStartX = this.mouseX;
    this.dragStartY = this.mouseY;
    this.isDragging = true;
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
  }

  /**
   * Handle mouse up
   */
  handleMouseUp() {
    this.isDragging = false;
  }

  /**
   * Handle mouse leave
   */
  handleMouseLeave() {
    this.isDragging = false;
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    if (!this.canvas) return;

    try {
      this.canvas.removeEventListener("mousedown", this.handleMouseDown);
      this.canvas.removeEventListener("mousemove", this.handleMouseMove);
      this.canvas.removeEventListener("mouseup", this.handleMouseUp);
      this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
    } catch (e) {
      // Event listeners might already be removed
    }
  }
}
