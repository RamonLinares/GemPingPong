import { PhysicsWorld } from '../src/physics/PhysicsWorld.js';
import { AIAgent } from '../src/ai/AIAgent.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- Starting Cyberball 3D Physics & AI Test Suite ---');

// Test 1: PhysicsWorld instantiation and bounds
const physics = new PhysicsWorld({
  tunnelWidth: 16,
  tunnelHeight: 16,
  tunnelDepth: 80
});
assert(physics.tunnelWidth === 16, 'Tunnel width should be 16');
assert(physics.tunnelHeight === 16, 'Tunnel height should be 16');
assert(physics.tunnelDepth === 80, 'Tunnel depth should be 80');
assert(physics.halfW === 8, 'Half width should be 8');
assert(physics.halfH === 8, 'Half height should be 8');

// Test 2: Paddle movement and edge clamping
physics.updatePlayerPaddle(15, -20, 0.016);
assert(physics.playerPaddle.x <= physics.halfW - 0.2, 'Paddle X must clamp to tunnel edge');
assert(physics.playerPaddle.y >= -physics.halfH + 0.2, 'Paddle Y must clamp to tunnel edge');
assert(physics.playerPaddle.vx > 0, 'Instantaneous paddle Vx must be computed');

// Test 3: Ball serve toward opponent
physics.updatePlayerPaddle(0, 0, 0.016);
physics.resetBall(false, 30);
assert(physics.ball.active === true, 'Ball must be active after serve');
assert(physics.ball.vz > 0, 'Serving to opponent should have positive Vz');
assert(physics.ball.speed === 30, 'Ball speed should match requested initial speed');

// Test 4: Aerodynamic Magnus Curve Dynamics
physics.ball.x = 0;
physics.ball.y = 0;
physics.ball.vx = 0;
physics.ball.vy = 0;
physics.ball.spinY = 2.0;
physics.update(0.05);
assert(physics.ball.vx > 0, 'Positive spinY must curve ball to the right (+X)');

physics.ball.x = 0;
physics.ball.y = 0;
physics.ball.vx = 0;
physics.ball.vy = 0;
physics.ball.spinX = 2.0;
physics.update(0.05);
assert(physics.ball.vy > 0, 'Positive spinX must curve ball upward (+Y)');

// Test 5: Wall Collision Reflection
physics.ball.x = physics.halfW - physics.ball.radius;
physics.ball.vx = 20; // moving into right wall
let wallHitDetected = false;
physics.onWallHit = (wall) => {
  if (wall === 'right') wallHitDetected = true;
};
physics.update(0.016);
assert(physics.ball.vx < 0, 'Ball must bounce off right wall with negative Vx');
assert(wallHitDetected === true, 'onWallHit callback must trigger for right wall');

// Test 6: Continuous Collision Detection (No tunneling at high speeds)
physics.ball.x = 0;
physics.ball.y = 0;
physics.ball.z = 2.0;
physics.ball.vz = -70; // Hypersonic ball moving backward into near plane
physics.playerPaddle.x = 0;
physics.playerPaddle.y = 0;
let paddleHitDetected = false;
physics.onPaddleHit = (isPlayer) => {
  if (isPlayer) paddleHitDetected = true;
};
physics.update(0.05); // Ball moves 3.5 units in one frame, crossing Z=0
assert(paddleHitDetected === true, 'Fast moving ball must be intercepted by player paddle (no tunneling)');
assert(physics.ball.vz > 0, 'Ball must rebound forward after paddle hit');

// Test 7: AI Trajectory Prediction
physics.ball.x = -2;
physics.ball.y = 1;
physics.ball.z = 10;
physics.ball.vx = 2;
physics.ball.vy = -1;
physics.ball.vz = 40;
physics.ball.spinX = 0;
physics.ball.spinY = 1.5;

const prediction = physics.predictTrajectory(physics.tunnelDepth);
assert(prediction !== null, 'Trajectory prediction should succeed');
assert(prediction.finalPos.z === physics.tunnelDepth, 'Prediction target Z should reach tunnel depth');
assert(prediction.points.length > 5, 'Trajectory points array should be populated');

// Test 8: AI Agent progression tiers
const ai = new AIAgent(physics);
assert(ai.level === 1, 'Initial AI level must be 1');
assert(ai.getTierInfo().name === 'SPARK-01', 'Level 1 AI is SPARK-01');

ai.setLevel(5);
assert(ai.level === 5, 'AI level set to 5');
assert(ai.getTierInfo().name === 'CYBER-VIPER', 'Level 5 AI is CYBER-VIPER');

ai.setLevel(10);
assert(ai.level === 10, 'AI level set to 10');
assert(ai.getTierInfo().name === 'OMEGA-SINGULARITY', 'Level 10 AI is OMEGA-SINGULARITY');

console.log('--- All 8 Physics & AI Tests Successfully Passed! ---');
