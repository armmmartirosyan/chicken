# VFX Integration Plan - Confetti System for PixiJS Engine

## Document Purpose

This document outlines the **architectural design and implementation strategy** for integrating the confetti spritesheet animation into the PixiJS-based game engine. It provides a step-by-step blueprint for developers to build the system while leaving Base64 asset slots empty for future data injection.

---

## 1. Architecture Overview

### System Design Philosophy

The confetti VFX follows the **Manager Pattern** established in the codebase:

- **Self-contained module**: `ConfettiManager.js` handles all lifecycle operations
- **Event-driven activation**: Listens to `GameEventBus` for win-state triggers
- **Zero global state**: All data encapsulated within manager instance
- **Resource cleanup**: Automatic texture/sprite destruction after playback

### Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                        Game.js                               │
│  (Orchestrates all managers + game loop)                    │
└────────┬─────────────┬──────────────┬───────────────────────┘
         │             │              │
         ▼             ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────────┐
  │ Coin     │  │ Gate     │  │ Confetti     │  ← NEW
  │ Manager  │  │ Manager  │  │ Manager      │
  └──────────┘  └──────────┘  └──────────────┘
         │             │              │
         └─────────────┴──────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ GameEventBus.js │  ← Event hub
              └─────────────────┘
```

### Dependency Chain

```javascript
ConfettiManager
  ├─ PixiRenderer (access to PIXI.Application)
  ├─ GameEventBus (listens for 'gameComplete' event)
  ├─ AudioEngine (plays confetti + victory sounds)
  └─ AssetManager (loads spritesheet textures)
```

---

## 2. Asset Loading Strategy

### File Structure (Empty Slots)

Create a new file: `src/constants/vfxAssets.js`

```javascript
/**
 * VFX Assets - Confetti Spritesheet Data
 *
 * PLACEHOLDER: Replace empty strings with actual Base64 data
 * - CONFETTI_JSON: Texture atlas metadata (frame positions)
 * - CONFETTI_PNG: Spritesheet image (Base64-encoded PNG)
 */

export const CONFETTI_SPRITESHEET = {
  // Spritesheet image (40 frames in single PNG)
  imageBase64: "", // ← USER FILLS THIS

  // Metadata for frame extraction
  frameWidth: 0, // ← USER FILLS THIS (e.g., 1920 if fullscreen width)
  frameHeight: 0, // ← USER FILLS THIS (e.g., 1080 if fullscreen height)
  frameCount: 40, // Total frames (0-39)
};

export const CONFETTI_AUDIO = {
  // Sound effect for confetti burst
  confettiSfxBase64: "", // ← USER FILLS THIS
};
```

### Loading Pipeline

#### Step 1: Data URI Preparation

```javascript
// src/game/managers/ConfettiManager.js (pseudo-code)
import {
  CONFETTI_SPRITESHEET,
  CONFETTI_AUDIO,
} from "../../constants/vfxAssets.js";

const imageDataURI = `data:image/png;base64,${CONFETTI_SPRITESHEET.imageBase64}`;
const confettiAudioURI = `data:audio/mp3;base64,${CONFETTI_AUDIO.confettiSfxBase64}`;
```

#### Step 2: PixiJS Texture Loading

```javascript
// Option A: Manual frame slicing (uniform grid)
const baseTexture = await PIXI.BaseTexture.from(imageDataURI);
const frames = [];
for (let i = 0; i < 40; i++) {
  const x = (i % columns) * frameWidth;
  const y = Math.floor(i / columns) * frameHeight;
  const rect = new PIXI.Rectangle(x, y, frameWidth, frameHeight);
  frames.push(new PIXI.Texture(baseTexture, rect));
}

// Option B: Use PIXI.Spritesheet with JSON data
// (Requires additional JSON structure if frames are non-uniform)
```

#### Step 3: Audio Registration

```javascript
// Integrate with AudioEngine.js
this.audioEngine.loadSound("confetti", confettiAudioURI);
this.audioEngine.loadSound("victory", victoryAudioURI);
```

---

## 3. ConfettiManager Implementation

### Class Structure

```javascript
// src/game/managers/ConfettiManager.js

