# Confetti Animation Mechanics - Reverse Engineering Report

## Executive Summary

The confetti animation is a **spritesheet-based particle effect** (NOT Spine skeletal animation) designed to create a celebratory burst when the player reaches the finish line. This document provides a complete technical breakdown of its implementation in the source HTML.

---

## 1. Animation Type & Structure

### Classification

- **Type**: Frame-by-frame spritesheet animation
- **Format**: PNG image spritesheet with sequential frames
- **Technology**: Phaser 3 AnimatedSprite system (to be ported to PixiJS AnimatedSprite)

### Spritesheet Specifications

```javascript
// Source: index.html lines 420-425
this.load.spritesheet(
  "confetti_anim",
  "data:image/png;base64,[BASE64_DATA]", // Single PNG with all frames
  {
    frameWidth: WIDTH, // To be determined from actual asset
    frameHeight: HEIGHT, // To be determined from actual asset
  },
);
```

### Animation Configuration

```javascript
// Source: index.html lines 473-481
this.anims.create({
  key: "confettiAnim",
  frames: this.anims.generateFrameNumbers("confetti_anim", {
    start: 0,
    end: 39, // 40 total frames
  }),
  frameRate: 28, // 28 frames per second
  repeat: 0, // Play ONCE (no looping)
});
```

**Duration Calculation**: 40 frames ÷ 28 FPS = **1.43 seconds** per playthrough

---

## 2. Trigger Conditions

### Trigger Point

The confetti animation triggers when **ALL THREE conditions are met**:

1. **Game State**: `clickCount === 6` (6th successful move = finish line reached)
2. **Sequence Position**: After `showWinScore()` completes
3. **Callback Context**: Inside `dropBarricade()` completion callback

### Execution Flow

```
User clicks Play (6th time)
  → moveBackground() executes
    → showWinScore() displays win amount
      → dropBarricade() animates barrier
        → 🎉 CONFETTI TRIGGERS HERE
          ├─ confettiAnim.play("confettiAnim")
          ├─ confettiSound.play()
          └─ After 100ms → victorySound.play()
```

### Source Code Reference

```javascript
// Source: index.html lines 686-702
else if (clickCount === 6) {
  moveBackground(this, () => {
    showWinScore(this);
    dropBarricade(this, () => {
      const confettiAnim = this.add.sprite(
        config.width / 2,
        config.height / 2,
        "confetti_anim",
      );
      confettiAnim.setDepth(999);
      confettiAnim.setDisplaySize(
        config.width,
        config.height,
      );
      confettiAnim.play("confettiAnim");
      confettiSound.play();  // Plays immediately
      this.time.delayedCall(100, () => {
        victorySound.play();  // Plays 100ms later
      });

      // ... (cleanup logic on animationcomplete)
    });
  });
}
```

---

## 3. Playback Logic

### Playback Behavior

- **Single-shot animation**: `repeat: 0` means it plays from frame 0 → 39 exactly once
- **No looping**: After frame 39, animation stops automatically
- **Self-contained**: The spritesheet contains all visual information

### Lifecycle States

1. **Instantiation** (frame 0): Sprite created at viewport center
2. **Playback** (frames 0-39): Animation progresses at 28 FPS
3. **Completion Event** (after frame 39): `animationcomplete` event fires
4. **Destruction**: Sprite removed from stage via `confettiAnim.destroy()`

### Cleanup Implementation

```javascript
// Source: index.html lines 721-723
confettiAnim.on("animationcomplete", () => {
  confettiAnim.destroy(); // Remove from memory

  // Next UI interaction (cash-out button) becomes active here
});
```

**Memory Management**: Critical that `destroy()` is called to prevent GPU texture leaks.

---

## 4. Scaling & Positioning

### Positioning Strategy

```javascript
// Source: index.html lines 689-698
const confettiAnim = this.add.sprite(
  config.width / 2, // Horizontal center of viewport
  config.height / 2, // Vertical center of viewport
  "confetti_anim",
);
confettiAnim.setDisplaySize(
  config.width, // Scale to fill entire viewport width
  config.height, // Scale to fill entire viewport height
);
```

### Coordinate System

- **Anchor Point**: Center (0.5, 0.5) - default Phaser sprite origin
- **Coverage**: 100% viewport width AND 100% viewport height
- **Aspect Ratio**: Stretches to fit (non-uniform scaling)

### Viewport Adaptability

The confetti **does NOT respond to runtime browser resizing** in the source implementation. It scales once on instantiation based on current viewport dimensions.

