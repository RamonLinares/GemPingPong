/**
 * PhysicsWorld: 3D Tunnel and Ball Physics with Magnus Aerodynamic Curve Dynamics
 */
export class PhysicsWorld {
  constructor(options = {}) {
    // Tunnel bounds: symmetric around 0 in X and Y
    this.tunnelWidth = options.tunnelWidth || 16;  // X from -8 to +8
    this.tunnelHeight = options.tunnelHeight || 16; // Y from -8 to +8
    this.tunnelDepth = options.tunnelDepth || 80;   // Z from 0 to 80

    this.halfW = this.tunnelWidth / 2;
    this.halfH = this.tunnelHeight / 2;

    // Ball state
    this.ball = {
      x: 0,
      y: 0,
      z: 10,
      vx: 0,
      vy: 0,
      vz: 0,
      prevX: 0,
      prevY: 0,
      prevZ: 10,
      spinX: 0, // Top/back spin (curves Y)
      spinY: 0, // Side spin (curves X)
      radius: 0.38,
      speed: 34,
      initialSpeed: 34,
      maxSpeed: 85,
      isPowerShot: false,
      active: false
    };

    // Player paddle (Near: Z = 0)
    this.playerPaddle = {
      x: 0,
      y: 0,
      z: 0,
      prevX: 0,
      prevY: 0,
      vx: 0,
      vy: 0,
      width: 3.4,
      height: 3.2
    };

    // Opponent paddle (Far: Z = tunnelDepth)
    this.opponentPaddle = {
      x: 0,
      y: 0,
      z: this.tunnelDepth,
      prevX: 0,
      prevY: 0,
      vx: 0,
      vy: 0,
      width: 3.2,
      height: 3.0
    };

    // Curve and physics parameters
    this.magnusFactor = 1.35;    // Strength of lateral curve acceleration
    this.spinFriction = 0.985;   // Spin decay per frame
    this.speedStep = 1.035;      // Speed increase per paddle hit
    this.smashThreshold = 22.0;  // Paddle swing speed required for Power Smash

    // History trail for glowing ribbon
    this.trailHistory = [];
    this.maxTrailPoints = 32;

    // Event callbacks
    this.onPaddleHit = null; // (isPlayer, isPowerSmash, speedRatio, hitPos)
    this.onWallHit = null;   // (wallName, hitPos, normPos)
    this.onScore = null;     // (scorer: 'player' | 'opponent')
  }

  resetBall(serveToPlayer = true, customSpeed = null) {
    this.ball.radius = 0.38;
    this.ball.speed = customSpeed || this.ball.initialSpeed;
    this.ball.isPowerShot = false;
    this.ball.spinX = 0;
    this.ball.spinY = 0;
    this.trailHistory = [];

    if (serveToPlayer) {
      // Start near opponent and fly toward player
      this.ball.x = (Math.random() - 0.5) * 2;
      this.ball.y = (Math.random() - 0.5) * 2;
      this.ball.z = this.tunnelDepth - 4;
      this.ball.vx = (Math.random() - 0.5) * 4;
      this.ball.vy = (Math.random() - 0.5) * 4;
      this.ball.vz = -this.ball.speed;
    } else {
      const maxSpawnX = this.halfW - this.ball.radius - 0.1;
      const maxSpawnY = this.halfH - this.ball.radius - 0.1;
      this.ball.x = Math.max(-maxSpawnX, Math.min(maxSpawnX, this.playerPaddle.x));
      this.ball.y = Math.max(-maxSpawnY, Math.min(maxSpawnY, this.playerPaddle.y));
      this.ball.z = 2;
      this.ball.vx = (Math.random() - 0.5) * 2;
      this.ball.vy = (Math.random() - 0.5) * 2;
      this.ball.vz = this.ball.speed;
    }

    this.ball.prevX = this.ball.x;
    this.ball.prevY = this.ball.y;
    this.ball.prevZ = this.ball.z;
    this.ball.active = true;
  }

  updatePlayerPaddle(targetX, targetY, dt) {
    // Allow paddle center to reach edges like in the screenshot
    const maxPaddleTravelX = this.halfW - 0.2;
    const maxPaddleTravelY = this.halfH - 0.2;
    const clampedX = Math.max(-maxPaddleTravelX, Math.min(maxPaddleTravelX, targetX));
    const clampedY = Math.max(-maxPaddleTravelY, Math.min(maxPaddleTravelY, targetY));

    // Calculate instantaneous velocity with slight smoothing
    if (dt > 0.0001) {
      const rawVx = (clampedX - this.playerPaddle.x) / dt;
      const rawVy = (clampedY - this.playerPaddle.y) / dt;
      this.playerPaddle.vx = this.playerPaddle.vx * 0.2 + rawVx * 0.8;
      this.playerPaddle.vy = this.playerPaddle.vy * 0.2 + rawVy * 0.8;
    }

    this.playerPaddle.prevX = this.playerPaddle.x;
    this.playerPaddle.prevY = this.playerPaddle.y;
    this.playerPaddle.x = clampedX;
    this.playerPaddle.y = clampedY;
  }

