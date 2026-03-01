# 🐔 Chicken Road Game

**Mission Statement**: High-performance, zero-dependency, single-file PixiJS game delivering hardware-accelerated 60 FPS gameplay in a standalone HTML artifact.

---

## 🎯 Core Value Proposition

This is a **single-file web application** that combines React 18, PixiJS v8, and Spine animation into one portable `index.html`. All assets (textures, audio, fonts) are Base64-inlined at build time. No external requests. No CDN dependencies. Just one file.

**The One-File Guarantee**: Running `yarn build` produces `dist/index.html` containing:
- React runtime
- PixiJS WebGL engine
- Spine animation system
- All game logic
- All textures (PNG → Base64)
- All audio (WebM/MP3 → Base64)
- All fonts (TTF → Base64)

**Build Output**: ~6.3 MB raw HTML (~3.34 MB gzipped)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for Vite 7)
- Modern browser with WebGL 2.0 support

### Development
```bash
# Install dependencies
yarn install

# Start dev server (http://localhost:5173)
yarn dev

# Build single-file production artifact
yarn build

# Preview production build
yarn preview
```

### Production Deployment
```bash
# After building, deploy dist/index.html to any static host
yarn build

# The output is a single file - no server configuration needed
# Works on: GitHub Pages, Netlify, S3, local filesystem
```

---

## 🏗️ Tech Stack

### Core Technologies
- **React 19.2.0**: UI state management and component lifecycle
- **PixiJS 8.16.0**: WebGL 2.0 rendering engine (selective imports for tree-shaking)
- **Spine 4.2.102**: Skeletal animation system (`@esotericsoftware/spine-pixi-v8`)
- **Vite 7.3.1**: Build system with single-file output via `vite-plugin-singlefile`

### Build Pipeline Architecture
```
ESM Imports (JS/PNG/TTF/MP3)
       ↓
Vite Bundler (Rollup)
       ↓
Base64 Inliner (vite-plugin-singlefile)
       ↓
Single index.html (all assets embedded)
```

**Key Vite Configuration**:
- `assetsInlineLimit: 100000000` (100MB) - Forces all assets to inline as Base64
- `inlineDynamicImports: true` - Disables code splitting
- `cssCodeSplit: false` - Single CSS block

---

## 🎮 Game Features

### Gameplay Mechanics
- **Lane-Grid Movement**: Discrete 30-lane system with deterministic positioning
- **Multiplier Progression**: Dynamic coin values increase exponentially (1.01x → 23.24x)
- **Collision Detection**: Pixel-perfect AABB checks in world space
- **Difficulty Modes**: Easy/Medium/Hard with adaptive car spawn rates and speeds
- **Persistent State**: localStorage for settings and bet history

### Technical Features
- **60 FPS Rendering**: Hardware-accelerated PixiJS ticker
- **Object Pooling**: Efficient car/coin reuse (pool size: 30 cars)
- **Vertical-Anchor Camera**: Viewport scales on height only, locks chicken at 55% vertical
- **Atomic Updates**: Single-frame camera/viewport recalculation on resize
- **Spine Animations**: 8-track skeletal system (idle, jump, death, win, finish)

### Audio System
- **Spatial Audio**: Web Audio API with Base64-inlined buffers
- **Formats**: WebM (Opus 48kbps mono) + MP3 fallback
- **Tracks**: Background music, jump SFX, coin collect, car horn, win/loss jingles

---

## 📁 Project Structure

