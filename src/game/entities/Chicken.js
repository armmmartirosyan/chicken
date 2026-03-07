import { BaseEntity } from "./BaseEntity.js";
import { Sprite, Text, Container } from "pixi.js";

/**
 * Chicken - The player character entity using Spine animation
 * Handles chicken rendering and animation with hardware acceleration
 */
export class Chicken extends BaseEntity {
  constructor(x, y, config) {
    super(x, y);

    this.config = config;
    this.baseSize = config.chickenSize || 280;
    this.scale = config.chickenScale || 0.5; // Reduced default scale for Spine
    this.width = this.baseSize * this.scale;
    this.height = this.baseSize * this.scale;

    this.facingRight = true;
    this.currentAnimation = "idle";
    this.spine = null;

    // Jump state
    this.isJumping = false;
    this.jumpStartX = x;
    this.jumpEndX = x;
    this.jumpStartY = y;
    this.jumpProgress = 0;
    this.jumpDuration = 0.4; // 400ms jump animation for fast movement
    this.worldOffsetX = 0; // Track world offset for fixed chicken position
    this.minY = 50; // Minimum Y position to prevent going too high
    this.hasStartedJumpAnimation = false; // Track if animation has started

    // World movement animation
    this.shouldMoveWorld = false;
    this.startWorldOffset = 0;
    this.endWorldOffset = 0;
    this.maxWorldOffset = 0; // Maximum allowed offset to prevent showing black space
    this.stage = null; // Reference to Pixi stage for world movement
    this.fixedViewportX = null; // Fixed X position in viewport during world movement

    // Jump completion callback
    this.onJumpComplete = null; // Callback to trigger when landing completes

    // Tooltip for displaying multiplier
    this.tooltipSprite = null;
    this.tooltipText = null;
    this.tooltipVisible = false;
  }

  /**
   * Set the Spine animation
   */
  setSpine(spine) {
    // Guard against destroyed container
    if (!this.container) {

      return;
    }

    if (this.spine) {
      this.spine.destroy();
    }

    this.spine = spine;

    if (!this.spine) {

      return;
    }

    // Set scale
    this.spine.scale.set(this.scale);

    // Center the spine animation
    // Spine animations are typically centered at origin, but we may need to adjust
    this.spine.x = 0;
    this.spine.y = 0;

    // Disable culling to ensure Spine is always rendered
    this.spine.cullable = false;

    // Ensure container is always visible and not masked
    this.container.cullable = false;
    this.container.mask = null;
    this.container.zIndex = 100; // High z-index to keep chicken on top

    // Ensure Spine bounds are properly calculated for visibility
    if (this.spine.getBounds) {
      this.spine.getBounds(true); // Force bounds calculation
    }

    // Set initial animation state
    if (this.spine.state) {
      // Try to play idle animation
      const animationNames = ["idle", "idle_front", "walk", "stand"];
      let foundAnimation = false;

      for (const animName of animationNames) {
        try {
          this.spine.state.setAnimation(0, animName, true);
          this.currentAnimation = animName;
          foundAnimation = true;
          break;
        } catch {
          // Animation doesn't exist, try next
        }
      }

      if (!foundAnimation) {
        console.warn(
          "No idle animation found, trying first available animation",
        );
        const animations = this.spine.spineData?.animations;
        if (animations && animations.length > 0) {
          this.spine.state.setAnimation(0, animations[0].name, true);
          this.currentAnimation = animations[0].name;
        }
      }

      // Set up animation event listener for smooth transitions
      this.spine.state.addListener({
        complete: (entry) => {
          // When jump animation completes, return to idle
          if (entry.animation.name === "jump" && !this.isJumping) {
            this.spine.state.timeScale = 1;
            this.playAnimation("idle", true);
          }
        },
      });
    }

    // Update scale based on facing direction
    if (!this.facingRight) {
      this.spine.scale.x = -Math.abs(this.spine.scale.x);
    }

    this.container.addChild(this.spine);
  }

