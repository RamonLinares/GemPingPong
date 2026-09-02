/**
 * UIOverlay: Futuristic Cyber-HUD, Modals, Menus, and Real-time Telemetry
 */
export class UIOverlay {
  constructor(domRoot, callbacks = {}) {
    this.root = domRoot;
    this.cb = callbacks;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.root.innerHTML = `
      <!-- Scanlines overlay (toggleable) -->
      <div id="crt-overlay" class="crt-scanlines"></div>

      <!-- In-Game HUD -->
      <div id="game-hud" class="hud-layer hidden">
        <!-- Top Bar -->
        <div class="hud-top">
          <div class="hud-block score-block">
            <div class="hud-label">SCORE</div>
            <div id="hud-score" class="hud-value neon-glow">0</div>
            <div id="hud-combo" class="hud-subvalue">1x MULTIPLIER</div>
          </div>

          <div class="hud-block center-block">
            <div id="hud-level-badge" class="level-badge">LVL 1: SPARK-01</div>
            <div id="hud-rally-container" class="rally-container">
              <span class="rally-label">RALLY</span>
              <span id="hud-rally-count" class="rally-value">0</span>
            </div>
          </div>

          <div class="hud-block hud-actions">
            <div class="high-score-display">
              <span class="hud-label">HI-SCORE</span>
              <span id="hud-hiscore" class="hi-value">0</span>
            </div>
            <button id="btn-sound-toggle" class="icon-btn" title="Toggle Sound">🔊</button>
            <button id="btn-pause" class="icon-btn" title="Pause Game">⏸</button>
            <button id="btn-settings-open" class="icon-btn" title="Settings">⚙</button>
          </div>
        </div>

        <!-- Dynamic Announcement Banner -->
        <div id="hud-banner" class="banner-text hidden"></div>

        <!-- Center Aim Crosshair Reticle Indicator -->
        <div id="hud-center-dot"></div>

        <!-- Bottom Bar -->
        <div class="hud-bottom">
          <!-- Left: Lives / Balls Left (Inspired by screenshot) -->
          <div class="hud-block lives-block">
            <div class="hud-label">BALLS LEFT: <span id="hud-balls-num">3</span></div>
            <div id="hud-lives-icons" class="lives-icons">
              <span class="life-ball"></span>
              <span class="life-ball"></span>
              <span class="life-ball"></span>
            </div>
          </div>

          <!-- Center: Dynamic Spin Compass -->
          <div class="hud-block spin-block" title="Magnus Curve & Spin Vector">
            <div class="hud-label">SPIN DYNAMICS</div>
            <div class="spin-compass">
              <div class="compass-cross"></div>
              <div id="spin-arrow" class="spin-arrow"></div>
              <div id="spin-dot" class="spin-dot"></div>
            </div>
            <div id="spin-label" class="spin-readout">FLAT</div>
          </div>

          <!-- Right: Speedometer -->
          <div class="hud-block speed-block">
            <div class="hud-label">BALL VELOCITY</div>
            <div class="speedometer">
              <span id="hud-speed-val" class="speed-value">120</span>
              <span class="speed-unit">KM/H</span>
            </div>
            <div class="speed-bar-bg">
              <div id="hud-speed-bar" class="speed-bar-fill"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Practice Lab Toolbar (Float) -->
      <div id="practice-toolbar" class="practice-toolbar hidden">
        <div class="practice-header">🧪 CURVE LAB</div>
        <div class="practice-item">
          <label><input type="checkbox" id="chk-trajectory" checked> Trajectory Ray</label>
        </div>
        <div class="practice-item">
          <label><input type="checkbox" id="chk-slowmo"> Slow-Mo (0.35x)</label>
        </div>
        <div class="practice-item">
          <span>Speed:</span>
          <input type="range" id="rng-practice-speed" min="20" max="70" value="34">
          <span id="txt-practice-speed">34</span>
        </div>
        <button id="btn-practice-serve" class="cyber-btn-small">Serve Ball</button>
      </div>

      <!-- Main Menu Screen -->
      <div id="menu-screen" class="modal-screen">
        <div class="title-container">
          <div class="title-glitch" data-text="CYBERBALL 3D">CYBERBALL 3D</div>
          <div class="subtitle">QUANTUM TUNNEL RALLY</div>
        </div>

        <div class="menu-tagline">
          Inspired by the iconic 3D tunnel table tennis classic. Impart spin, bend physics, and defeat the cyber AI.
        </div>

        <div class="menu-actions">
          <button id="btn-mode-campaign" class="cyber-btn primary-glow">
            <span class="btn-icon">⚡</span>
            <div class="btn-text">
              <strong>CHAMPIONSHIP CAMPAIGN</strong>
              <small>10 progressive AI bosses with increasing speed</small>
            </div>
          </button>

          <button id="btn-mode-endless" class="cyber-btn">
            <span class="btn-icon">♾️</span>
            <div class="btn-text">
              <strong>ENDLESS SURVIVAL</strong>
              <small>1 Life. Escalating speed. Maximize high score</small>
            </div>
          </button>

          <button id="btn-mode-practice" class="cyber-btn">
            <span class="btn-icon">🧪</span>
            <div class="btn-text">
              <strong>PRACTICE / CURVE LAB</strong>
              <small>Master curve shots with visual trajectory rays</small>
            </div>
          </button>

          <button id="btn-mode-2p" class="cyber-btn">
            <span class="btn-icon">👥</span>
            <div class="btn-text">
              <strong>2-PLAYER HOTSEAT</strong>
              <small>Player 1 (Mouse) vs Player 2 (Keyboard WASD / Arrows)</small>
            </div>
          </button>
        </div>

        <div class="menu-footer">
          <button id="btn-menu-settings" class="cyber-btn-text">⚙ Settings & Themes</button>
          <div class="control-hints">
            🖱 Move Mouse / Drag Touch to Move &middot; Rapid swing imparts <strong>CURVE SPIN</strong>
          </div>
        </div>
      </div>

      <!-- Pause Modal -->
      <div id="pause-screen" class="modal-screen hidden">
        <div class="modal-card">
          <h2 class="modal-title">GAME PAUSED</h2>
          <div class="modal-actions">
            <button id="btn-pause-resume" class="cyber-btn primary-glow">RESUME</button>
            <button id="btn-pause-restart" class="cyber-btn">RESTART ROUND</button>
            <button id="btn-pause-settings" class="cyber-btn">SETTINGS</button>
            <button id="btn-pause-quit" class="cyber-btn danger-glow">MAIN MENU</button>
          </div>
        </div>
      </div>

      <!-- Level Cleared Modal -->
      <div id="level-screen" class="modal-screen hidden">
        <div class="modal-card">
          <div class="modal-badge-success">LEVEL DEFEATED</div>
          <h2 id="lvl-clear-title" class="modal-title">SPARK-01 OVERRIDDEN</h2>
          
          <div class="stats-grid">
            <div class="stat-cell">
              <span class="stat-name">Round Score</span>
              <span id="lvl-stat-score" class="stat-number">2,450</span>
            </div>
            <div class="stat-cell">
              <span class="stat-name">Max Rally</span>
              <span id="lvl-stat-rally" class="stat-number">18</span>
            </div>
            <div class="stat-cell">
              <span class="stat-name">Top Speed</span>
              <span id="lvl-stat-speed" class="stat-number">148 KM/H</span>
            </div>
            <div class="stat-cell">
              <span class="stat-name">Curve Bonus</span>
              <span id="lvl-stat-curves" class="stat-number">+600</span>
            </div>
          </div>

          <button id="btn-level-next" class="cyber-btn primary-glow full-width">NEXT OPPONENT ➔</button>
        </div>
      </div>

      <!-- Game Over Modal -->
      <div id="gameover-screen" class="modal-screen hidden">
        <div class="modal-card">
          <div id="gameover-badge" class="modal-badge-danger">SYSTEM DISCONNECTED</div>
          <h2 id="gameover-title" class="modal-title">GAME OVER</h2>

          <div id="new-hiscore-banner" class="new-record hidden">★ NEW PERSONAL RECORD ★</div>

          <div class="stats-grid">
            <div class="stat-cell highlight">
              <span class="stat-name">Final Score</span>
              <span id="go-stat-score" class="stat-number">0</span>
            </div>
            <div class="stat-cell">
              <span class="stat-name">High Score</span>
              <span id="go-stat-hiscore" class="stat-number">0</span>
            </div>
            <div class="stat-cell">
              <span class="stat-name">Longest Rally</span>
              <span id="go-stat-rally" class="stat-number">0</span>
            </div>
            <div class="stat-cell">
              <span class="stat-name">Fastest Velocity</span>
              <span id="go-stat-speed" class="stat-number">0 KM/H</span>
            </div>
          </div>

          <div class="modal-actions">
            <button id="btn-gameover-replay" class="cyber-btn primary-glow">PLAY AGAIN</button>
            <button id="btn-gameover-menu" class="cyber-btn">MAIN MENU</button>
          </div>
        </div>
      </div>

      <!-- Settings & Themes Modal -->
      <div id="settings-screen" class="modal-screen hidden">
        <div class="modal-card wide">
          <div class="settings-header">
            <h2 class="modal-title">SYSTEM SETTINGS</h2>
            <button id="btn-settings-close" class="close-x">✕</button>
          </div>

          <div class="settings-body">
            <!-- Theme Selection -->
            <div class="settings-group">
              <label class="setting-title">Aesthetic Arena Theme</label>
              <div class="theme-picker">
                <button class="theme-btn active" data-theme="classic">
                  <span class="theme-preview classic-preview"></span>
                  Classic 2001 (Matrix Green)
                </button>
                <button class="theme-btn" data-theme="cyberpunk">
                  <span class="theme-preview cyber-preview"></span>
                  Cyberpunk Neon
                </button>
                <button class="theme-btn" data-theme="tron">
                  <span class="theme-preview tron-preview"></span>
                  Tron Wireframe
                </button>
                <button class="theme-btn" data-theme="synthwave">
                  <span class="theme-preview synth-preview"></span>
                  Vaporwave Sunset
                </button>
              </div>
            </div>

            <!-- Visual Options -->
            <div class="settings-group">
              <label class="setting-title">Display & Graphics</label>
              <div class="setting-row">
                <span>CRT Scanlines Filter:</span>
                <input type="checkbox" id="chk-scanlines" checked>
              </div>
            </div>

            <!-- Controls -->
            <div class="settings-group">
              <label class="setting-title">Controls & Sensitivity</label>
              <div class="setting-row">
                <span>Pointer Lock (FPS-style mouse capture):</span>
                <input type="checkbox" id="chk-pointerlock">
              </div>
              <div class="setting-row">
                <span>Mouse Sensitivity:</span>
                <input type="range" id="rng-sensitivity" min="0.5" max="2.5" step="0.1" value="1.0">
                <span id="txt-sensitivity">1.0x</span>
              </div>
            </div>

            <!-- Audio -->
            <div class="settings-group">
              <label class="setting-title">Audio Synthesizer</label>
              <div class="setting-row">
                <span>Sound Effects Volume:</span>
                <input type="range" id="rng-sfx-vol" min="0" max="1" step="0.05" value="0.7">
              </div>
              <div class="setting-row">
                <span>Synthwave BGM Volume:</span>
                <input type="range" id="rng-music-vol" min="0" max="1" step="0.05" value="0.4">
              </div>
            </div>
          </div>

          <button id="btn-settings-save" class="cyber-btn primary-glow full-width">SAVE & CLOSE</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Top HUD buttons
    const btnSound = this.root.querySelector('#btn-sound-toggle');
    btnSound.addEventListener('click', () => {
      const isMuted = this.cb.onToggleSound ? this.cb.onToggleSound() : false;
      btnSound.textContent = isMuted ? '🔇' : '🔊';
    });

    this.root.querySelector('#btn-pause').addEventListener('click', () => {
      if (this.cb.onPause) this.cb.onPause();
    });

    this.root.querySelector('#btn-settings-open').addEventListener('click', () => {
      this.showSettings(true);
    });

    // Menu screen buttons
    this.root.querySelector('#btn-mode-campaign').addEventListener('click', () => {
      if (this.cb.onStartGame) this.cb.onStartGame('campaign');
    });
    this.root.querySelector('#btn-mode-endless').addEventListener('click', () => {
      if (this.cb.onStartGame) this.cb.onStartGame('endless');
    });
    this.root.querySelector('#btn-mode-practice').addEventListener('click', () => {
      if (this.cb.onStartGame) this.cb.onStartGame('practice');
    });
    this.root.querySelector('#btn-mode-2p').addEventListener('click', () => {
      if (this.cb.onStartGame) this.cb.onStartGame('hotseat_2p');
    });
    this.root.querySelector('#btn-menu-settings').addEventListener('click', () => {
      this.showSettings(true);
    });

    // Pause Screen
    this.root.querySelector('#btn-pause-resume').addEventListener('click', () => {
      if (this.cb.onResume) this.cb.onResume();
    });
    this.root.querySelector('#btn-pause-restart').addEventListener('click', () => {
      if (this.cb.onRestartRound) this.cb.onRestartRound();
    });
    this.root.querySelector('#btn-pause-settings').addEventListener('click', () => {
      this.showSettings(true);
    });
    this.root.querySelector('#btn-pause-quit').addEventListener('click', () => {
      if (this.cb.onQuitToMenu) this.cb.onQuitToMenu();
    });

    // Level Cleared
    this.root.querySelector('#btn-level-next').addEventListener('click', () => {
      if (this.cb.onNextLevel) this.cb.onNextLevel();
    });

    // Game Over
    this.root.querySelector('#btn-gameover-replay').addEventListener('click', () => {
      if (this.cb.onReplay) this.cb.onReplay();
    });
    this.root.querySelector('#btn-gameover-menu').addEventListener('click', () => {
      if (this.cb.onQuitToMenu) this.cb.onQuitToMenu();
    });

    // Settings Modal
    this.root.querySelector('#btn-settings-close').addEventListener('click', () => {
      this.showSettings(false);
    });
    this.root.querySelector('#btn-settings-save').addEventListener('click', () => {
      this.showSettings(false);
    });

    // Theme buttons
    const themeBtns = this.root.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.theme;
        if (this.cb.onSelectTheme) this.cb.onSelectTheme(theme);
      });
    });

    // Scanlines toggle
    const chkScanlines = this.root.querySelector('#chk-scanlines');
    const crtOverlay = this.root.querySelector('#crt-overlay');
    chkScanlines.addEventListener('change', (e) => {
      crtOverlay.style.display = e.target.checked ? 'block' : 'none';
      localStorage.setItem('cyberball_scanlines', e.target.checked);
    });
    if (localStorage.getItem('cyberball_scanlines') === 'false') {
      chkScanlines.checked = false;
      crtOverlay.style.display = 'none';
    }

    // Pointer lock toggle
    const chkPointerLock = this.root.querySelector('#chk-pointerlock');
    chkPointerLock.addEventListener('change', (e) => {
      if (this.cb.onTogglePointerLock) this.cb.onTogglePointerLock(e.target.checked);
    });

    // Sensitivity slider
    const rngSens = this.root.querySelector('#rng-sensitivity');
    const txtSens = this.root.querySelector('#txt-sensitivity');
    rngSens.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      txtSens.textContent = `${val.toFixed(1)}x`;
      if (this.cb.onChangeSensitivity) this.cb.onChangeSensitivity(val);
    });

    // Audio sliders
    const rngSfx = this.root.querySelector('#rng-sfx-vol');
    rngSfx.addEventListener('input', (e) => {
      if (this.cb.onChangeSfxVol) this.cb.onChangeSfxVol(parseFloat(e.target.value));
    });
    const rngMusic = this.root.querySelector('#rng-music-vol');
    rngMusic.addEventListener('input', (e) => {
      if (this.cb.onChangeMusicVol) this.cb.onChangeMusicVol(parseFloat(e.target.value));
    });

    // Practice controls
    const chkTraj = this.root.querySelector('#chk-trajectory');
    chkTraj.addEventListener('change', (e) => {
      if (this.cb.onToggleTrajectory) this.cb.onToggleTrajectory(e.target.checked);
    });
    const chkSlow = this.root.querySelector('#chk-slowmo');
    chkSlow.addEventListener('change', (e) => {
      if (this.cb.onToggleSlowMo) this.cb.onToggleSlowMo(e.target.checked);
    });
    const rngPracSpeed = this.root.querySelector('#rng-practice-speed');
    const txtPracSpeed = this.root.querySelector('#txt-practice-speed');
    rngPracSpeed.addEventListener('input', (e) => {
      txtPracSpeed.textContent = e.target.value;
      if (this.cb.onChangePracticeSpeed) this.cb.onChangePracticeSpeed(parseFloat(e.target.value));
    });
    this.root.querySelector('#btn-practice-serve').addEventListener('click', () => {
      if (this.cb.onPracticeServe) this.cb.onPracticeServe();
    });
  }

  showScreen(screenName) {
    const screens = ['menu-screen', 'game-hud', 'pause-screen', 'level-screen', 'gameover-screen', 'practice-toolbar'];
    screens.forEach(id => {
      const el = this.root.querySelector(`#${id}`);
      if (el) el.classList.add('hidden');
    });

    if (screenName === 'menu') {
      this.root.querySelector('#menu-screen').classList.remove('hidden');
    } else if (screenName === 'playing') {
      this.root.querySelector('#game-hud').classList.remove('hidden');
    } else if (screenName === 'pause') {
      this.root.querySelector('#game-hud').classList.remove('hidden');
      this.root.querySelector('#pause-screen').classList.remove('hidden');
    } else if (screenName === 'level_clear') {
      this.root.querySelector('#level-screen').classList.remove('hidden');
    } else if (screenName === 'game_over') {
      this.root.querySelector('#gameover-screen').classList.remove('hidden');
    }

    if (screenName === 'practice') {
      this.root.querySelector('#game-hud').classList.remove('hidden');
      this.root.querySelector('#practice-toolbar').classList.remove('hidden');
    }
  }

  showSettings(show) {
    const el = this.root.querySelector('#settings-screen');
    if (show) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  showBanner(text, type = 'info', durationMs = 1500) {
    const el = this.root.querySelector('#hud-banner');
    el.textContent = text;
    el.className = `banner-text ${type}-banner animate-banner`;
    el.classList.remove('hidden');

    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      el.classList.add('hidden');
    }, durationMs);
  }

  updateHUD(state) {
    // Score & Multiplier
    const hudScore = this.root.querySelector('#hud-score');
    hudScore.textContent = state.score.toLocaleString();

    const hudCombo = this.root.querySelector('#hud-combo');
    if (state.combo > 1) {
      hudCombo.textContent = `${state.combo}x COMBO MULTIPLIER`;
      hudCombo.classList.add('highlight-combo');
    } else {
      hudCombo.textContent = `1x MULTIPLIER`;
      hudCombo.classList.remove('highlight-combo');
    }

    // Hi-Score
    this.root.querySelector('#hud-hiscore').textContent = state.highScore.toLocaleString();

    // Level Badge
    const badge = this.root.querySelector('#hud-level-badge');
    badge.textContent = state.levelBadge;

    // Rally Counter
    const rallyEl = this.root.querySelector('#hud-rally-count');
    rallyEl.textContent = state.rally;
    if (state.rally >= 10) {
      rallyEl.classList.add('rally-high');
    } else {
      rallyEl.classList.remove('rally-high');
    }

    // Balls Left
    const ballsNum = this.root.querySelector('#hud-balls-num');
    ballsNum.textContent = state.ballsLeft;

    const livesIcons = this.root.querySelector('#hud-lives-icons');
    let iconsHtml = '';
    for (let i = 0; i < Math.max(0, state.ballsLeft); i++) {
      iconsHtml += '<span class="life-ball"></span>';
    }
    livesIcons.innerHTML = iconsHtml;

    // Speedometer
    const kmh = Math.round(state.speedKmh);
    this.root.querySelector('#hud-speed-val').textContent = kmh;
    const speedRatio = Math.min(1.0, (kmh - 80) / 180);
    this.root.querySelector('#hud-speed-bar').style.width = `${Math.max(5, speedRatio * 100)}%`;

    // Spin Dynamics Compass
    const spinArrow = this.root.querySelector('#spin-arrow');
    const spinDot = this.root.querySelector('#spin-dot');
    const spinLabel = this.root.querySelector('#spin-label');

    const sx = state.spinX || 0; // vertical spin
    const sy = state.spinY || 0; // horizontal spin
    const spinMagnitude = Math.hypot(sx, sy);

    if (spinMagnitude > 0.05) {
      const angleRad = Math.atan2(sx, sy);
      const angleDeg = angleRad * (180 / Math.PI);
      spinArrow.style.transform = `rotate(${angleDeg}deg) scale(${Math.min(1.8, 0.4 + spinMagnitude * 0.4)})`;
      spinArrow.style.opacity = Math.min(1.0, spinMagnitude * 0.8);
      
      const maxOffset = 18;
      const dotX = Math.max(-maxOffset, Math.min(maxOffset, sy * 4));
      const dotY = Math.max(-maxOffset, Math.min(maxOffset, -sx * 4));
      spinDot.style.transform = `translate(${dotX}px, ${dotY}px)`;

      if (Math.abs(sy) > Math.abs(sx)) {
        spinLabel.textContent = sy > 0 ? 'CURVE RIGHT ➔' : '⬅ CURVE LEFT';
      } else {
        spinLabel.textContent = sx > 0 ? 'TOPSPIN ⬆' : 'BACKSPIN ⬇';
      }
      spinLabel.classList.add('spin-active');
    } else {
      spinArrow.style.opacity = 0;
      spinDot.style.transform = 'translate(0px, 0px)';
      spinLabel.textContent = 'FLAT TRAJECTORY';
      spinLabel.classList.remove('spin-active');
    }
  }

  showLevelClearModal(stats) {
    this.root.querySelector('#lvl-clear-title').textContent = `${stats.bossName} OVERRIDDEN`;
    this.root.querySelector('#lvl-stat-score').textContent = stats.score.toLocaleString();
    this.root.querySelector('#lvl-stat-rally').textContent = stats.maxRally;
    this.root.querySelector('#lvl-stat-speed').textContent = `${Math.round(stats.maxSpeedKmh)} KM/H`;
    this.root.querySelector('#lvl-stat-curves').textContent = `+${stats.curveBonus}`;
    this.showScreen('level_clear');
  }

  showGameOverModal(stats) {
    this.root.querySelector('#go-stat-score').textContent = stats.score.toLocaleString();
    this.root.querySelector('#go-stat-hiscore').textContent = stats.highScore.toLocaleString();
    this.root.querySelector('#go-stat-rally').textContent = stats.maxRally;
    this.root.querySelector('#go-stat-speed').textContent = `${Math.round(stats.maxSpeedKmh)} KM/H`;

    const newRec = this.root.querySelector('#new-hiscore-banner');
    if (stats.isNewRecord) {
      newRec.classList.remove('hidden');
    } else {
      newRec.classList.add('hidden');
    }

    this.showScreen('game_over');
  }
}
