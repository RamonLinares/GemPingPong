/**
 * GameEngine: Central Game Loop, State Machine, Input Orchestration & Scoring
 */
export class GameEngine {
  constructor(physics, scene, sound, ai, ui) {
    this.physics = physics;
    this.scene = scene;
    this.sound = sound;
    this.ai = ai;
    this.ui = ui;

    // Game states
    this.state = 'MENU'; // 'MENU' | 'SERVE_DELAY' | 'PLAYING' | 'POINT_SCORED' | 'LEVEL_CLEARED' | 'GAME_OVER' | 'PAUSED'
    this.gameMode = 'campaign'; // 'campaign' | 'endless' | 'practice' | 'hotseat_2p'

    // Scoring & progression
    this.score = 0;
    this.combo = 1;
    this.rally = 0;
    this.maxRally = 0;
    this.ballsLeft = 3;
    this.maxBalls = 3;
    this.level = 1;
    this.playerPointsInRound = 0;
    this.opponentPointsInRound = 0;
    this.pointsToWinRound = 5;

    // Stats tracking
    this.maxSpeedKmh = 0;
    this.curveShotCount = 0;
    this.wallBounceCount = 0;
    this.highScore = parseInt(localStorage.getItem('cyberball_hiscore') || '0', 10);

    // Controls & Settings
    this.mouseSensitivity = parseFloat(localStorage.getItem('cyberball_sensitivity') || '1.0');
    this.usePointerLock = false;
    this.timeScale = 1.0;
    this.practiceTrajectory = true;
    this.practiceSpeed = 34;

    // 2-Player Keyboard state
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      KeyW: false,
      KeyS: false,
      KeyA: false,
      KeyD: false
    };

    // Target paddle coordinates
    this.targetPlayerX = 0;
    this.targetPlayerY = 0;
    this.p2X = 0;
    this.p2Y = 0;

    // Timing
    this.lastTime = 0;
    this.stateTimer = 0;
    this.nextServer = 'opponent'; // 'player' | 'opponent'