  updateOpponentPaddle(targetX, targetY, dt) {
    const maxPaddleTravelX = this.halfW - 0.2;
    const maxPaddleTravelY = this.halfH - 0.2;
    const clampedX = Math.max(-maxPaddleTravelX, Math.min(maxPaddleTravelX, targetX));
    const clampedY = Math.max(-maxPaddleTravelY, Math.min(maxPaddleTravelY, targetY));

    if (dt > 0.0001) {
      const rawVx = (clampedX - this.opponentPaddle.x) / dt;
      const rawVy = (clampedY - this.opponentPaddle.y) / dt;
      this.opponentPaddle.vx = this.opponentPaddle.vx * 0.2 + rawVx * 0.8;
      this.opponentPaddle.vy = this.opponentPaddle.vy * 0.2 + rawVy * 0.8;
    }

    this.opponentPaddle.prevX = this.opponentPaddle.x;
    this.opponentPaddle.prevY = this.opponentPaddle.y;
    this.opponentPaddle.x = clampedX;
    this.opponentPaddle.y = clampedY;
  }

  update(dt) {
    if (!this.ball.active) return;

    // Sub-stepping for ultra-high speed collision reliability (prevent tunneling)
    const maxSubStepDt = 0.005; // 200 Hz sub-stepping
    let remainingDt = dt;

    while (remainingDt > 0.0001) {
      const step = Math.min(remainingDt, maxSubStepDt);
      this.subStep(step);
      remainingDt -= step;
      if (!this.ball.active) break;
    }

    // Record trail
    this.trailHistory.unshift({
      x: this.ball.x,
      y: this.ball.y,
      z: this.ball.z,
      time: performance.now()
    });
    if (this.trailHistory.length > this.maxTrailPoints) {
      this.trailHistory.pop();
    }
  }

  subStep(dt) {
    const b = this.ball;
    b.prevX = b.x;
    b.prevY = b.y;
    b.prevZ = b.z;

    // Apply Magnus Lateral Curve Acceleration
    // When spinY > 0, ball curves right (+X). When spinX > 0, ball curves up (+Y)
    const curveAx = b.spinY * this.magnusFactor * 26.0;
    const curveAy = b.spinX * this.magnusFactor * 26.0;

    b.vx += curveAx * dt;
    b.vy += curveAy * dt;

    // Natural drag on spin
    b.spinX *= Math.pow(this.spinFriction, dt * 60);
    b.spinY *= Math.pow(this.spinFriction, dt * 60);

    // Update position
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;

    // 1. Wall Collisions: Left & Right (-halfW, +halfW)
    const effHalfW = this.halfW - b.radius;
    if (b.x < -effHalfW) {
      b.x = -effHalfW;
      b.vx = -b.vx * 0.98;
      // Spin friction causes angle kick
      b.vy += b.spinX * 1.5;
      b.spinY *= 0.6;
      if (this.onWallHit) {
        this.onWallHit('left', { x: b.x, y: b.y, z: b.z }, { xNorm: -1, zNorm: b.z / this.tunnelDepth });
      }
    } else if (b.x > effHalfW) {
      b.x = effHalfW;
      b.vx = -b.vx * 0.98;
      b.vy -= b.spinX * 1.5;
      b.spinY *= 0.6;
      if (this.onWallHit) {
        this.onWallHit('right', { x: b.x, y: b.y, z: b.z }, { xNorm: 1, zNorm: b.z / this.tunnelDepth });
      }
    }

    // 2. Wall Collisions: Floor & Ceiling (-halfH, +halfH)
    const effHalfH = this.halfH - b.radius;
    if (b.y < -effHalfH) {
      b.y = -effHalfH;
      b.vy = -b.vy * 0.98;
      b.vx += b.spinY * 1.5;
      b.spinX *= 0.6;
      if (this.onWallHit) {
        this.onWallHit('bottom', { x: b.x, y: b.y, z: b.z }, { xNorm: b.x / this.halfW, zNorm: b.z / this.tunnelDepth });
      }
    } else if (b.y > effHalfH) {
      b.y = effHalfH;
      b.vy = -b.vy * 0.98;
      b.vx -= b.spinY * 1.5;
      b.spinX *= 0.6;
      if (this.onWallHit) {
        this.onWallHit('top', { x: b.x, y: b.y, z: b.z }, { xNorm: b.x / this.halfW, zNorm: b.z / this.tunnelDepth });
      }
    }

    // 3. Near Plane (Player Paddle at Z = 0)
    if (b.vz < 0 && b.prevZ >= 0 && b.z <= b.radius) {
      // Check collision with player paddle
      const p = this.playerPaddle;
      const hitX = Math.abs(b.x - p.x) <= (p.width / 2 + b.radius * 0.8);
      const hitY = Math.abs(b.y - p.y) <= (p.height / 2 + b.radius * 0.8);

      if (hitX && hitY) {
        // Hit!
        b.z = b.radius;
        
        // Speed scaling
        b.speed = Math.min(this.ball.maxSpeed, b.speed * this.speedStep);

        // Paddle velocity transfer -> Magnus Spin!
        const swingSpeed = Math.hypot(p.vx, p.vy);
        const isPowerSmash = swingSpeed > this.smashThreshold;

        b.spinX = p.vy * 0.16;
        b.spinY = p.vx * 0.16;

        // Angle deflection based on distance from paddle center
        const dx = (b.x - p.x) / (p.width / 2);
        const dy = (b.y - p.y) / (p.height / 2);

        b.vx = dx * (b.speed * 0.35) + p.vx * 0.2;
        b.vy = dy * (b.speed * 0.35) + p.vy * 0.2;

        let newVz = b.speed;
        if (isPowerSmash) {
          newVz *= 1.25;
          b.isPowerShot = true;
        } else {
          b.isPowerShot = false;
        }
        b.vz = newVz;

        if (this.onPaddleHit) {
          this.onPaddleHit(true, isPowerSmash, b.speed / this.ball.initialSpeed, { x: b.x, y: b.y, z: b.z });
        }
      }
    }

    // Check if missed by player (ball went past player paddle plane)
    if (b.z < -2.0) {
      b.active = false;
      if (this.onScore) {
        this.onScore('opponent');
      }
      return;
    }

    // 4. Far Plane (Opponent Paddle at Z = tunnelDepth)
    if (b.vz > 0 && b.prevZ <= this.tunnelDepth && b.z >= (this.tunnelDepth - b.radius)) {
      const p = this.opponentPaddle;
      const hitX = Math.abs(b.x - p.x) <= (p.width / 2 + b.radius * 0.8);
      const hitY = Math.abs(b.y - p.y) <= (p.height / 2 + b.radius * 0.8);

      if (hitX && hitY) {
        // Hit!
        b.z = this.tunnelDepth - b.radius;
        b.speed = Math.min(this.ball.maxSpeed, b.speed * this.speedStep);

        const swingSpeed = Math.hypot(p.vx, p.vy);
        const isPowerSmash = swingSpeed > this.smashThreshold;

        b.spinX = p.vy * 0.14;
        b.spinY = p.vx * 0.14;

        const dx = (b.x - p.x) / (p.width / 2);
        const dy = (b.y - p.y) / (p.height / 2);

        b.vx = dx * (b.speed * 0.35) + p.vx * 0.15;
        b.vy = dy * (b.speed * 0.35) + p.vy * 0.15;

        let newVz = -b.speed;
        if (isPowerSmash) {
          newVz *= 1.2;
          b.isPowerShot = true;
        } else {
          b.isPowerShot = false;
        }
        b.vz = newVz;

        if (this.onPaddleHit) {
          this.onPaddleHit(false, isPowerSmash, b.speed / this.ball.initialSpeed, { x: b.x, y: b.y, z: b.z });
        }
      }
    }

    // Check if missed by opponent (ball went past far wall)
    if (b.z > this.tunnelDepth + 2.0) {
      b.active = false;
      if (this.onScore) {
        this.onScore('player');
      }
      return;
    }
  }

