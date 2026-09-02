# CYBERBALL 3D: Quantum Rally 🏓⚡

> A futuristic, hardware-accelerated 3D tunnel table tennis game inspired by the legendary 2001 classic **Curveball**. Built with **Three.js**, **Vite**, and procedural **Web Audio API**.

![CYBERBALL 3D](https://img.shields.io/badge/Three.js-r170-00ff41?style=for-the-badge&logo=threedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Web Audio](https://img.shields.io/badge/Web_Audio_API-Procedural-ff007f?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## 🎮 Features

### 🌟 3D Perspective Tunnel & Aesthetic Themes
- **Authentic Geometric Tunnel**: Modeled with receding square cross-sections ($[-8, 8] \times [-8, 8] \times [0, 80]$), 4 perspective corner rails, and concentric depth rings.
- **Wall Tick Markers**: Faithful recreation of the white hash markers on the inner sides of each depth ring for precise visual depth gauging.
- **Dynamic 3D Wall Lighting**: The glowing ball casts real-time point-light illumination onto the walls, accompanied by 4 wall projection indicators for instantaneous depth perception.
- **4 Selectable Themes**:
  - **Classic 2001 (Matrix Green)**: Authentic dithered pixel-green textured walls with crisp `NearestFilter` rendering, neon green wireframes, blue reticle paddle, and red opponent paddle.
  - **Cyberpunk Neon**: Deep obsidian walls with glowing cyan grid lines, hot magenta rim lighting, and neon glow.
  - **Tron Wireframe**: Pitch black void with razor-sharp laser cyan wireframes and neon vectors.
  - **Vaporwave Sunset**: Deep purple walls, orange grid lines, and glowing sunset horizon.
- **CRT Scanlines Effect**: Optional retro scanline raster filter with CRT curvature vignette.

### 🌀 Dynamic Magnus Aerodynamic Curve Physics
- **Real-Time Spin Mechanics**: Moving your paddle during contact imparts angular velocity $\vec{\omega} = (\omega_x, \omega_y)$ to the ball. In flight, lateral Magnus acceleration curves the ball in 3D:
  $$\vec{a}_{lateral} = (k \cdot \omega_y, \; k \cdot \omega_x)$$
  Swiping right curves the ball right; swiping up curves the ball upward!
- **Interactive Click-to-Serve**: When serving, the ball rests directly on your paddle, allowing you to aim and launch with spin on click, tap, or Spacebar.
- **Hyper Smash**: Striking the ball near the center at high paddle speed triggers a **HYPER SMASH** with camera shake, speed burst, and sonic boom visual effects.
- **Continuous Collision Detection (CCD)**: Sub-stepped physics simulation ensures balls never clip or tunnel through paddles, even at hypersonic velocities ($150+$ km/h).

### 🤖 10 Progressive AI Tiers
Battle through 10 distinct AI opponents with humanized reaction delay, trajectory prediction, and tactical counter-curves:
1. **Level 1**: `SPARK-01` (Training Drone — forgiving, linear tracking)
2. **Level 2**: `CIRCUIT-B` (Patrol Unit — basic bank shot returns)
3. **Level 3**: `VECTOR-9` (Interceptor — handles mild spin and wall rebounds)
4. **Level 4**: `PULSE-X` (Combat Sentry — aggressive curve shots)
5. **Level 5**: `CYBER-VIPER` (Sector Boss 1 — fast returns, heavy curve attacks)
6. **Level 6**: `CHRONOS` (Time Tactician — calculates sweet spots)
7. **Level 7**: `NEURAL-STORM` (Predictive Core — multi-wall bank shots)
8. **Level 8**: `HYPERION` (Heavy Striker — aggressive pacing)
9. **Level 9**: `VORTEX-ZERO` (Warp Enforcer — instant counter-spin)
10. **Level 10**: `OMEGA-SINGULARITY` (Final Boss — instantaneous reflexes, wicked deception curves)

### 🔊 100% Procedural Web Audio API Synthesizer
Zero external audio files! Everything is synthesized in real-time with zero loading latency:
- **Paddle Impact**: Resonant acoustic ping with metallic body punch and speed-dependent pitch.
- **Wall Bounce**: 3D spatialized thump with stereo panning ($X$) and low-pass depth filtering ($Z$).
- **Doppler Curve Whoosh**: Sweeping bandpass noise reacting to high-spin trajectories.
- **Dynamic Synthwave BGM**: 16-step retro bassline and arpeggiator whose tempo (118 $\to$ 150 BPM) and filter cutoff dynamically accelerate as rallies lengthen!

### 🕹️ Game Modes
- **⚡ Championship Campaign**: 10 progressive boss levels, 3 lives, bonus lives awarded on boss stages.
- **♾️ Endless Survival**: 1 life, continuously escalating speeds, high-score tracking in `localStorage`.
- **🧪 Practice / Curve Lab**: Real-time trajectory prediction ray, slow-motion (0.35x), speed slider.
- **👥 Local 2-Player Hotseat**: Player 1 (Mouse/Touch) vs Player 2 (Keyboard WASD / Arrows).

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- npm (v9 or newer)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/RamonLinares/GemPingPong.git
cd GemPingPong

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:3000` in your browser!

### Production Build

```bash
# Build optimized production assets
npm run build

# Preview production build
npm run preview
```

### Run Test Suite

```bash
node test/physics.test.js
```

---

## 🎯 Controls

| Action | Control |
|---|---|
| **Move Paddle** | Mouse Move / Trackpad / Touch Drag |
| **Serve Ball** | Click / Tap / Spacebar |
| **Impart Curve Spin** | Rapidly swipe paddle during ball impact |
| **Pause Game** | `P` or `Escape` |
| **Mute / Unmute** | `M` or Top-Right Audio Icon |
| **Player 2 (Hotseat Mode)** | Arrow Keys or `W` `A` `S` `D` |

---

## 📂 Project Structure

```
├── index.html                  # Main application HTML shell
├── package.json                # Project dependencies and build scripts
├── vite.config.js              # Vite bundler configuration
├── src/
│   ├── main.js                 # Entry point & subsystem initialization
│   ├── style.css               # Cyberpunk styling, CRT overlay & glassmorphic HUD
│   ├── physics/
│   │   └── PhysicsWorld.js     # 3D tunnel physics, Magnus curve & CCD
│   ├── render/
│   │   └── TunnelScene.js      # Three.js 3D renderer, themes, effects & camera
│   ├── audio/
│   │   └── SoundManager.js     # Procedural Web Audio API sound & music synth
│   ├── ai/
│   │   └── AIAgent.js          # 10-tier progressive AI opponent logic
│   ├── game/
│   │   └── GameEngine.js       # Central game loop, state machine & input handling
│   └── ui/
│       └── UIOverlay.js        # Cyber-HUD, Speedometer, Spin Compass & modals
└── test/
    └── physics.test.js         # Automated physics, curve & AI test suite
```

---

## 📜 License

MIT License &copy; 2026 Ramon Linares
