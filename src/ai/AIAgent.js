/**
 * AIAgent: Humanized Progressive Opponent AI
 * 
 * Replaces psychic "god AI" with realistic human-like visual perception:
 * - Does NOT instantly know the future physics solution on frame 1
 * - Relies on apparent linear trajectory and is fooled by Magnus curve spin
 * - Exhibits reaction latency, wall-bounce surprise hesitation, and depth awareness
 * - Higher levels react faster and read spin earlier, but early levels can be easily
 *   beaten with curve shots, corner placements, and bank shots!
 */
export class AIAgent {
  constructor(physics) {
    this.physics = physics;
    this.level = 1;

    // 10 Progressive Tiers from easily beatable drone to intense cyber boss
    this.tiers = [
      {
        level: 1,
        name: 'SPARK-01',
        subtitle: 'Training Drone',
        maxSpeed: 11.5,
        delay: 0.45,
        curveBlindness: 0.90, // 90% blind to curve spin (fooled by curve shots!)
        anticipateBounces: 0, // Cannot predict wall bounces
        error: 2.2,
        curveAggression: 0.05,
        color: '#38ef7d'
      },
      {
        level: 2,
        name: 'CIRCUIT-B',
        subtitle: 'Patrol Unit',
        maxSpeed: 14.0,
        delay: 0.38,
        curveBlindness: 0.75,
        anticipateBounces: 0,
        error: 1.8,
        curveAggression: 0.12,
        color: '#00f2fe'
      },
      {
        level: 3,
        name: 'VECTOR-9',
        subtitle: 'Interceptor',
        maxSpeed: 17.0,
        delay: 0.30,
        curveBlindness: 0.60,
        anticipateBounces: 1, // Can anticipate 1 wall bounce
        error: 1.4,
        curveAggression: 0.22,
        color: '#4facfe'
      },
      {
        level: 4,
        name: 'PULSE-X',
        subtitle: 'Combat Sentry',
        maxSpeed: 20.5,
        delay: 0.22,
        curveBlindness: 0.45,
        anticipateBounces: 1,
        error: 1.1,
        curveAggression: 0.35,
        color: '#fa709a'
      },
      {
        level: 5,
        name: 'CYBER-VIPER',
        subtitle: 'Sector Boss',
        maxSpeed: 24.5,
        delay: 0.16,
        curveBlindness: 0.32,
        anticipateBounces: 1,
        error: 0.8,
        curveAggression: 0.50,
        color: '#ff0844'
      },
      {
        level: 6,
        name: 'CHRONOS',
        subtitle: 'Time Tactician',
        maxSpeed: 28.5,
        delay: 0.12,
        curveBlindness: 0.22,
        anticipateBounces: 2,
        error: 0.6,
        curveAggression: 0.65,
        color: '#f857a6'
      },
      {
        level: 7,
        name: 'NEURAL-STORM',
        subtitle: 'Predictive Core',
        maxSpeed: 32.5,
        delay: 0.09,
        curveBlindness: 0.15,
        anticipateBounces: 2,
        error: 0.45,
        curveAggression: 0.75,
        color: '#7f00ff'
      },
      {
        level: 8,
        name: 'HYPERION',
        subtitle: 'Heavy Striker',
        maxSpeed: 36.5,
        delay: 0.065,
        curveBlindness: 0.10,
        anticipateBounces: 2,
        error: 0.32,
        curveAggression: 0.85,
        color: '#f12711'
      },
      {
        level: 9,
        name: 'VORTEX-ZERO',
        subtitle: 'Warp Enforcer',
        maxSpeed: 41.0,
        delay: 0.045,
        curveBlindness: 0.06,
        anticipateBounces: 3,
        error: 0.22,
        curveAggression: 0.92,
        color: '#00c6ff'
      },
      {
        level: 10,
        name: 'OMEGA-SINGULARITY',
        subtitle: 'Grand Singularity',
        maxSpeed: 46.0,
        delay: 0.025,
        curveBlindness: 0.02,
        anticipateBounces: 3,
        error: 0.12,
        curveAggression: 1.0,
        color: '#ff007f'
      }
    ];

    // Tracking state
    this.currentTier = this.tiers[0];
    this.targetX = 0;
    this.targetY = 0;
    this.perceivedX = 0;
    this.perceivedY = 0;
    this.errorOffsetX = 0;
    this.errorOffsetY = 0;
    this.reactionTimer = 0;
    this.bounceSurpriseTimer = 0;
    this.swingTimer = 0;
    this.swingDirection = { x: 0, y: 0 };

    // Listen to wall bounces to trigger humanized reaction surprise
    this.setupWallBounceListener();
  }