**For PixiJS port**: We need to add responsive logic to handle:

- Initial window size
- Orientation changes (mobile)
- Browser zoom levels

### Z-Index Hierarchy

```javascript
confettiAnim.setDepth(999); // Highest rendering layer
```

**Render Order** (back to front):

1. `Depth < 100`: Game world (road, chicken, gates)
2. `Depth 100-200`: UI containers
3. `Depth 999`: **Confetti layer** ← Always on top
4. `Depth 1000+`: (Available for future overlays)

---

## 5. Audio Integration

### Multi-Track Audio System

Two sounds play in coordinated sequence:

#### Track 1: Confetti Sound Effect

```javascript
confettiSound.play(); // Whoosh/burst sound
```

- **Timing**: Starts at frame 0 (instant)
- **Purpose**: Matches visual burst effect

#### Track 2: Victory Fanfare

```javascript
this.time.delayedCall(100, () => {
  victorySound.play(); // Triumph melody
});
```

- **Timing**: Starts 100ms after confetti begins
- **Purpose**: Emotional payoff / celebration theme

**Psychological Design**: The 100ms delay allows the visual+whoosh to "register," then the triumphant music reinforces the win state.

---

## 6. Performance Characteristics

### GPU Rendering

- **Texture Memory**: ~1MB for 40-frame spritesheet (estimated)
- **Draw Calls**: Single sprite = 1 draw call per frame
- **Transparency**: Alpha blending required (confetti particles fade in/out)

### CPU Impact (Phaser)

- **Frame Interpolation**: Phaser handles frame advancement based on browser RAF timing
- **Event Dispatch**: `animationcomplete` callback queued after final frame

### Optimization Opportunities for PixiJS Port

1. **Texture Atlas**: Consider combining with other VFX into shared atlas
2. **Pre-decode**: Load spritesheet during initial asset loading
3. **Object Pooling**: If confetti could replay, pool the AnimatedSprite instance
4. **Alpha Pre-multiply**: Use pre-multiplied alpha textures if possible

---

## 7. Integration Points (PixiJS Port)

### Assets Required

1. **Spritesheet PNG**: Base64-encoded image with 40 frames
2. **Spritesheet JSON**: Frame metadata (x, y, width, height per frame)
   - OR use uniform frame slicing in PixiJS if frames are evenly spaced
3. **Audio Files**: `confetti.mp3` and `victory.mp3` (Base64 or URLs)

### PixiJS Equivalents

| Phaser Concept        | PixiJS Implementation                |
| --------------------- | ------------------------------------ |
| `this.add.sprite()`   | `new PIXI.AnimatedSprite(frames)`    |
| `this.anims.create()` | Manual frame array generation        |
| `setDepth()`          | `sprite.zIndex = 999`                |
| `setDisplaySize()`    | `sprite.width`, `sprite.height`      |
| `animationcomplete`   | `sprite.onComplete` callback         |
| `destroy()`           | `sprite.destroy({ texture: false })` |

### State Synchronization

The confetti manager must:

- Listen for `gameEvents.emit('gameComplete')` or equivalent
- Access `game.renderer.app.view.width/height` for scaling
- Integrate with existing audio engine (`AudioEngine.js`)

---

## 8. Critical Success Factors

### Must-Have Features

1. ✅ **Exact timing**: 28 FPS, 40 frames, no stutter
2. ✅ **Fullscreen coverage**: Scales to any viewport size
3. ✅ **Z-index supremacy**: Always renders above game world
4. ✅ **Auto-cleanup**: Removes itself after playback
5. ✅ **Audio sync**: Plays confetti SFX + delayed victory theme

### Nice-to-Have Enhancements

- Responsive resizing during playback (tracks window dimensions)
- Particle density options (low/medium/high quality)
- Color palette customization (team colors, seasonal themes)

---

## Conclusion

The confetti animation is a **straightforward spritesheet burst effect** with precise timing (1.43s), fullscreen coverage, and automatic cleanup. The key challenge in porting to PixiJS is:

1. **Asset Loading**: Converting Base64 spritesheet to PixiJS texture format
2. **Frame Management**: Creating `PIXI.AnimatedSprite` with correct frame sequence
3. **Responsive Scaling**: Adding logic the source HTML lacks (viewport tracking)
4. **Event Integration**: Hooking into game win-state via `GameEventBus`

**Next Step**: See `VFX_INTEGRATION_PLAN.md` for architecture design and implementation strategy.
