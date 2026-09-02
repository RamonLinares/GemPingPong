import * as THREE from 'three';

/**
 * TunnelScene: Three.js 3D WebGL Renderer for Cyberball 3D
 * Recreates the perspective tunnel, depth markers, futuristic glowing paddles,
 * dynamic ball illumination, particle shockwaves, and aesthetic themes.
 */
export class TunnelScene {
  constructor(canvasContainer, physics) {
    this.container = canvasContainer;
    this.physics = physics;

    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;

    // Camera shake & effects
    this.shakeIntensity = 0;
    this.shakeDecay = 6.0;
    this.baseCameraPos = new THREE.Vector3(0, 0, -13.5);
    this.baseFov = 65;

    // Theme definitions
    this.themes = {
      classic: {
        id: 'classic',
        name: 'Classic 2001 (Matrix Green)',
        wallColor: '#106b12',
        wireColor: '#00ff41',
        ringColor: '#00ff41',
        tickColor: '#ffffff',
        playerColor: '#2962ff',
        opponentColor: '#ff1744',
        ballColor: '#ffffff',
        trailColor: '#a7ffeb',
        bgVoidColor: '#030803',
        fogColor: '#030803',
        isDithered: true
      },
      cyberpunk: {
        id: 'cyberpunk',
        name: 'Cyberpunk Neon',
        wallColor: '#0d0d1a',
        wireColor: '#00f2fe',
        ringColor: '#ff007f',
        tickColor: '#00f2fe',
        playerColor: '#00f2fe',
        opponentColor: '#ff007f',
        ballColor: '#ffffff',
        trailColor: '#00f2fe',
        bgVoidColor: '#05030a',
        fogColor: '#05030a',
        isDithered: false
      },
      tron: {
        id: 'tron',
        name: 'Tron Wireframe',
        wallColor: '#020205',
        wireColor: '#00ffff',
        ringColor: '#00ffff',
        tickColor: '#ffffff',
        playerColor: '#00e5ff',
        opponentColor: '#ff3d00',
        ballColor: '#ffffff',
        trailColor: '#00e5ff',
        bgVoidColor: '#000000',
        fogColor: '#000000',
        isDithered: false
      },
      synthwave: {
        id: 'synthwave',
        name: 'Vaporwave Sunset',
        wallColor: '#1b092b',
        wireColor: '#ff71ce',
        ringColor: '#f368e0',
        tickColor: '#ff9ff3',
        playerColor: '#00d2d3',
        opponentColor: '#ff9f43',
        ballColor: '#feca57',
        trailColor: '#ff71ce',
        bgVoidColor: '#10051d',
        fogColor: '#10051d',
        isDithered: false
      }
    };

    this.currentTheme = this.themes.classic;

    this.initScene();
    this.createTunnel();
    this.createPaddles();
    this.createBall();
    this.createParticles();
    this.createTrajectoryLine();

    this.applyTheme('classic');

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030803, 0.008);