import { AnimatedSprite, Texture, Rectangle } from "pixi.js";
import { gameEvents } from "../core/GameEventBus.js";
import { CONFETTI_SPRITESHEET } from "../../constants/vfxAssets.js";

export class ConfettiManager {
  constructor(config, pixiRenderer, audioEngine) {
    // Configuration
    this.config = config;
    this.pixiRenderer = pixiRenderer;
    this.audioEngine = audioEngine;

    // Animation state
    this.animatedSprite = null;
    this.isPlaying = false;
    this.textures = null; // Array of PIXI.Texture

    // Viewport tracking
    this.containerElement = null; // For responsive scaling
  }

  /**
   * Initialize manager and load assets
   */
  async initialize(containerElement) {
    this.containerElement = containerElement;

    // Load spritesheet frames
    await this.loadConfettiTextures();

    // Register event listener
    gameEvents.on("gameComplete", this.play.bind(this));

    // Register window resize handler
    window.addEventListener("resize", this.onResize.bind(this));
  }

  /**
   * Load spritesheet and create texture array
   */
  async loadConfettiTextures() {
    // Implementation in next section
  }

  /**
   * Play confetti animation
   */
  play() {
    // Implementation in next section
  }

  /**
   * Handle viewport resize during playback
   */
  onResize() {
    // Implementation in next section
  }

  /**
   * Cleanup and remove from stage
   */
  destroy() {
    // Implementation in next section
  }
}
```

### Key Methods Breakdown

#### A. `loadConfettiTextures()`

```javascript
async loadConfettiTextures() {
  // Validate data exists
  if (!CONFETTI_SPRITESHEET.imageBase64) {
    console.warn('[ConfettiManager] No confetti spritesheet data provided');
    return;
  }

  // Create Data URI
  const imageDataURI = `data:image/png;base64,${CONFETTI_SPRITESHEET.imageBase64}`;

  // Load base texture
  const baseTexture = await PIXI.BaseTexture.from(imageDataURI);

  // Slice into frames (assume uniform grid)
  const { frameWidth, frameHeight, frameCount } = CONFETTI_SPRITESHEET;
  this.textures = [];

  const columns = Math.floor(baseTexture.width / frameWidth);

  for (let i = 0; i < frameCount; i++) {
    const x = (i % columns) * frameWidth;
    const y = Math.floor(i / columns) * frameHeight;
    const rect = new Rectangle(x, y, frameWidth, frameHeight);
    this.textures.push(new Texture(baseTexture, rect));
  }

  console.log(`[ConfettiManager] Loaded ${this.textures.length} frames`);
}
```

#### B. `play()`

```javascript
play() {
  if (this.isPlaying) return;  // Prevent double-play
  if (!this.textures || this.textures.length === 0) {
    console.warn('[ConfettiManager] Cannot play: textures not loaded');
    return;
  }

  this.isPlaying = true;

  // Create animated sprite
  this.animatedSprite = new AnimatedSprite(this.textures);
  this.animatedSprite.anchor.set(0.5);  // Center origin
  this.animatedSprite.loop = false;     // Play once
  this.animatedSprite.animationSpeed = 28 / 60;  // 28 FPS in 60 FPS ticker

  // Position at viewport center
  const app = this.pixiRenderer.app;
  this.animatedSprite.x = app.view.width / 2;
  this.animatedSprite.y = app.view.height / 2;

  // Scale to fill viewport
  this.scaleToViewport();

  // Set z-index
  this.animatedSprite.zIndex = 999;

  // Add to stage
  app.stage.addChild(this.animatedSprite);
  app.stage.sortableChildren = true;

  // Play animation
  this.animatedSprite.play();

  // Play audio
  this.audioEngine.playSound('confetti');
  setTimeout(() => {
    this.audioEngine.playSound('victory');
  }, 100);

  // Register completion handler
  this.animatedSprite.onComplete = () => {
    this.destroy();
  };
}
```

#### C. `scaleToViewport()`

```javascript
scaleToViewport() {
  if (!this.animatedSprite) return;

  const app = this.pixiRenderer.app;
  const viewportWidth = app.view.width;
  const viewportHeight = app.view.height;

  // Calculate scale to fill viewport (stretch-to-fit)
  this.animatedSprite.width = viewportWidth;
  this.animatedSprite.height = viewportHeight;
}
```

#### D. `onResize()`

```javascript
onResize() {
  if (this.isPlaying && this.animatedSprite) {
    // Reposition and rescale during playback
    const app = this.pixiRenderer.app;
    this.animatedSprite.x = app.view.width / 2;
    this.animatedSprite.y = app.view.height / 2;
    this.scaleToViewport();
  }
}
```

#### E. `destroy()`

```javascript
destroy() {
  if (this.animatedSprite) {
    this.animatedSprite.stop();

    // Remove from stage
    if (this.animatedSprite.parent) {
      this.animatedSprite.parent.removeChild(this.animatedSprite);
    }

    // Destroy sprite (keep textures for potential replay)
    this.animatedSprite.destroy({ texture: false, baseTexture: false });
    this.animatedSprite = null;
  }

  this.isPlaying = false;
}
```

---

## 4. Game.js Integration

### Initialization Hook

```javascript
// src/game/core/Game.js