  /**
   * Set the tooltip texture and create tooltip UI
   */
  setTooltipTexture(texture) {
    if (!this.container || !texture) {

      return;
    }

    // Create tooltip sprite
    this.tooltipSprite = new Sprite(texture);
    this.tooltipSprite.anchor.set(0.5);

    // Dynamic scaling: make tooltip slightly narrower than chicken (90% width)
    const chickenWidth = this.width; // Already scaled chicken width
    const tooltipTextureWidth = texture.width;
    const targetScale = (chickenWidth * 0.9) / tooltipTextureWidth; // 90% of chicken width

    // Apply uniform scale to both axes (prevent stretching)
    this.tooltipSprite.scale.set(targetScale);

    // Calculate text size to fill 90-95% of tooltip height
    const tooltipHeight = texture.height * targetScale;
    const textSize = tooltipHeight * 0.4; // Fill 92% of tooltip height

    // Create tooltip text with maximized size
    this.tooltipText = new Text({
      text: "1.00x",
      style: {
        fontFamily: "Arial",
        fontSize: textSize, // Large text to fill tooltip
        fontWeight: "bold",
        fill: "#ffffff",
        stroke: { color: "#000000", width: 3 }, // Slightly thinner stroke to save space
        dropShadow: {
          alpha: 0.7,
          angle: Math.PI / 4,
          blur: 3, // Reduced blur for tighter fit
          color: "#000000",
          distance: 4, // Reduced distance for tighter fit
        },
        padding: 0, // Eliminate internal padding
        trim: false, // Don't trim whitespace
      },
    });
    this.tooltipText.anchor.set(0.5, 0.5); // Perfect center
    this.tooltipText.x = 0;
    this.tooltipText.y = 12;

    // PixiJS v8: Sprite can't have children, wrap in Container
    this.tooltipContainer = new Container();
    this.tooltipContainer.addChild(this.tooltipSprite);
    this.tooltipContainer.addChild(this.tooltipText);
    this.tooltipContainer.visible = false;
    this.tooltipContainer.zIndex = -1; // Behind chicken but above road

    // Position tightly below chicken - just 5px below feet
    // Chicken origin is centered, so half height gets to feet
    this.tooltipContainer.y = this.height / 2 + 5; // 5px gap below feet

    // Add tooltip container to chicken (will move with chicken)
    this.container.addChild(this.tooltipContainer);
    this.container.sortableChildren = true;
  }

  /**
   * Update tooltip text with current multiplier
   */
  updateTooltipText(multiplier) {
    if (!this.tooltipText) return;

    // Format multiplier text (same logic as coins)
    let displayText;
    if (multiplier >= 1000) {
      if (multiplier >= 1000000) {
        displayText = (multiplier / 1000000).toFixed(1) + "M x";
      } else {
        displayText = (multiplier / 1000).toFixed(1) + "K x";
      }
    } else if (multiplier >= 100) {
      displayText = multiplier.toFixed(0) + "x";
    } else if (multiplier >= 10) {
      displayText = multiplier.toFixed(1) + "x";
    } else {
      displayText = multiplier.toFixed(2) + "x";
    }

    this.tooltipText.text = displayText;
  }

  /**
   * Show the tooltip
   */
  showTooltip() {
    if (this.tooltipContainer) {
      this.tooltipContainer.visible = true;
      this.tooltipVisible = true;
    }
  }

  /**
   * Hide the tooltip
   */
  hideTooltip() {
    if (this.tooltipContainer) {
      this.tooltipContainer.visible = false;
      this.tooltipVisible = false;
    }
  }

  /**
   * Set the direction the chicken is facing
   */
  setDirection(facingRight) {
    this.facingRight = facingRight;
    if (this.spine) {
      this.spine.scale.x =
        Math.abs(this.spine.scale.x) * (facingRight ? 1 : -1);
    }
  }

  /**
   * Play animation
   */
  playAnimation(animationName, loop = true) {
    if (
      this.spine &&
      this.spine.state &&
      this.currentAnimation !== animationName
    ) {
      try {
        this.spine.state.setAnimation(0, animationName, loop);
        this.currentAnimation = animationName;
      } catch {

      }
    }
  }

  /**
   * Jump to a target X position
   * @param {number} targetX - Target world X position
   * @param {boolean} shouldMoveWorld - If true, chicken stays fixed on screen (world scrolls)
   * @param {Object} worldAnimationData - Not used anymore (camera is atomic)
   * @param {Function} onComplete - Optional callback to trigger when landing completes
   * @param {boolean} isJumpingToFinish - If true, don't show tooltip after landing
   */
  jumpTo(
    targetX,
    shouldMoveWorld = false,
    worldAnimationData = null,
    onComplete = null,
    isJumpingToFinish = false,
  ) {
    if (this.isJumping) return; // Already jumping

    this.isJumping = true;
    this.jumpStartX = this.x;
    this.jumpEndX = targetX;
    this.jumpStartY = this.y;
    this.jumpProgress = 0;
    this.shouldMoveWorld = shouldMoveWorld;
    this.hasStartedJumpAnimation = false; // Reset animation flag
    this.onJumpComplete = onComplete; // Store callback
    this.isJumpingToFinish = isJumpingToFinish; // Store finish flag

    // Hide tooltip during jump
    this.hideTooltip();

    // For world-move mode, calculate fixed viewport position
    if (shouldMoveWorld && worldAnimationData) {
      this.fixedViewportX = worldAnimationData.fixedViewportX;
    } else {
      this.fixedViewportX = null;
    }
  }