    this.camera = new THREE.PerspectiveCamera(this.baseFov, this.width / this.height, 0.1, 200);
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(0, 0, 40);
    // Correct horizontal perspective orientation when looking forward along +Z
    this.camera.scale.x = -1;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Ambient Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    // Ball Point Light (moves with ball and illuminates walls)
    this.ballLight = new THREE.PointLight(0xffffff, 2.8, 25, 1.2);
    this.scene.add(this.ballLight);
  }

  /**
   * Procedural dithered retro texture generation (like the 2001 classic pixel green walls)
   */
  generateMatrixTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f6e14';
    ctx.fillRect(0, 0, size, size);

    // Noise/dither pattern matching the screenshot
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 45;
      data[i] = Math.max(0, Math.min(255, 16 + noise * 0.4));     // R
      data[i + 1] = Math.max(0, Math.min(255, 110 + noise));     // G
      data[i + 2] = Math.max(0, Math.min(255, 20 + noise * 0.5)); // B
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 16);
    return texture;
  }

  generateCyberGridTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#060714';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#00f2fe33';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    ctx.fillStyle = '#ff007f15';
    ctx.fillRect(4, 4, size - 8, size - 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 16);
    return texture;
  }

  createTunnel() {
    const hw = this.physics.halfW;
    const hh = this.physics.halfH;
    const depth = this.physics.tunnelDepth;

    this.tunnelGroup = new THREE.Group();

    // Wall geometries
    const wallMatProps = {
      roughness: 0.7,
      metalness: 0.2,
      side: THREE.DoubleSide
    };
    this.wallMaterial = new THREE.MeshStandardMaterial(wallMatProps);

    // Left Wall
    const leftGeom = new THREE.PlaneGeometry(depth, hh * 2);
    this.leftWall = new THREE.Mesh(leftGeom, this.wallMaterial);
    this.leftWall.position.set(-hw, 0, depth / 2);
    this.leftWall.rotation.y = Math.PI / 2;
    this.tunnelGroup.add(this.leftWall);

    // Right Wall
    const rightGeom = new THREE.PlaneGeometry(depth, hh * 2);
    this.rightWall = new THREE.Mesh(rightGeom, this.wallMaterial);
    this.rightWall.position.set(hw, 0, depth / 2);
    this.rightWall.rotation.y = -Math.PI / 2;
    this.tunnelGroup.add(this.rightWall);

    // Floor
    const floorGeom = new THREE.PlaneGeometry(hw * 2, depth);
    this.floorWall = new THREE.Mesh(floorGeom, this.wallMaterial);
    this.floorWall.position.set(0, -hh, depth / 2);
    this.floorWall.rotation.x = -Math.PI / 2;
    this.tunnelGroup.add(this.floorWall);

    // Ceiling
    const ceilGeom = new THREE.PlaneGeometry(hw * 2, depth);
    this.ceilWall = new THREE.Mesh(ceilGeom, this.wallMaterial);
    this.ceilWall.position.set(0, hh, depth / 2);
    this.ceilWall.rotation.x = Math.PI / 2;
    this.tunnelGroup.add(this.ceilWall);

    // Far Back Wall (Abyss / Goal)
    const backGeom = new THREE.PlaneGeometry(hw * 2, hh * 2);
    this.backMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.backWall = new THREE.Mesh(backGeom, this.backMaterial);
    this.backWall.position.set(0, 0, depth);
    this.tunnelGroup.add(this.backWall);

    // 4 Corner Perspective Lines (connecting near plane to far plane)
    this.cornerLinesGroup = new THREE.Group();
    const cornerLineMat = new THREE.LineBasicMaterial({ color: 0x00ff41, linewidth: 2 });
    this.cornerLineMaterial = cornerLineMat;

    const corners = [
      [[-hw, -hh, 0], [-hw, -hh, depth]],
      [[hw, -hh, 0], [hw, -hh, depth]],
      [[-hw, hh, 0], [-hw, hh, depth]],
      [[hw, hh, 0], [hw, hh, depth]]
    ];

    corners.forEach(c => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...c[0]),
        new THREE.Vector3(...c[1])
      ]);
      const line = new THREE.Line(geom, cornerLineMat);
      this.cornerLinesGroup.add(line);
    });
    this.tunnelGroup.add(this.cornerLinesGroup);

    // Concentric Receding Depth Rings & Wall Hash Marks (Exact signature feature of Curveball!)
    this.ringsGroup = new THREE.Group();
    this.ringMaterials = [];
    this.tickMaterials = [];

    const ringStep = 7.5; // Rings spaced along Z
    const numRings = Math.floor(depth / ringStep);

    for (let i = 1; i <= numRings; i++) {
      const ringZ = i * ringStep;

      // Outer square wireframe ring
      const ringPoints = [
        new THREE.Vector3(-hw, -hh, ringZ),
        new THREE.Vector3(hw, -hh, ringZ),
        new THREE.Vector3(hw, hh, ringZ),
        new THREE.Vector3(-hw, hh, ringZ),
        new THREE.Vector3(-hw, -hh, ringZ)
      ];
      const ringGeom = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const ringMat = new THREE.LineBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.85 });
      this.ringMaterials.push(ringMat);
      const ringMesh = new THREE.Line(ringGeom, ringMat);
      this.ringsGroup.add(ringMesh);

      // White Hash Marks in the center of each wall (Top, Bottom, Left, Right)
      const tickMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
      this.tickMaterials.push(tickMat);
      const tickHalf = 0.8;

      // Top Wall Tick
      const topTickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-tickHalf, hh - 0.05, ringZ),
        new THREE.Vector3(tickHalf, hh - 0.05, ringZ)
      ]);
      this.ringsGroup.add(new THREE.Line(topTickGeom, tickMat));

      // Bottom Wall Tick
      const botTickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-tickHalf, -hh + 0.05, ringZ),
        new THREE.Vector3(tickHalf, -hh + 0.05, ringZ)
      ]);
      this.ringsGroup.add(new THREE.Line(botTickGeom, tickMat));

      // Left Wall Tick
      const leftTickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-hw + 0.05, -tickHalf, ringZ),
        new THREE.Vector3(-hw + 0.05, tickHalf, ringZ)
      ]);
      this.ringsGroup.add(new THREE.Line(leftTickGeom, tickMat));

      // Right Wall Tick
      const rightTickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(hw - 0.05, -tickHalf, ringZ),
        new THREE.Vector3(hw - 0.05, tickHalf, ringZ)
      ]);
      this.ringsGroup.add(new THREE.Line(rightTickGeom, tickMat));
    }
    this.tunnelGroup.add(this.ringsGroup);

    this.scene.add(this.tunnelGroup);
  }

  createPaddles() {
    // --- 1. Player Paddle (Near: Z = 0) ---
    // Dual-rail blue glowing rectangular wireframe with prominent 'X' reticle, inspired by the screenshot
    const pw = this.physics.playerPaddle.width;
    const ph = this.physics.playerPaddle.height;
    const halfPw = pw / 2;
    const halfPh = ph / 2;

    this.playerPaddleMesh = new THREE.Group();

    // Outer wireframe border
    const borderPoints = [
      new THREE.Vector3(-halfPw, -halfPh, 0),
      new THREE.Vector3(halfPw, -halfPh, 0),
      new THREE.Vector3(halfPw, halfPh, 0),
      new THREE.Vector3(-halfPw, halfPh, 0),
      new THREE.Vector3(-halfPw, -halfPh, 0)
    ];
    // Secondary inner wireframe border for bold thickness
    const inset = 0.09;
    const innerBorderPoints = [
      new THREE.Vector3(-halfPw + inset, -halfPh + inset, 0),
      new THREE.Vector3(halfPw - inset, -halfPh + inset, 0),
      new THREE.Vector3(halfPw - inset, halfPh - inset, 0),
      new THREE.Vector3(-halfPw + inset, halfPh - inset, 0),
      new THREE.Vector3(-halfPw + inset, -halfPh + inset, 0)
    ];

    const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const innerBorderGeom = new THREE.BufferGeometry().setFromPoints(innerBorderPoints);

    this.playerBorderMaterial = new THREE.LineBasicMaterial({ color: 0x2962ff, linewidth: 4 });
    this.playerPaddleMesh.add(new THREE.Line(borderGeom, this.playerBorderMaterial));
    this.playerPaddleMesh.add(new THREE.Line(innerBorderGeom, this.playerBorderMaterial));

    // The signature 'X' crosshair / reticle inside the player paddle (from screenshot!)
    const xSizeW = halfPw * 0.55;
    const xSizeH = halfPh * 0.55;
    const xPts1 = [new THREE.Vector3(-xSizeW, -xSizeH, 0), new THREE.Vector3(xSizeW, xSizeH, 0)];
    const xPts2 = [new THREE.Vector3(-xSizeW, xSizeH, 0), new THREE.Vector3(xSizeW, -xSizeH, 0)];
    // Double lines for reticle thickness
    const xPts1b = [new THREE.Vector3(-xSizeW + 0.04, -xSizeH, 0), new THREE.Vector3(xSizeW + 0.04, xSizeH, 0)];
    const xPts2b = [new THREE.Vector3(-xSizeW + 0.04, xSizeH, 0), new THREE.Vector3(xSizeW + 0.04, -xSizeH, 0)];

    this.playerXMaterial = new THREE.LineBasicMaterial({ color: 0x448aff, linewidth: 3 });
    this.playerPaddleMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPts1), this.playerXMaterial));
    this.playerPaddleMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPts2), this.playerXMaterial));
    this.playerPaddleMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPts1b), this.playerXMaterial));
    this.playerPaddleMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPts2b), this.playerXMaterial));

    // Futuristic holographic pane inside paddle (semi-transparent glass)
    const glassGeom = new THREE.PlaneGeometry(pw, ph);
    this.playerGlassMaterial = new THREE.MeshBasicMaterial({
      color: 0x2962ff,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide
    });
    this.playerGlass = new THREE.Mesh(glassGeom, this.playerGlassMaterial);
    this.playerPaddleMesh.add(this.playerGlass);

    this.scene.add(this.playerPaddleMesh);

    // --- 2. Opponent Paddle (Far: Z = tunnelDepth) ---
    // Dual-rail red square/rectangular wireframe with inner glow
    const ow = this.physics.opponentPaddle.width;
    const oh = this.physics.opponentPaddle.height;
    const halfOw = ow / 2;
    const halfOh = oh / 2;

    this.opponentPaddleMesh = new THREE.Group();

    const opBorderPoints = [
      new THREE.Vector3(-halfOw, -halfOh, 0),
      new THREE.Vector3(halfOw, -halfOh, 0),
      new THREE.Vector3(halfOw, halfOh, 0),
      new THREE.Vector3(-halfOw, halfOh, 0),
      new THREE.Vector3(-halfOw, -halfOh, 0)
    ];
    const opInnerBorderPoints = [
      new THREE.Vector3(-halfOw + inset, -halfOh + inset, 0),
      new THREE.Vector3(halfOw - inset, -halfOh + inset, 0),
      new THREE.Vector3(halfOw - inset, halfOh - inset, 0),
      new THREE.Vector3(-halfOw + inset, halfOh - inset, 0),
      new THREE.Vector3(-halfOw + inset, -halfOh + inset, 0)
    ];

    this.opponentBorderMaterial = new THREE.LineBasicMaterial({ color: 0xff1744, linewidth: 4 });
    this.opponentPaddleMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(opBorderPoints), this.opponentBorderMaterial));
    this.opponentPaddleMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(opInnerBorderPoints), this.opponentBorderMaterial));

    // Inner target core box
    const coreW = halfOw * 0.55;
    const coreH = halfOh * 0.55;
    const opCorePoints = [
      new THREE.Vector3(-coreW, -coreH, 0),
      new THREE.Vector3(coreW, -coreH, 0),
      new THREE.Vector3(coreW, coreH, 0),
      new THREE.Vector3(-coreW, coreH, 0),
      new THREE.Vector3(-coreW, -coreH, 0)
    ];
    this.opponentCoreMaterial = new THREE.LineBasicMaterial({ color: 0xff5252, linewidth: 2 });
    this.opponentPaddleMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(opCorePoints), this.opponentCoreMaterial));

    // Opponent red glass pane
    const opGlassGeom = new THREE.PlaneGeometry(ow, oh);
    this.opponentGlassMaterial = new THREE.MeshBasicMaterial({
      color: 0xff1744,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    });
    this.opponentPaddleMesh.add(new THREE.Mesh(opGlassGeom, this.opponentGlassMaterial));

    this.opponentPaddleMesh.position.set(0, 0, this.physics.tunnelDepth);
    this.scene.add(this.opponentPaddleMesh);
  }

  createBall() {
    const geom = new THREE.SphereGeometry(this.physics.ball.radius, 24, 24);
    this.ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0,
      roughness: 0.1,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    this.ballMesh = new THREE.Mesh(geom, this.ballMaterial);
    this.scene.add(this.ballMesh);

    // Glowing Trail Ribbon
    const trailSegments = this.physics.maxTrailPoints;
    const trailGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(trailSegments * 3);
    trailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xa7ffeb,
      transparent: true,
      opacity: 0.85,
      linewidth: 3
    });
    this.trailMesh = new THREE.Line(trailGeom, this.trailMaterial);
    this.scene.add(this.trailMesh);

    // 4 Subtle Wall Projection Indicators (Left, Right, Floor, Ceiling) for 3D depth perception
    const projGeom = new THREE.RingGeometry(0.08, 0.32, 16);
    this.projMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff41,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });

    this.projLeft = new THREE.Mesh(projGeom, this.projMaterial);
    this.projLeft.rotation.y = Math.PI / 2;
    this.scene.add(this.projLeft);

    this.projRight = new THREE.Mesh(projGeom, this.projMaterial);
    this.projRight.rotation.y = -Math.PI / 2;
    this.scene.add(this.projRight);

    this.projBottom = new THREE.Mesh(projGeom, this.projMaterial);
    this.projBottom.rotation.x = -Math.PI / 2;
    this.scene.add(this.projBottom);

    this.projTop = new THREE.Mesh(projGeom, this.projMaterial);
    this.projTop.rotation.x = Math.PI / 2;
    this.scene.add(this.projTop);
  }

  createParticles() {
    // Wall impact shockwave ring
    this.shockwaves = [];
    for (let i = 0; i < 6; i++) {
      const ringGeom = new THREE.RingGeometry(0.1, 0.4, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ff41,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(ringGeom, ringMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.shockwaves.push({ mesh, active: false, scale: 1, maxScale: 8, opacity: 1, speed: 22 });
    }

    // Impact spark particles pool
    const sparkCount = 120;
    const sparkGeom = new THREE.BufferGeometry();
    this.sparkPositions = new Float32Array(sparkCount * 3);
    this.sparkVelocities = [];
    this.sparkAges = new Float32Array(sparkCount);
    this.sparkLifetimes = new Float32Array(sparkCount);

    for (let i = 0; i < sparkCount; i++) {
      this.sparkPositions[i * 3] = 0;
      this.sparkPositions[i * 3 + 1] = 0;
      this.sparkPositions[i * 3 + 2] = -999;
      this.sparkVelocities.push(new THREE.Vector3());
      this.sparkAges[i] = 1.0;
      this.sparkLifetimes[i] = 0.4;
    }
    sparkGeom.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));

    this.sparkMaterial = new THREE.PointsMaterial({
      color: 0x00ff41,
      size: 0.25,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.sparkPoints = new THREE.Points(sparkGeom, this.sparkMaterial);
    this.scene.add(this.sparkPoints);
  }

  createTrajectoryLine() {
    // Guide line for Practice Lab mode
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(150 * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.trajectoryMaterial = new THREE.LineDashedMaterial({
      color: 0xffff00,
      dashSize: 1,
      gapSize: 0.8,
      linewidth: 2,
      transparent: true,
      opacity: 0.75
    });
    this.trajectoryMesh = new THREE.Line(geom, this.trajectoryMaterial);
    this.trajectoryMesh.visible = false;
    this.scene.add(this.trajectoryMesh);
  }

  triggerWallShockwave(wallName, hitPos) {
    const sw = this.shockwaves.find(s => !s.active);
    if (!sw) return;

    sw.active = true;
    sw.scale = 0.5;
    sw.opacity = 1.0;
    sw.mesh.position.set(hitPos.x, hitPos.y, hitPos.z);

    if (wallName === 'left' || wallName === 'right') {
      sw.mesh.rotation.set(0, Math.PI / 2, 0);
    } else if (wallName === 'top' || wallName === 'bottom') {
      sw.mesh.rotation.set(Math.PI / 2, 0, 0);
    }

    sw.mesh.visible = true;
  }

  triggerSparks(pos, count = 20, isPlayer = true) {
    let spawned = 0;
    for (let i = 0; i < this.sparkAges.length; i++) {
      if (this.sparkAges[i] >= 1.0) {
        this.sparkPositions[i * 3] = pos.x;
        this.sparkPositions[i * 3 + 1] = pos.y;
        this.sparkPositions[i * 3 + 2] = pos.z;

        const speed = 4 + Math.random() * 8;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;

        this.sparkVelocities[i].set(
          Math.cos(theta) * Math.cos(phi) * speed,
          Math.sin(phi) * speed,
          (isPlayer ? 1 : -1) * Math.abs(Math.sin(theta)) * speed * 0.5
        );

        this.sparkAges[i] = 0.0;
        this.sparkLifetimes[i] = 0.3 + Math.random() * 0.25;

        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  triggerScreenShake(intensity = 0.35) {
    this.shakeIntensity = Math.min(1.2, this.shakeIntensity + intensity);
  }

  applyTheme(themeKey) {
    const t = this.themes[themeKey] || this.themes.classic;
    this.currentTheme = t;

    // Background & Fog
    this.scene.background = new THREE.Color(t.bgVoidColor);
    this.scene.fog.color.set(t.fogColor);

    // Wall Texture & Material
    if (t.isDithered) {
      this.wallMaterial.map = this.generateMatrixTexture();
    } else if (themeKey === 'cyberpunk') {
      this.wallMaterial.map = this.generateCyberGridTexture();
    } else {
      this.wallMaterial.map = null;
    }
    this.wallMaterial.color.set(t.wallColor);
    this.wallMaterial.needsUpdate = true;

    // Lines & Rings
    this.cornerLineMaterial.color.set(t.wireColor);
    this.ringMaterials.forEach(m => m.color.set(t.ringColor));
    this.tickMaterials.forEach(m => m.color.set(t.tickColor));

    // Player Paddle
    this.playerBorderMaterial.color.set(t.playerColor);
    this.playerXMaterial.color.set(t.playerColor);
    this.playerGlassMaterial.color.set(t.playerColor);

    // Opponent Paddle
    this.opponentBorderMaterial.color.set(t.opponentColor);
    this.opponentCoreMaterial.color.set(t.opponentColor);
    this.opponentGlassMaterial.color.set(t.opponentColor);

    // Ball & Trail
    this.ballMaterial.emissive.set(t.ballColor);
    this.ballLight.color.set(t.ballColor);
    this.trailMaterial.color.set(t.trailColor);
    this.sparkMaterial.color.set(t.wireColor);
    if (this.projMaterial) this.projMaterial.color.set(t.wireColor);
  }

  update(dt) {
    const b = this.physics.ball;
    const p = this.physics.playerPaddle;
    const op = this.physics.opponentPaddle;

    // 1. Update Paddles
    this.playerPaddleMesh.position.set(p.x, p.y, p.z);
    this.opponentPaddleMesh.position.set(op.x, op.y, op.z);

    // Subtly tilt player paddle with swing velocity
    const maxTilt = 0.25;
    this.playerPaddleMesh.rotation.y = Math.max(-maxTilt, Math.min(maxTilt, -p.vx * 0.008));
    this.playerPaddleMesh.rotation.x = Math.max(-maxTilt, Math.min(maxTilt, p.vy * 0.008));

    // 2. Update Ball, Wall Projections & Dynamic Lighting
    if (b.active) {
      this.ballMesh.visible = true;
      this.ballMesh.position.set(b.x, b.y, b.z);
      this.ballLight.position.set(b.x, b.y, b.z);

      // Update 4 Wall Projections for 3D depth perception
      const hw = this.physics.halfW;
      const hh = this.physics.halfH;
      if (this.projLeft) {
        this.projLeft.visible = true;
        this.projLeft.position.set(-hw + 0.05, b.y, b.z);
        this.projRight.visible = true;
        this.projRight.position.set(hw - 0.05, b.y, b.z);
        this.projBottom.visible = true;
        this.projBottom.position.set(b.x, -hh + 0.05, b.z);
        this.projTop.visible = true;
        this.projTop.position.set(b.x, hh - 0.05, b.z);
      }

      // Power shot pulse
      if (b.isPowerShot) {
        const pulse = 1.0 + Math.sin(performance.now() * 0.02) * 0.2;
        this.ballMesh.scale.setScalar(pulse);
        this.ballMaterial.emissiveIntensity = 2.0;
        this.ballLight.intensity = 4.5;
      } else {
        this.ballMesh.scale.setScalar(1.0);
        this.ballMaterial.emissiveIntensity = 1.0;
        this.ballLight.intensity = 2.5;
      }
    } else {
      this.ballMesh.visible = false;
      this.ballLight.intensity = 0.2;
      if (this.projLeft) {
        this.projLeft.visible = false;
        this.projRight.visible = false;
        this.projBottom.visible = false;
        this.projTop.visible = false;
      }
    }

    // 3. Update Ribbon Trail
    if (b.active && this.physics.trailHistory.length > 1) {
      this.trailMesh.visible = true;
      const positions = this.trailMesh.geometry.attributes.position.array;
      const history = this.physics.trailHistory;

      for (let i = 0; i < history.length; i++) {
        positions[i * 3] = history[i].x;
        positions[i * 3 + 1] = history[i].y;
        positions[i * 3 + 2] = history[i].z;
      }
      this.trailMesh.geometry.setDrawRange(0, history.length);
      this.trailMesh.geometry.attributes.position.needsUpdate = true;
    } else {
      this.trailMesh.visible = false;
    }

    // 4. Update Wall Shockwaves
    this.shockwaves.forEach(sw => {
      if (sw.active) {
        sw.scale += sw.speed * dt;
        sw.opacity -= dt * 2.2;
        sw.mesh.scale.set(sw.scale, sw.scale, 1);
        sw.mesh.material.opacity = Math.max(0, sw.opacity);

        if (sw.opacity <= 0 || sw.scale >= sw.maxScale) {
          sw.active = false;
          sw.mesh.visible = false;
        }
      }
    });

    // 5. Update Sparks
    let anySparkActive = false;
    for (let i = 0; i < this.sparkAges.length; i++) {
      if (this.sparkAges[i] < 1.0) {
        this.sparkAges[i] += dt / this.sparkLifetimes[i];
        if (this.sparkAges[i] < 1.0) {
          anySparkActive = true;
          this.sparkPositions[i * 3] += this.sparkVelocities[i].x * dt;
          this.sparkPositions[i * 3 + 1] += this.sparkVelocities[i].y * dt;
          this.sparkPositions[i * 3 + 2] += this.sparkVelocities[i].z * dt;
        } else {
          this.sparkPositions[i * 3 + 2] = -999;
        }
      }
    }
    if (anySparkActive) {
      this.sparkPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 6. Camera Shake & FOV Warp
    if (this.shakeIntensity > 0.001) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.set(
        this.baseCameraPos.x + shakeX,
        this.baseCameraPos.y + shakeY,
        this.baseCameraPos.z
      );
      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
    } else {
      this.camera.position.copy(this.baseCameraPos);
    }

    // Dynamic FOV based on ball speed
    if (b.active) {
      const speedRatio = b.speed / b.initialSpeed;
      const targetFov = this.baseFov + (speedRatio - 1.0) * 12;
      this.camera.fov += (targetFov - this.camera.fov) * 0.1;
      this.camera.updateProjectionMatrix();
    }
  }

  updateTrajectoryVisualizer(prediction) {
    if (!prediction || !prediction.points || prediction.points.length < 2) {
      this.trajectoryMesh.visible = false;
      return;
    }

    this.trajectoryMesh.visible = true;
    const positions = this.trajectoryMesh.geometry.attributes.position.array;
    const pts = prediction.points;

    for (let i = 0; i < pts.length; i++) {
      positions[i * 3] = pts[i].x;
      positions[i * 3 + 1] = pts[i].y;
      positions[i * 3 + 2] = pts[i].z;
    }

    this.trajectoryMesh.geometry.setDrawRange(0, pts.length);
    this.trajectoryMesh.geometry.attributes.position.needsUpdate = true;
    this.trajectoryMesh.computeLineDistances();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  /**
   * Directly unprojects 2D screen NDC coordinates to 3D world position at the paddle plane (Z = 0)
   * Ensures 100% 1:1 instantaneous responsiveness matching mouse/trackpad speed!
   */
  unprojectToPaddlePlane(normX, normY) {
    const mouse = new THREE.Vector3(normX, normY, 0.5);
    mouse.unproject(this.camera);
    const dir = mouse.sub(this.camera.position).normalize();
    if (Math.abs(dir.z) < 0.00001) return { x: 0, y: 0 };
    const t = (0 - this.camera.position.z) / dir.z;
    const hitX = this.camera.position.x + dir.x * t;
    const hitY = this.camera.position.y + dir.y * t;
    return { x: hitX, y: hitY };
  }
}