  setupWallBounceListener() {
    const origWallHit = this.physics.onWallHit;
    this.physics.onWallHit = (wallName, hitPos, normPos) => {
      if (origWallHit) origWallHit(wallName, hitPos, normPos);

      // When ball bounces, AI experiences a hesitation shock
      if (this.physics.ball.vz > 0) {
        // Lower levels hesitate longer upon a wall bounce!
        this.bounceSurpriseTimer = Math.max(0.1, 0.35 - (this.level * 0.03));
      }
    };
  }

  setLevel(lvl) {
    this.level = Math.max(1, Math.min(this.tiers.length, lvl));
    this.currentTier = this.tiers[this.level - 1];
    this.targetX = 0;
    this.targetY = 0;
    this.perceivedX = 0;
    this.perceivedY = 0;

    // Compact opponent paddle at early levels (2.2 x 2.0) matching classic Curveball
    // Makes corners and curve shots rewarding and beatable!
    const paddleW = 2.2 + (this.level - 1) * 0.1;
    const paddleH = 2.0 + (this.level - 1) * 0.1;
    this.physics.opponentPaddle.width = paddleW;
    this.physics.opponentPaddle.height = paddleH;

    this.resetRallyError();
  }

  resetRallyError() {
    const err = this.currentTier.error;
    this.errorOffsetX = (Math.random() - 0.5) * err;
    this.errorOffsetY = (Math.random() - 0.5) * err;
  }

  getTierInfo() {
    return this.currentTier;
  }