import { ConfettiManager } from "../managers/ConfettiManager.js";

export class Game {
  constructor(canvas, config) {
    // ... existing properties
    this.confettiManager = null; // ← ADD THIS
  }

  async initialize(entityManager, assetManager, inputSystem) {
    // ... existing initialization

    // Initialize confetti manager
    this.confettiManager = new ConfettiManager(
      this.config,
      this.renderer,
      this.audioEngine, // Assuming AudioEngine exists
    );
    await this.confettiManager.initialize(this.containerElement);

    // ... rest of initialization
  }
}
```

### Event Emission (Trigger Point)

```javascript
// src/game/core/Game.js (or wherever win-state is detected)

// When chicken reaches finish line (lane 6 crossed)
if (this.currentLaneIndex >= 5) {
  // Or whatever win condition
  gameEvents.emit("gameComplete", {
    winAmount: this.calculateWinAmount(),
    lanesPassed: this.currentLaneIndex + 1,
  });
  // Confetti manager automatically plays via event listener
}
```

---

## 5. Z-Index Hierarchy

### Rendering Layer Specification

```javascript
// Ensure confetti renders above ALL game elements
// Z-index values across the game:

export const Z_INDEX = {
  BACKGROUND: 0,
  ROAD: 10,
  SCENERY: 15,
  GATES: 20,
  COINS: 80,
  CHICKEN: 70,
  CARS: 60,
  UI_ELEMENTS: 100,
  WIN_NOTIFICATION: 150,
  CONFETTI: 999, // ← Highest layer
};
```

### Stage Configuration

```javascript
// Ensure stage supports z-index sorting
// src/game/core/PixiRenderer.js

this.app.stage.sortableChildren = true; // Enable sortable children globally
```

---

## 6. Responsive Scaling Logic

### Challenge

The source HTML **does not** handle runtime resizing. We must implement this for production quality.

### Solution: Real-time Viewport Tracking

```javascript
// Confetti must adapt to:
1. Initial window dimensions
2. Browser zoom (Ctrl +/-)
3. Mobile orientation changes (portrait ↔ landscape)
4. Fullscreen toggles

