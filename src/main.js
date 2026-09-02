import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { TunnelScene } from './render/TunnelScene.js';
import { SoundManager } from './audio/SoundManager.js';
import { AIAgent } from './ai/AIAgent.js';
import { UIOverlay } from './ui/UIOverlay.js';
import { GameEngine } from './game/GameEngine.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  const uiRoot = document.getElementById('ui-root');

  // 1. Initialize Subsystems
  const physics = new PhysicsWorld({
    tunnelWidth: 16,
    tunnelHeight: 16,
    tunnelDepth: 80
  });

  const scene = new TunnelScene(canvasContainer, physics);
  const sound = new SoundManager();
  const ai = new AIAgent(physics);

  // 2. Setup UI Callbacks
  let engine = null;

  const ui = new UIOverlay(uiRoot, {
    onStartGame: (mode) => {
      engine.startGame(mode);
    },
    onToggleSound: () => {
      const newMuted = !sound.muted;
      sound.setMuted(newMuted);
      return newMuted;
    },
    onPause: () => {
      engine.togglePause();
    },
    onResume: () => {
      engine.resumeGame();
    },
    onRestartRound: () => {
      engine.restartRound();
    },
    onQuitToMenu: () => {
      engine.quitToMenu();
    },
    onNextLevel: () => {
      engine.nextLevel();
    },
    onReplay: () => {
      engine.startGame(engine.gameMode);
    },
    onSelectTheme: (themeId) => {
      scene.applyTheme(themeId);
    },
    onTogglePointerLock: (enabled) => {
      engine.usePointerLock = enabled;
      if (!enabled && document.pointerLockElement) {
        document.exitPointerLock();
      }
    },
    onChangeSensitivity: (sens) => {
      engine.mouseSensitivity = sens;
      localStorage.setItem('cyberball_sensitivity', sens);
    },
    onChangeSfxVol: (vol) => {
      sound.setSfxVolume(vol);
    },
    onChangeMusicVol: (vol) => {
      sound.setMusicVolume(vol);
    },
    onToggleTrajectory: (enabled) => {
      engine.practiceTrajectory = enabled;
    },
    onToggleSlowMo: (enabled) => {
      engine.timeScale = enabled ? 0.35 : 1.0;
    },
    onChangePracticeSpeed: (spd) => {
      engine.practiceSpeed = spd;
    },
    onPracticeServe: () => {
      engine.prepareServe(false);
    }
  });

  // 3. Setup Game Engine & Start Loop
  engine = new GameEngine(physics, scene, sound, ai, ui);
  engine.startLoop();

  // Expose to window for debugging or testing
  window.__CYBERBALL__ = { engine, physics, scene, sound, ai, ui };
});