```
chicken-road-game/
├── src/
│   ├── App.jsx                    # React root - game state orchestration
│   ├── main.jsx                   # Entry point
│   │
│   ├── game/                      # Pure PixiJS engine (React-agnostic)
│   │   ├── core/
│   │   │   ├── Game.js           # Main orchestrator (state machine)
│   │   │   ├── PixiRenderer.js   # WebGL abstraction layer
│   │   │   └── GameEventBus.js   # Pub/sub for decoupled events
│   │   │
│   │   ├── entities/              # BaseEntity subclasses
│   │   │   ├── BaseEntity.js     # Abstract class (x, y, active)
│   │   │   ├── Chicken.js        # Player entity (Spine animation)
│   │   │   ├── Car.js            # Obstacle entity (pooled)
│   │   │   ├── Coin.js           # Collectible entity
│   │   │   ├── Gate.js           # Finish-line trigger
│   │   │   ├── Road.js           # Static road renderer
│   │   │   └── Scenery.js        # Start/finish images
│   │   │
│   │   ├── managers/
│   │   │   ├── EntityManager.js  # Entity lifecycle coordinator
│   │   │   ├── CoinManager.js    # Lane-coin mapping + multiplier calc
│   │   │   └── GateManager.js    # Finish gate spawning
│   │   │
│   │   └── systems/
│   │       ├── CarSpawner.js     # Vertical traffic generator + collision
│   │       └── InputSystem.js    # Keyboard/mouse handling
│   │
│   ├── services/                  # Singleton services
│   │   ├── AudioEngine.js        # Web Audio API manager
│   │   ├── SettingsManager.js    # localStorage persistence
│   │   ├── BetHistoryManager.js  # Bet tracking (max 100 entries)
│   │   └── LiveWinService.js     # Simulated live win ticker
│   │
│   ├── hooks/
│   │   ├── useGame.js            # Main game initialization hook
│   │   ├── useResponsiveCanvas.js# Viewport resize observer
│   │   └── useOutsideClick.js    # Modal click detection
│   │
│   ├── components/                # React UI components
│   │   ├── GameArea/             # Canvas container
│   │   ├── ControlPanel/         # Bet controls + balance
│   │   ├── header/               # Modals (rules, settings, history)
│   │   ├── AnimatedChicken/      # Loading screen animation
│   │   └── LiveWinsTicker/       # Scrolling win notifications
│   │
│   ├── config/
│   │   └── gameConfig.js         # Central configuration (lane width, speeds)
│   │
│   ├── constants/
│   │   └── gameConstants.js      # Magic numbers and enums
│   │
│   └── assets/                    # All inlined at build time
│       ├── *.png                 # Textures (start, finish, cars, coins)
│       ├── chicken.json/.atlas   # Spine skeleton data
│       ├── audios/*.mp3/*.webm   # Sound effects
│       └── fonts/*.ttf           # Montserrat (4 weights)
│
├── dist/
│   └── index.html                # 6.3MB standalone artifact
│
├── vite.config.js                # Build configuration
├── package.json
└── README.md (this file)
```

---

## 🎨 Architecture Overview

### State-Bridge Pattern
React manages **financial state** (balance, bet, gameState), while PixiJS manages **world state** (entity positions, physics, rendering). Communication occurs via:
1. **React → PixiJS**: Props and callbacks (`registerCollisionCallback`, `updateDifficulty`)
2. **PixiJS → React**: Callbacks (`onCollision`, `onFinish`, `onCoinCollect`)
3. **Event Bus**: Decoupled events (`lane:changed`, `coin:collected`)

### Rendering Pipeline
```
React Component Tree (UI Layer)
       ↓
Canvas DOM Element
       ↓
PixiJS Application (WebGL Context)
       ↓
World Container (scrollable) + UI Layer (fixed)
       ↓
EntityManager → BaseEntity instances
       ↓
60 FPS Ticker → update() → render()
```

### Camera System (Vertical-Anchor)
- **Scale Calculation**: `(viewportHeight / 1080) * 1.5` (height-only scaling)
- **Vertical Lock**: `worldContainer.y = (viewportHeight * 0.75) - (chicken.y * scale)`
- **Horizontal Scroll**: World container X offset controlled by lane index
- **Finish-Line Clamp**: `Math.max(worldX, -(canvasWidth - viewportWidth))`

---

## 🔧 Development Guide

### Adding a New Car Type
```javascript
// 1. Add texture import in src/hooks/useGame.js
import newCarImg from "../assets/new-car.png";

// 2. Load texture in useGame hook
textures = await game.renderer.loadTextures([
  { key: "new-car", url: newCarImg },
]);

// 3. Register in CarSpawner.carTypes (src/game/systems/CarSpawner.js)
this.carTypes = [
  { type: "new-car", imageKey: "new-car", scale: 0.5, weight: 2 },
];
```