// Implementation:
window.addEventListener('resize', () => {
  // Update confetti position + scale if currently playing
  if (confettiManager.isPlaying) {
    confettiManager.onResize();
  }
});
```

### Mobile Considerations

```javascript
// Detect orientation change
window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    confettiManager.onResize();
  }, 300); // Wait for layout reflow
});
```

---

## 7. Memory Management

### GPU Texture Lifecycle

```javascript
// CRITICAL: Avoid memory leaks
1. Load textures ONCE during initialize()
2. Reuse texture array for multiple plays (if needed)
3. Destroy sprite instance after playback
4. Keep textures in memory (don't destroy baseTexture)
```

### Cleanup Checklist

```javascript
destroy() {
  // ✅ Remove sprite from stage
  if (this.animatedSprite.parent) {
    this.animatedSprite.parent.removeChild(this.animatedSprite);
  }

  // ✅ Destroy sprite (but NOT textures - allow replay)
  this.animatedSprite.destroy({
    texture: false,      // Keep textures
    baseTexture: false,  // Keep base texture
  });

  // ❌ DO NOT destroy textures if confetti may replay
  // ✅ Only destroy textures on final game cleanup
}
```

---

## 8. Testing Strategy

### Unit Tests

```javascript
describe("ConfettiManager", () => {
  it("should load 40 textures from spritesheet", async () => {
    const manager = new ConfettiManager(config, renderer, audio);
    await manager.initialize(container);
    expect(manager.textures).toHaveLength(40);
  });

  it("should scale to viewport dimensions", () => {
    manager.play();
    const sprite = manager.animatedSprite;
    expect(sprite.width).toBe(renderer.app.view.width);
    expect(sprite.height).toBe(renderer.app.view.height);
  });

  it("should auto-destroy after animation completes", (done) => {
    manager.play();
    manager.animatedSprite.onComplete = () => {
      expect(manager.animatedSprite).toBeNull();
      done();
    };
  });
});
```

### Integration Tests

```javascript
// Test with real game flow
1. Start game → reach finish line
2. Verify confetti plays automatically
3. Verify audio plays (confetti + victory)
4. Verify sprite removed after 1.43 seconds
5. Verify no memory leaks (check texture count)
```

### Visual QA Checklist

- [ ] Confetti covers entire viewport (no gaps)
- [ ] Animation plays at correct speed (28 FPS feels smooth)
- [ ] Z-index correct (confetti above all game elements)
- [ ] Audio synced (confetti SFX instant, victory after 100ms)
- [ ] Cleanup verified (sprite removed from stage)
- [ ] Responsive (resize window → confetti adapts)

---

## 9. Performance Benchmarks

### Target Metrics

```
Texture Load Time: < 200ms
Animation FPS: 60 FPS (ticker) with 28 FPS playback speed
Memory Footprint: ~1-2 MB (40 frames)
Cleanup Time: < 16ms (1 frame)
```

### Profiling Points

```javascript
// Add performance markers
console.time("confetti-load");
await confettiManager.initialize();
console.timeEnd("confetti-load");

console.time("confetti-play");
confettiManager.play();
console.timeEnd("confetti-play");
```

---

## 10. Deployment Checklist

### Pre-Release Validation

- [ ] CONFETTI_SPRITESHEET.imageBase64 populated (not empty string)
- [ ] CONFETTI_AUDIO.confettiSfxBase64 populated
- [ ] Frame count verified (40 frames extracted correctly)
- [ ] Z-index tested (confetti always on top)
- [ ] Memory leak test passed (no lingering textures)
- [ ] Cross-browser tested (Chrome, Firefox, Safari, Edge)
- [ ] Mobile tested (iOS Safari, Android Chrome)

### Fallback Behavior

```javascript
// If Base64 data not provided:
if (!CONFETTI_SPRITESHEET.imageBase64) {
  console.warn("[ConfettiManager] No confetti data - skipping VFX");
  // Emit 'confettiSkipped' event
  gameEvents.emit("confettiSkipped");
  // Continue to next UI step (cash-out button)
}
```

---

## 11. Future Enhancements

### Potential Upgrades

1. **Particle Density Options**: Low/Medium/High quality for performance tuning
2. **Color Variants**: Team colors, seasonal themes (Christmas, Halloween)
3. **Sound Variations**: Randomized victory themes
4. **Custom Durations**: Adjustable playback speed (slow-mo for drama)
5. **Replay Capability**: Play confetti again without reloading textures

### Extensibility

```javascript
// Design allows for multiple VFX managers:
- ConfettiManager
- FireworksManager
- SparklesManager
- ExplosionManager

// All follow same pattern:
1. Load textures from Base64
2. Listen to GameEventBus
3. Play animation
4. Auto-cleanup
```

---

## Conclusion

The ConfettiManager integration follows these principles:

1. **Separation of Concerns**: VFX logic isolated in dedicated manager
2. **Event-Driven**: Decoupled from game logic via GameEventBus
3. **Responsive**: Adapts to viewport changes in real-time
4. **Memory-Safe**: Automatic cleanup with no leaks
5. **Extensible**: Foundation for future VFX systems

**Next Step**: Implement `ConfettiManager.js` with empty asset slots → User provides Base64 data → System works end-to-end.

**Developer Note**: The "empty slot protocol" ensures the code infrastructure is production-ready while allowing flexible asset pipeline (designer exports → Base64 encode → paste into vfxAssets.js).