  update(dt) {
    const b = this.physics.ball;
    const p = this.physics.opponentPaddle;
    const tier = this.currentTier;

    if (!b.active) {
      // Return smoothly to center when ball is inactive
      this.moveTowards(0, 0, tier.maxSpeed * 0.4, dt);
      return;
    }

    // Ball is flying away from AI towards player (Z decreasing)
    if (b.vz <= 0) {
      this.reactionTimer = 0;
      this.bounceSurpriseTimer = 0;
      this.swingTimer = 0;
      this.resetRallyError();

      // Idle drifting: stay near center with subtle anticipation
      const driftX = b.x * 0.15;
      const driftY = b.y * 0.15;
      this.moveTowards(driftX, driftY, tier.maxSpeed * 0.35, dt);
      return;
    }

    // Ball is coming toward AI (vz > 0)
    this.reactionTimer += dt;

    // 1. Initial reaction latency delay
    if (this.reactionTimer < tier.delay) {
      // During initial reaction delay, AI is still processing the shot!
      // Just drift slowly toward center
      this.moveTowards(0, 0, tier.maxSpeed * 0.25, dt);
      return;
    }

    // 2. Wall bounce surprise hesitation
    if (this.bounceSurpriseTimer > 0) {
      this.bounceSurpriseTimer -= dt;
      // Stunned by bounce - don't re-track yet
      return;
    }

    // 3. Humanized Distance Awareness
    // When ball is still far away in the tunnel (Z < 30), AI only tracks roughly
    const distanceToPaddle = Math.max(0, p.z - b.z);
    const depthRatio = distanceToPaddle / this.physics.tunnelDepth; // 1 (far) to 0 (close)

    if (b.z < 30 && this.level <= 4) {
      // Early levels don't even sprint until ball crosses half-court!
      const roughX = b.x * 0.3;
      const roughY = b.y * 0.3;
      this.moveTowards(roughX, roughY, tier.maxSpeed * 0.4, dt);
      return;
    }

    // 4. Perceived Target Calculation (Humanized imperfect vision)
    // Instead of psychic simulation, compute what a human player would estimate:
    const tRemain = Math.max(0.01, distanceToPaddle / Math.max(10, b.vz));

    // Linear projection based on CURRENT velocity (ignoring or underestimating future curve)
    let estVx = b.vx;
    let estVy = b.vy;

    // Apply curve blindness:
    // If curveBlindness is 0.9 (Level 1), AI completely ignores the fact that ball is curving!
    // As ball gets closer (Z > 55), the AI is forced to see where it actually is.
    const awarenessOfCurve = (1 - tier.curveBlindness) * (1 - depthRatio * 0.7);
    const curveAx = b.spinY * this.physics.magnusFactor * 26.0;
    const curveAy = b.spinX * this.physics.magnusFactor * 26.0;

    // Apparent destination
    let goalX = b.x + (estVx * tRemain) + (0.5 * curveAx * tRemain * tRemain * awarenessOfCurve);
    let goalY = b.y + (estVy * tRemain) + (0.5 * curveAy * tRemain * tRemain * awarenessOfCurve);

    // Wall bounce estimation:
    const hw = this.physics.halfW - p.width * 0.4;
    const hh = this.physics.halfH - p.height * 0.4;

    if (tier.anticipateBounces === 0) {
      // Level 1 & 2: CANNOT anticipate wall bounces!
      // If projection exceeds wall, AI thinks it goes off screen or stops at wall!
      goalX = Math.max(-hw, Math.min(hw, goalX));
      goalY = Math.max(-hh, Math.min(hh, goalY));
    } else {
      // Levels 3+: Can anticipate bounces, but imperfectly
      for (let bounce = 0; bounce < tier.anticipateBounces; bounce++) {
        if (goalX < -hw) {
          goalX = -hw + (-hw - goalX);
        } else if (goalX > hw) {
          goalX = hw - (goalX - hw);
        }

        if (goalY < -hh) {
          goalY = -hh + (-hh - goalY);
        } else if (goalY > hh) {
          goalY = hh - (goalY - hh);
        }
      }
    }

    // Add tracking error (larger when far, diminishing as ball gets closer)
    const currentError = this.errorOffsetX * depthRatio * tier.error;
    const currentErrorY = this.errorOffsetY * depthRatio * tier.error;
    goalX += currentError;
    goalY += currentErrorY;

    // Clamp goal to reachable paddle range
    goalX = Math.max(-hw, Math.min(hw, goalX));
    goalY = Math.max(-hh, Math.min(hh, goalY));

    // 5. Tactical AI Counter-Swing (Attempts curve return when ball is very close)
    if (distanceToPaddle < 7.0 && Math.random() < tier.curveAggression) {
      if (this.swingTimer <= 0) {
        this.swingTimer = 0.28;
        this.swingDirection.x = (Math.random() > 0.5 ? 1 : -1) * (tier.maxSpeed * 0.75);
        this.swingDirection.y = (Math.random() > 0.5 ? 1 : -1) * (tier.maxSpeed * 0.75);
      }
    }

    if (this.swingTimer > 0) {
      this.swingTimer -= dt;
      goalX += this.swingDirection.x * 0.08;
      goalY += this.swingDirection.y * 0.08;
    }

    // Move smoothly towards goal with tier speed
    this.moveTowards(goalX, goalY, tier.maxSpeed, dt);
  }

  moveTowards(targetX, targetY, maxSpeed, dt) {
    const p = this.physics.opponentPaddle;
    const dx = targetX - p.x;
    const dy = targetY - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.04) {
      this.physics.updateOpponentPaddle(targetX, targetY, dt);
      return;
    }

    const step = Math.min(dist, maxSpeed * dt);
    const nextX = p.x + (dx / dist) * step;
    const nextY = p.y + (dy / dist) * step;

    this.physics.updateOpponentPaddle(nextX, nextY, dt);
  }
}