    this.bindCallbacks();
    this.bindInputs();
  }

  bindCallbacks() {
    // Physics callbacks
    this.physics.onPaddleHit = (isPlayer, isPowerSmash, speedRatio, hitPos) => {
      this.sound.playPaddleHit(isPlayer, isPowerSmash, speedRatio);
      this.scene.triggerSparks(hitPos, isPowerSmash ? 35 : 18, isPlayer);

      if (isPowerSmash) {
        this.scene.triggerScreenShake(0.45);
        this.ui.showBanner('⚡ POWER SMASH! ⚡', 'power', 1200);
      }

      this.rally++;
      this.maxRally = Math.max(this.maxRally, this.rally);
      this.sound.updateBGMRally(this.rally);

      // Spin detection banner
      const spinMag = Math.hypot(this.physics.ball.spinX, this.physics.ball.spinY);
      if (spinMag > 1.8) {
        this.curveShotCount++;
        this.sound.playCurveWhoosh(spinMag);
        if (!isPowerSmash && Math.random() < 0.6) {
          this.ui.showBanner('🌀 WICKED CURVE!', 'curve', 1000);
        }
      }

      // Rally Milestone Banners
      if (this.rally === 10) {
        this.ui.showBanner('🔥 10 RALLY STREAK! x2 BONUS', 'info', 1500);
        this.combo = 2;
      } else if (this.rally === 20) {
        this.ui.showBanner('⚡ 20 RALLY HYPER STREAK! x4 BONUS', 'power', 1800);
        this.combo = 4;
      }

      // Base hit score
      if (isPlayer) {
        this.score += 50 * this.combo;
      }
    };

    this.physics.onWallHit = (wallName, hitPos, normPos) => {
      this.sound.playWallBounce(normPos.xNorm, normPos.zNorm);
      this.scene.triggerWallShockwave(wallName, hitPos);
      this.wallBounceCount++;
    };

    this.physics.onScore = (scorer) => {
      this.handlePointScored(scorer);
    };
  }

  bindInputs() {
    const container = this.scene.container;

    // Mouse Move (Standard tracking)
    window.addEventListener('mousemove', (e) => {
      if (this.state !== 'PLAYING' && this.state !== 'SERVE_DELAY' && this.state !== 'WAITING_FOR_SERVE') return;

      if (this.usePointerLock && document.pointerLockElement) {
        // Pointer lock mode (delta movement) with responsive trackpad scaling
        const scale = 0.042 * this.mouseSensitivity;
        this.targetPlayerX += e.movementX * scale;
        this.targetPlayerY -= e.movementY * scale; // invert Y for screen up
      } else {
        // 1:1 instantaneous unprojection from screen cursor directly to 3D paddle plane
        const rect = container.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1); // inverted

        const worldPos = this.scene.unprojectToPaddlePlane(normX, normY);
        if (this.mouseSensitivity === 1.0) {
          this.targetPlayerX = worldPos.x;
          this.targetPlayerY = worldPos.y;
        } else {
          this.targetPlayerX = worldPos.x * this.mouseSensitivity;
          this.targetPlayerY = worldPos.y * this.mouseSensitivity;
        }
      }
    });

    // Touch Support (Drag on mobile/tablets)
    let touchStartX = 0;
    let touchStartY = 0;
    let paddleTouchStartX = 0;
    let paddleTouchStartY = 0;

    container.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        paddleTouchStartX = this.targetPlayerX;
        paddleTouchStartY = this.targetPlayerY;
      }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        const rect = container.getBoundingClientRect();

        const unitsPerPxX = (this.physics.halfW * 2) / (rect.width * 0.55);
        const unitsPerPxY = (this.physics.halfH * 2) / (rect.height * 0.55);

        this.targetPlayerX = paddleTouchStartX + dx * unitsPerPxX * this.mouseSensitivity;
        this.targetPlayerY = paddleTouchStartY - dy * unitsPerPxY * this.mouseSensitivity;
      }
    }, { passive: false });

    // Keyboard (for Player 2 in Hotseat or accessibility shortcuts)
    window.addEventListener('keydown', (e) => {
      if (e.code in this.keys) {
        this.keys[e.code] = true;
      }
      if (e.code === 'Space') {
        if (this.state === 'WAITING_FOR_SERVE') {
          this.executePlayerServe();
        }
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }
      if (e.code === 'KeyM') {
        const isMuted = !this.sound.muted;
        this.sound.setMuted(isMuted);
        const btnSound = document.querySelector('#btn-sound-toggle');
        if (btnSound) btnSound.textContent = isMuted ? '🔇' : '🔊';
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code in this.keys) {
        this.keys[e.code] = false;
      }
    });

    // Pointerdown / Click handler for serving and pointer lock
    container.addEventListener('pointerdown', () => {
      if (this.state === 'WAITING_FOR_SERVE') {
        this.executePlayerServe();
      } else if (this.usePointerLock && this.state === 'PLAYING') {
        container.requestPointerLock();
      }
    });
  }

  startGame(mode = 'campaign') {
    this.gameMode = mode;
    this.score = 0;
    this.combo = 1;
    this.rally = 0;
    this.maxRally = 0;
    this.curveShotCount = 0;
    this.wallBounceCount = 0;
    this.maxSpeedKmh = 0;
    this.playerPointsInRound = 0;
    this.opponentPointsInRound = 0;

    if (mode === 'campaign') {
      this.level = 1;
      this.ballsLeft = 3;
      this.maxBalls = 3;
      this.ai.setLevel(1);
    } else if (mode === 'endless') {
      this.level = 1;
      this.ballsLeft = 1;
      this.maxBalls = 1;
      this.ai.setLevel(3);
    } else if (mode === 'practice') {
      this.level = 1;
      this.ballsLeft = 99;
      this.ai.setLevel(2);
    } else if (mode === 'hotseat_2p') {
      this.level = 1;
      this.ballsLeft = 5;
      this.playerPointsInRound = 0;
      this.opponentPointsInRound = 0;
    }

    this.sound.ensureContext();
    this.sound.startBGM();

    this.ui.showScreen(mode === 'practice' ? 'practice' : 'playing');
    this.prepareServe(true);
  }

  prepareServe(toPlayer = true) {
    this.nextServer = toPlayer ? 'opponent' : 'player';
    this.rally = 0;
    this.sound.updateBGMRally(0);

    const b = this.physics.ball;
    b.trailHistory = [];
    b.spinX = 0;
    b.spinY = 0;
    b.isPowerShot = false;

    if (this.nextServer === 'player') {
      // Player's serve: wait for player click/space
      this.state = 'WAITING_FOR_SERVE';
      b.x = this.physics.playerPaddle.x;
      b.y = this.physics.playerPaddle.y;
      b.z = 1.0;
      b.vx = 0;
      b.vy = 0;
      b.vz = 0;
      b.active = true;

      const msg = (this.gameMode === 'hotseat_2p') ? 'PLAYER 1: CLICK TO SERVE' : 'CLICK / TAP TO SERVE';
      this.ui.showBanner(msg, 'info', 2500);
    } else {
      // Opponent's serve: pause briefly then launch
      this.state = 'SERVE_DELAY';
      this.stateTimer = 0.85;
      b.x = this.physics.opponentPaddle.x;
      b.y = this.physics.opponentPaddle.y;
      b.z = this.physics.tunnelDepth - 1.0;
      b.vx = 0;
      b.vy = 0;
      b.vz = 0;
      b.active = true;

      const msg = (this.gameMode === 'hotseat_2p') ? 'PLAYER 2 SERVING...' : 'OPPONENT SERVING...';
      this.ui.showBanner(msg, 'info', 800);
    }
  }

  executePlayerServe() {
    if (this.state !== 'WAITING_FOR_SERVE') return;
    this.state = 'PLAYING';
    const b = this.physics.ball;
    const p = this.physics.playerPaddle;

    b.speed = (this.gameMode === 'practice') ? this.practiceSpeed : this.physics.ball.initialSpeed;
    b.vz = b.speed;
    b.vx = p.vx * 0.25;
    b.vy = p.vy * 0.25;
    b.spinX = p.vy * 0.18;
    b.spinY = p.vx * 0.18;
    b.active = true;

    this.sound.playPaddleHit(true, false, 1.0);
    this.scene.triggerSparks({ x: b.x, y: b.y, z: b.z }, 18, true);
    this.ui.showBanner('SERVE!', 'info', 500);
  }

  executeOpponentServe() {
    this.state = 'PLAYING';
    const b = this.physics.ball;
    const op = this.physics.opponentPaddle;

    b.speed = (this.gameMode === 'practice') ? this.practiceSpeed : this.physics.ball.initialSpeed;
    b.vz = -b.speed;
    b.vx = (Math.random() - 0.5) * 5.0;
    b.vy = (Math.random() - 0.5) * 5.0;
    b.spinX = (Math.random() - 0.5) * 1.5;
    b.spinY = (Math.random() - 0.5) * 1.5;
    b.active = true;

    this.sound.playPaddleHit(false, false, 1.0);
    this.scene.triggerSparks({ x: b.x, y: b.y, z: b.z }, 18, false);
  }

  handlePointScored(scorer) {
    this.state = 'POINT_SCORED';
    this.stateTimer = 1.3;

    const playerScored = (scorer === 'player');
    this.sound.playScore(playerScored);

    if (playerScored) {
      this.playerPointsInRound++;
      const tier = this.ai.getTierInfo();
      const pointsWon = (100 * this.level * this.combo) + (this.rally * 35);
      this.score += pointsWon;

      this.scene.triggerScreenShake(0.2);
      this.ui.showBanner('★ POINT! + ' + pointsWon + ' ★', 'info', 1200);

      // Check win condition
      if (this.gameMode === 'campaign' && this.playerPointsInRound >= this.pointsToWinRound) {
        this.handleLevelCleared();
        return;
      } else if (this.gameMode === 'hotseat_2p' && this.playerPointsInRound >= 7) {
        this.handleGameOver('PLAYER 1 WINS!');
        return;
      }
    } else {
      // Opponent scored
      this.opponentPointsInRound++;
      this.combo = 1;
      this.scene.triggerScreenShake(0.4);

      if (this.gameMode === 'campaign' || this.gameMode === 'endless') {
        this.ballsLeft--;
        this.ui.showBanner('BALL LOST', 'power', 1200);

        if (this.ballsLeft <= 0) {
          this.handleGameOver('SYSTEM DISCONNECTED');
          return;
        }
      } else if (this.gameMode === 'hotseat_2p' && this.opponentPointsInRound >= 7) {
        this.handleGameOver('PLAYER 2 WINS!');
        return;
      } else {
        this.ui.showBanner('MISSED!', 'power', 1000);
      }
    }

    // Prepare next serve: winner serves or receiver
    this.nextServer = playerScored ? 'opponent' : 'player';
  }

  handleLevelCleared() {
    this.state = 'LEVEL_CLEARED';
    this.sound.playLevelComplete();

    // Bonus life reward every 3 levels
    if (this.level % 3 === 0 && this.ballsLeft < this.maxBalls) {
      this.ballsLeft++;
    }

    const tier = this.ai.getTierInfo();
    this.ui.showLevelClearModal({
      bossName: tier.name,
      score: this.score,
      maxRally: this.maxRally,
      maxSpeedKmh: this.maxSpeedKmh,
      curveBonus: this.curveShotCount * 150
    });
  }

  nextLevel() {
    this.level++;
    if (this.level > 10) {
      this.handleGameOver('VICTORY - CHAMPION OF THE ARENA!');
      return;
    }

    this.ai.setLevel(this.level);
    this.playerPointsInRound = 0;
    this.opponentPointsInRound = 0;

    this.ui.showScreen('playing');
    this.prepareServe(true);
  }

  handleGameOver(title = 'GAME OVER') {
    this.state = 'GAME_OVER';
    this.sound.playGameOver();
    this.sound.stopBGM();

    const isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.highScore = this.score;
      localStorage.setItem('cyberball_hiscore', this.highScore);
    }

    this.ui.showGameOverModal({
      title,
      score: this.score,
      highScore: this.highScore,
      maxRally: this.maxRally,
      maxSpeedKmh: this.maxSpeedKmh,
      isNewRecord
    });
  }

  togglePause() {
    if (this.state === 'PLAYING' || this.state === 'SERVE_DELAY') {
      this.state = 'PAUSED';
      this.ui.showScreen('pause');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.ui.showScreen(this.gameMode === 'practice' ? 'practice' : 'playing');
    }
  }

  resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.ui.showScreen(this.gameMode === 'practice' ? 'practice' : 'playing');
    }
  }

  restartRound() {
    this.playerPointsInRound = 0;
    this.opponentPointsInRound = 0;
    this.rally = 0;
    this.ui.showScreen(this.gameMode === 'practice' ? 'practice' : 'playing');
    this.prepareServe(true);
  }

  quitToMenu() {
    this.state = 'MENU';
    this.sound.stopBGM();
    this.physics.ball.active = false;
    this.ui.showScreen('menu');
  }

  // --- Main Animation Loop ---

  startLoop() {
    this.lastTime = performance.now();
    const loop = (time) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (time - this.lastTime) / 1000) * this.timeScale;
      this.lastTime = time;

      this.update(dt);
      this.render();
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    // 1. State timer transitions
    if (this.state === 'SERVE_DELAY') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.executeOpponentServe();
      }
    } else if (this.state === 'POINT_SCORED') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.prepareServe(this.nextServer === 'player');
      }
    } else if (this.state === 'WAITING_FOR_SERVE') {
      // Ball sits attached to player's paddle for interactive aim
      const b = this.physics.ball;
      b.x = this.physics.playerPaddle.x;
      b.y = this.physics.playerPaddle.y;
      b.z = 1.0;
      b.active = true;
    }

    // 2. Update Paddles
    // Player 1 (Near paddle at Z = 0)
    this.physics.updatePlayerPaddle(this.targetPlayerX, this.targetPlayerY, dt);

    // Player 2 / AI (Far paddle at Z = 80)
    if (this.gameMode === 'hotseat_2p') {
      // 2-Player keyboard controls
      const p2Speed = 36;
      let p2Dx = 0;
      let p2Dy = 0;
      if (this.keys.ArrowLeft || this.keys.KeyA) p2Dx -= 1;
      if (this.keys.ArrowRight || this.keys.KeyD) p2Dx += 1;
      if (this.keys.ArrowUp || this.keys.KeyW) p2Dy += 1;
      if (this.keys.ArrowDown || this.keys.KeyS) p2Dy -= 1;

      this.p2X += p2Dx * p2Speed * dt;
      this.p2Y += p2Dy * p2Speed * dt;
      this.physics.updateOpponentPaddle(this.p2X, this.p2Y, dt);
    } else {
      // AI opponent update
      if (this.state === 'PLAYING' || this.state === 'SERVE_DELAY') {
        this.ai.update(dt);
      }
    }

    // 3. Physics update
    if (this.state === 'PLAYING') {
      this.physics.update(dt);

      // Track max ball velocity (in km/h)
      const speedKmh = this.physics.ball.speed * 3.6;
      this.maxSpeedKmh = Math.max(this.maxSpeedKmh, speedKmh);
    }

    // 4. Visual effects & Scene update
    this.scene.update(dt);

    // 5. Practice Lab Trajectory Guide
    if (this.gameMode === 'practice' && this.practiceTrajectory && this.physics.ball.active) {
      const pred = this.physics.predictTrajectory(this.physics.ball.vz > 0 ? this.physics.tunnelDepth : 0);
      this.scene.updateTrajectoryVisualizer(pred);
    } else {
      this.scene.updateTrajectoryVisualizer(null);
    }

    // 6. HUD updates
    if (this.state !== 'MENU') {
      const tier = this.ai.getTierInfo();
      let levelBadge = '';
      if (this.gameMode === 'campaign') {
        levelBadge = `LVL ${this.level}: ${tier.name} (${this.playerPointsInRound}/${this.pointsToWinRound})`;
      } else if (this.gameMode === 'endless') {
        levelBadge = `ENDLESS SURVIVAL`;
      } else if (this.gameMode === 'practice') {
        levelBadge = `CURVE LAB (PRACTICE)`;
      } else if (this.gameMode === 'hotseat_2p') {
        levelBadge = `HOTSEAT 2P (${this.playerPointsInRound} - ${this.opponentPointsInRound})`;
      }

      this.ui.updateHUD({
        score: this.score,
        combo: this.combo,
        rally: this.rally,
        ballsLeft: this.ballsLeft,
        levelBadge,
        highScore: this.highScore,
        speedKmh: this.physics.ball.speed * 3.6,
        spinX: this.physics.ball.spinX,
        spinY: this.physics.ball.spinY
      });
    }
  }

  render() {
    this.scene.render();
  }
}