  /**
   * Update chicken state
   */
  update(deltaTime) {
    if (!this.active) return;

    // Handle jump movement with vertical arc
    if (this.isJumping) {
      this.jumpProgress += deltaTime / this.jumpDuration;

      // Start jump animation right before horizontal position starts changing
      if (!this.hasStartedJumpAnimation && this.jumpProgress > 0) {
        this.hasStartedJumpAnimation = true;
        if (this.spine && this.spine.state) {
          try {
            this.spine.state.setAnimation(0, "jump", false);
            this.spine.state.timeScale = 1.6;
            this.currentAnimation = "jump";
          } catch {

            const fallbackAnimations = ["walk", "idle_front", "idle"];
            for (const anim of fallbackAnimations) {
              try {
                this.spine.state.setAnimation(0, anim, false);
                this.currentAnimation = anim;
                break;
              } catch {
                // Continue to next fallback
              }
            }
          }
        }
      }

      if (this.jumpProgress >= 1) {
        // Jump complete
        this.jumpProgress = 1;
        this.isJumping = false;

        // Update internal world position
        this.x = this.jumpEndX;

        // Update container position to match world position
        // Atomic camera handles screen positioning automatically
        this.container.position.x = this.x;
        this.container.position.y = this.jumpStartY;
        this.y = this.jumpStartY;

        // Ensure container visibility
        this.container.visible = true;
        this.container.alpha = 1.0;

        // Show tooltip after successful landing (unless jumping to finish)
        if (!this.isJumpingToFinish) {
          this.showTooltip();
        }

        // Trigger completion callback if provided
        if (this.onJumpComplete) {
          const callback = this.onJumpComplete;
          this.onJumpComplete = null; // Clear callback
          callback(); // Execute callback
        }
      } else {
        // Interpolate position with easing
        const easeProgress = this.easeInOutQuad(this.jumpProgress);

        // ━━━ ATOMIC UPDATE: Update chicken's world X position ━━━
        // This is the ONLY place that changes chicken.x during a jump
        // The camera (PixiRenderer.updateCamera) reads this.x every frame
        this.x =
          this.jumpStartX + (this.jumpEndX - this.jumpStartX) * easeProgress;

        // ━━━ CONTAINER POSITION: Always set to world position ━━━
        // The atomic camera (PixiRenderer.updateCamera) handles screen positioning
        // by moving worldContainer.x to keep chicken at 10% from left
        this.container.position.x = this.x;
        this.container.position.y = this.y;

        // Ensure container remains visible during jump
        this.container.visible = true;
        this.container.alpha = 1.0;
      }
    }

    // Update visibility and ensure container state is correct
    if (this.container) {
      this.container.visible = this.visible;
      this.container.alpha = 1.0;
    }

    // Call parent update AFTER our position updates to sync x/y properties
    super.update(deltaTime);

    // Spine animation updates automatically via Pixi ticker
  }

  /**
   * Easing function for smooth jump (ease in-out)
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Play death animation
   */
  playDeath(onComplete) {
    // Hide tooltip during death
    this.hideTooltip();

    if (!this.spine || !this.spine.state) {

      if (onComplete) onComplete();
      return;
    }

    try {
      // Try to play death animation
      this.spine.state.setAnimation(0, "death", false); // false = play once
      this.currentAnimation = "death";

      // Listen for animation complete
      if (onComplete) {
        this.spine.state.addListener({
          complete: (entry) => {
            if (entry.animation.name === "death") {
              onComplete();
            }
          },
        });
      }
    } catch (error) {

      if (onComplete) onComplete();
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this.tooltipText) {
      this.tooltipText.destroy();
      this.tooltipText = null;
    }
    if (this.tooltipSprite) {
      this.tooltipSprite.destroy();
      this.tooltipSprite = null;
    }
    if (this.spine) {
      this.spine.destroy();
      this.spine = null;
    }
    super.destroy();
  }
}