### Modifying Jump Speed
```javascript
// src/game/entities/Chicken.js → jumpTo() method
const JUMP_DURATION = 400; // milliseconds (change this)
```

### Adding a Sound Trigger
```javascript
// 1. Import audio in src/services/AudioEngine.js
import newSoundMp3 from "../assets/audios/new-sound.mp3";

// 2. Add to AUDIO_SOURCES
static AUDIO_SOURCES = {
  newSound: { mp3: newSoundMp3 },
};

// 3. Create play method
playNewSound() {
  this.playSound("newSound", 0.5); // 50% volume
}
```

---

## 🎯 Performance Characteristics

### Benchmarks (on M1 MacBook Pro)
- **Rendering**: 60 FPS with 30 active cars + 30 coins
- **Memory**: ~120 MB heap (stable with object pooling)
- **Load Time**: <2s (Base64 parsing dominates)
- **Build Time**: ~8s (Vite + Base64 encoding)

### Optimization Strategies
1. **Asset Compression**: Mono audio (64kbps), font subsetting (4 weights only)
2. **Tree-Shaking**: Selective PixiJS imports (`import { Container, Sprite }`)
3. **Object Pooling**: Cars/coins reused, not destroyed
4. **Viewport Culling**: Offscreen entities deactivated (not removed)
5. **Batch Rendering**: EntityManager processes adds/removes in batches

---

## 📊 Build Size Breakdown

| Asset Category | Raw Size | Base64 Overhead | Final Size |
|----------------|----------|-----------------|------------|
| JavaScript     | ~800 KB  | N/A             | ~800 KB    |
| Textures (PNG) | ~2.1 MB  | +33%            | ~2.8 MB    |
| Audio (WebM)   | ~1.2 MB  | +33%            | ~1.6 MB    |
| Fonts (TTF)    | ~800 KB  | +33%            | ~1.1 MB    |
| **Total**      | **~4.9 MB** | **+33%**     | **~6.3 MB** |

**Gzipped**: 3.34 MB (server compression reduces by ~50%)

---

## 🧪 Testing

### Manual Test Checklist
- [ ] Game loads and renders within 3 seconds
- [ ] Chicken jumps smoothly (400ms animation)
- [ ] Cars spawn and move without flickering
- [ ] Collision detection triggers death animation
- [ ] Win notification appears on cashout
- [ ] Viewport resizing updates camera atomically
- [ ] Audio plays without distortion (both formats)
- [ ] localStorage persists settings/history across sessions

### Browser Compatibility
- ✅ Chrome 90+ (WebGL 2.0 + Web Audio API)
- ✅ Firefox 88+ (WebGL 2.0 + Web Audio API)
- ✅ Safari 15+ (WebGL 2.0 + Web Audio API)
- ✅ Edge 90+ (Chromium-based)
- ❌ IE11 (no WebGL 2.0 / ES6 modules)

---

## 📚 Documentation

- **TECHNICAL_GUIDE.md**: Deep-dive architectural specification (AI-agent-ready)
- **OPTIMIZATION_REPORT.md**: Asset reduction strategies and benchmarks

---

## 🤝 Contributing

### Code Style
- **Pure Functions**: Coordinate calculations decoupled from PixiJS objects
- **Atomic Updates**: Viewport/camera changes in single frame
- **Asset Inlining**: All new assets must be ESM imports (for Base64 encoding)
- **No External Dependencies**: Keep build as standalone artifact

### Pull Request Requirements
1. All assets must be inlined (no external URLs)
2. No runtime dependencies (React/PixiJS/Spine only)
3. Build output must remain single file
4. No performance regression (maintain 60 FPS)

---

## 📜 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **PixiJS Team**: For the WebGL abstraction layer
- **Esoteric Software**: For Spine animation runtime
- **Vite Team**: For the blazingly fast build system
- **ChatGPT/Claude**: For architectural consultation

---

**Built with precision. Optimized for portability. Engineered for performance.**