  /**
   * Fast trajectory simulation for AI and Practice mode visualizer
   * Predicts position of ball when it reaches targetZ
   */
  predictTrajectory(targetZ, maxSteps = 120) {
    if (!this.ball.active) return null;

    // Clone state
    let simX = this.ball.x;
    let simY = this.ball.y;
    let simZ = this.ball.z;
    let simVx = this.ball.vx;
    let simVy = this.ball.vy;
    let simVz = this.ball.vz;
    let simSpinX = this.ball.spinX;
    let simSpinY = this.ball.spinY;

    const points = [{ x: simX, y: simY, z: simZ }];
    const dt = 0.02;
    const effHalfW = this.halfW - this.ball.radius;
    const effHalfH = this.halfH - this.ball.radius;

    for (let i = 0; i < maxSteps; i++) {
      if ((simVz > 0 && simZ >= targetZ) || (simVz < 0 && simZ <= targetZ)) {
        break;
      }

      simVx += simSpinY * this.magnusFactor * 26.0 * dt;
      simVy += simSpinX * this.magnusFactor * 26.0 * dt;
      simSpinX *= Math.pow(this.spinFriction, dt * 60);
      simSpinY *= Math.pow(this.spinFriction, dt * 60);

      simX += simVx * dt;
      simY += simVy * dt;
      simZ += simVz * dt;

      // Wall rebounds
      if (simX < -effHalfW) {
        simX = -effHalfW;
        simVx = -simVx;
      } else if (simX > effHalfW) {
        simX = effHalfW;
        simVx = -simVx;
      }

      if (simY < -effHalfH) {
        simY = -effHalfH;
        simVy = -simVy;
      } else if (simY > effHalfH) {
        simY = effHalfH;
        simVy = -simVy;
      }

      points.push({ x: simX, y: simY, z: simZ });
    }

    return {
      finalPos: { x: simX, y: simY, z: targetZ },
      points
    };
  }
}
