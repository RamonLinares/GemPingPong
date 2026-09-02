/**
 * AIAgent: Multi-Tier Futuristic Opponent AI
 * Features humanized reaction latency, trajectory prediction, curve anticipation,
 * and tactical counter-curve shots across 10 progressive difficulty tiers.
 */
export class AIAgent {
  constructor(physics) {
    this.physics = physics;
    this.level = 1;

    // AI tiers configuration
    this.tiers = [
      { level: 1, name: 'SPARK-01', subtitle: 'Training Drone', maxSpeed: 18, delay: 0.28, error: 1.6, curveAggression: 0.1, color: '#38ef7d' },
      { level: 2, name: 'CIRCUIT-B', subtitle: 'Patrol Unit', maxSpeed: 22, delay: 0.22, error: 1.3, curveAggression: 0.2, color: '#00f2fe' },
      { level: 3, name: 'VECTOR-9', subtitle: 'Interceptor', maxSpeed: 26, delay: 0.17, error: 1.0, curveAggression: 0.35, color: '#4facfe' },
      { level: 4, name: 'PULSE-X', subtitle: 'Combat Sentry', maxSpeed: 30, delay: 0.13, error: 0.75, curveAggression: 0.45, color: '#fa709a' },
      { level: 5, name: 'CYBER-VIPER', subtitle: 'Sector Boss', maxSpeed: 35, delay: 0.09, error: 0.5, curveAggression: 0.65, color: '#ff0844' },
      { level: 6, name: 'CHRONOS', subtitle: 'Time Tactician', maxSpeed: 40, delay: 0.07, error: 0.38, curveAggression: 0.75, color: '#f857a6' },
      { level: 7, name: 'NEURAL-STORM', subtitle: 'Predictive Core', maxSpeed: 44, delay: 0.05, error: 0.28, curveAggression: 0.85, color: '#7f00ff' },
      { level: 8, name: 'HYPERION', subtitle: 'Heavy Striker', maxSpeed: 48, delay: 0.038, error: 0.2, curveAggression: 0.9, color: '#f12711' },
      { level: 9, name: 'VORTEX-ZERO', subtitle: 'Warp Enforcer', maxSpeed: 52, delay: 0.025, error: 0.14, curveAggression: 0.95, color: '#00c6ff' },
      { level: 10, name: 'OMEGA-SINGULARITY', subtitle: 'Grand Singularity', maxSpeed: 58, delay: 0.015, error: 0.06, curveAggression: 1.0, color: '#ff007f' }
    ];

    // Tracking state
    this.currentTier = this.tiers[0];
    this.targetX = 0;
    this.targetY = 0;
    this.errorOffsetX = 0;
    this.errorOffsetY = 0;
    this.reactionTimer = 0;
    this.swingTimer = 0;
    this.swingDirection = { x: 0, y: 0 };
  }

  setLevel(lvl) {
    this.level = Math.max(1, Math.min(this.tiers.length, lvl));
    this.currentTier = this.tiers[this.level - 1];
    this.targetX = 0;
    this.targetY = 0;
    this.errorOffsetX = (Math.random() - 0.5) * this.currentTier.error;
    this.errorOffsetY = (Math.random() - 0.5) * this.currentTier.error;
  }

  getTierInfo() {
    return this.currentTier;
  }

  update(dt) {
    const b = this.physics.ball;
    const p = this.physics.opponentPaddle;
    const tier = this.currentTier;

    if (!b.active) {
      // Return smoothly to center when ball inactive
      this.moveTowards(0, 0, tier.maxSpeed * 0.5, dt);
      return;
    }

    if (b.vz > 0) {
      // Ball is heading toward AI (Z increases towards tunnelDepth)
      this.reactionTimer += dt;

      if (this.reactionTimer >= tier.delay) {
        // Predict trajectory where ball arrives at opponent paddle plane
        const prediction = this.physics.predictTrajectory(p.z);
        if (prediction && prediction.finalPos) {
          // As ball gets closer to AI, error diminishes
          const distanceToPaddle = Math.max(0, p.z - b.z);
          const depthRatio = distanceToPaddle / this.physics.tunnelDepth;
          const currentErrorScale = depthRatio * tier.error;

          let goalX = prediction.finalPos.x + this.errorOffsetX * currentErrorScale;
          let goalY = prediction.finalPos.y + this.errorOffsetY * currentErrorScale;

          // AI curve swing tactic: when ball is very close, AI snaps paddle to side to curve the return!
          if (distanceToPaddle < 8.0 && Math.random() < tier.curveAggression) {
            if (this.swingTimer <= 0) {
              this.swingTimer = 0.3;
              // Choose a tricky angle to send ball to corners
              this.swingDirection.x = (Math.random() > 0.5 ? 1 : -1) * (tier.maxSpeed * 0.8);
              this.swingDirection.y = (Math.random() > 0.5 ? 1 : -1) * (tier.maxSpeed * 0.8);
            }
          }

          if (this.swingTimer > 0) {
            this.swingTimer -= dt;
            goalX += this.swingDirection.x * 0.1;
            goalY += this.swingDirection.y * 0.1;
          }

          this.moveTowards(goalX, goalY, tier.maxSpeed, dt);
        }
      }
    } else {
      // Ball is flying away from AI towards player
      this.reactionTimer = 0;
      this.swingTimer = 0;
      // Re-roll tracking error for next rally
      this.errorOffsetX = (Math.random() - 0.5) * tier.error;
      this.errorOffsetY = (Math.random() - 0.5) * tier.error;

      // Center drift with slight anticipation of player's center
      const driftX = b.x * 0.25;
      const driftY = b.y * 0.25;
      this.moveTowards(driftX, driftY, tier.maxSpeed * 0.45, dt);
    }
  }

  moveTowards(targetX, targetY, maxSpeed, dt) {
    const p = this.physics.opponentPaddle;
    const dx = targetX - p.x;
    const dy = targetY - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.05) {
      this.physics.updateOpponentPaddle(targetX, targetY, dt);
      return;
    }

    const step = Math.min(dist, maxSpeed * dt);
    const nextX = p.x + (dx / dist) * step;
    const nextY = p.y + (dy / dist) * step;

    this.physics.updateOpponentPaddle(nextX, nextY, dt);
  }
}
