    // Tiny autumn leaves, physics‑based, disturbed by the mouse as it passes.
    // No external assets; fine on any page; click‑through by default.

    const cfg = {
      // Counts scale with viewport and motion preference
      baseCount: 80,
      sizeMin: 8,
      sizeMax: 18,
      gravity: 22,          // px/s^2 downward
      windBase: 10,         // px/s baseline horizontal drift
      windOscAmp: 25,       // amplitude of oscillating wind
      windOscFreq: 0.07,    // Hz
      dragLin: 0.06,        // linear drag per second
      angDrag: 0.04,        // angular damping per second
      impulseRadius: 110,   // px area of mouse disturbance
      impulseStrength: 240, // impulse magnitude (scaled by cursor speed)
      swirl: 0.9,           // bit of tangential spin imparted by cursor
      respawnMargin: 24,    // px beyond edges before wrapping
      maxSpeed: 360,        // hard clamp on velocity magnitude
    };

    const DPR = Math.max(1, Math.min(2, devicePixelRatio || 1));
    const canvas = document.getElementById('autumn-leaves');
    const ctx = canvas.getContext('2d');

    // Respect prefers-reduced-motion → fewer leaves and gentler physics
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      cfg.baseCount = Math.round(cfg.baseCount * 0.35);
      cfg.gravity *= 0.5;
      cfg.windOscAmp *= 0.4;
      cfg.maxSpeed *= 0.6;
    }

    // Palette: muted autumn tones
    const colors = [
      '#c0392b', // maple red
      '#d35400', // burnt orange
      '#e67e22', // pumpkin
      '#f39c12', // amber
      '#a0522d', // sienna
      '#8b5a2b', // saddle brown
      '#b5651d', // rust
      '#aa7f39', // golden brown
    ];

    // Utility RNGs
    const rand = (a=0, b=1) => a + Math.random() * (b - a);
    const randInt = (a, b) => Math.floor(rand(a, b + 1));
    const choice = arr => arr[randInt(0, arr.length - 1)];

    // Fit canvas to viewport with DPR scaling for crispness.
    let W = 0, H = 0;
    function fit() {
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      W = Math.floor(cssW * DPR);
      H = Math.floor(cssH * DPR);
      canvas.width = W;
      canvas.height = H;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // render in CSS pixels
    }
    fit();
    addEventListener('resize', fit);

    // Pointer tracking (position + speed) for disturbance strength
    const pointer = { x: -9999, y: -9999, t: performance.now(), vx: 0, vy: 0, speed: 0 };
    let hadMove = false;
    addEventListener('pointermove', (e) => {
      const now = performance.now();
      const dt = Math.max(1, now - pointer.t) / 1000;
      const x = e.clientX, y = e.clientY;
      const vx = (x - pointer.x) / dt;
      const vy = (y - pointer.y) / dt;
      const speed = Math.hypot(vx, vy);
      pointer.x = x; pointer.y = y; pointer.vx = vx; pointer.vy = vy; pointer.speed = speed; pointer.t = now;
      hadMove = true;
    }, { passive: true });
    // Hide pointer influence if it hasn't moved in a while
    addEventListener('pointerleave', () => { pointer.x = -9999; pointer.y = -9999; pointer.speed = 0; });

    // Generate a soft, leaf‑ish polygon once per leaf (kept tiny for subtlety)
    function makeLeafPolygon() {
      const pts = [];
      const n = randInt(8, 12);        // number of lobes/points
      const bias = rand(0.9, 1.2);     // slight asymmetry
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = (0.55 + 0.45 * Math.random()) * (1 + 0.25 * Math.sin(a * 3) );
        // Slightly wider than tall to look leafier
        pts.push({ x: Math.cos(a) * r * 1.1 * bias, y: Math.sin(a) * r });
      }
      // Add a tiny stem at the bottom (two extra points)
      pts.push({ x: -0.05, y: 1.05 });
      pts.push({ x: 0.05,  y: 1.05 });
      return pts;
    }

    class Leaf {
      constructor(w, h) {
        this.size = rand(cfg.sizeMin, cfg.sizeMax);
        this.x = rand(-cfg.respawnMargin, w + cfg.respawnMargin);
        this.y = rand(-h, -cfg.respawnMargin); // start near/above top
        this.vx = rand(-10, 10);
        this.vy = rand(10, 40);
        this.angle = rand(0, Math.PI * 2);
        this.spin = rand(-1.2, 1.2);
        this.color = choice(colors);
        this.poly = makeLeafPolygon();
        this.wobble = rand(0, Math.PI * 2);
        this.wobbleSpeed = rand(0.6, 1.3);
      }
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.sin(this.wobble) * 0.15);
        const s = this.size * 0.6;
        ctx.scale(s, s * 0.9);
        ctx.beginPath();
        const p0 = this.poly[0];
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < this.poly.length; i++) ctx.lineTo(this.poly[i].x, this.poly[i].y);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.7 / Math.max(1, DPR);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.stroke();
        // central vein (subtle)
        ctx.beginPath();
        ctx.moveTo(0, -0.6);
        ctx.lineTo(0, 0.8);
        ctx.lineWidth = 0.5 / Math.max(1, DPR);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.stroke();
        ctx.restore();
      }
    }

    // Create/maintain a field of leaves sized to viewport area
    const leaves = [];
    function desiredCount() {
      const area = (innerWidth * innerHeight) / (1280 * 720); // 720p baseline
      return Math.max(12, Math.round(cfg.baseCount * area));
    }
    function seed() {
      leaves.length = 0;
      for (let i = 0; i < desiredCount(); i++) leaves.push(new Leaf(innerWidth, innerHeight));
    }
    seed();
    addEventListener('resize', () => {
      // Adjust population on resize
      const target = desiredCount();
      while (leaves.length < target) leaves.push(new Leaf(innerWidth, innerHeight));
      while (leaves.length > target) leaves.pop();
    });

    // Animation loop
    let last = performance.now();
    function tick(now) {
      const dt = Math.min(0.033, (now - last) / 1000) || 0.016; // clamp to 30ms
      last = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Time‑varying wind
      const t = now / 1000;
      const wind = cfg.windBase + cfg.windOscAmp * Math.sin(t * Math.PI * 2 * cfg.windOscFreq);

      for (const leaf of leaves) {
        // Forces
        let ax = wind * 0.15;      // convert wind drift to acceleration
        let ay = cfg.gravity;

        // Mouse disturbance (only when pointer has moved recently)
        if (hadMove) {
          const dx = leaf.x - pointer.x;
          const dy = leaf.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < cfg.impulseRadius) {
            const falloff = 1 - d / cfg.impulseRadius; // 0..1
            const impulse = (cfg.impulseStrength * falloff) * (1 + Math.min(pointer.speed, 1200) / 600);
            // Radial push + a swirl component
            const nx = dx / (d || 1);
            const ny = dy / (d || 1);
            ax += nx * impulse;
            ay += ny * impulse;
            // Tangential swirl → perpendicular vector (-ny, nx)
            ax += (-ny) * impulse * cfg.swirl * 0.4;
            ay += ( nx) * impulse * cfg.swirl * 0.4;
            leaf.spin += (Math.random() - 0.5) * 0.6 * falloff;
          }
        }

        // Integrate with simple semi‑implicit Euler & drag
        leaf.vx += ax * dt;
        leaf.vy += ay * dt;
        leaf.vx *= (1 - cfg.dragLin * dt);
        leaf.vy *= (1 - cfg.dragLin * dt);

        // Clamp
        const spd = Math.hypot(leaf.vx, leaf.vy);
        if (spd > cfg.maxSpeed) {
          const k = cfg.maxSpeed / (spd || 1);
          leaf.vx *= k; leaf.vy *= k;
        }

        leaf.x += leaf.vx * dt;
        leaf.y += leaf.vy * dt;
        leaf.spin *= (1 - cfg.angDrag * dt);
        leaf.angle += leaf.spin * dt;
        leaf.wobble += leaf.wobbleSpeed * dt;

        // Wrap/respawn when off‑screen
        const m = cfg.respawnMargin;
        if (leaf.y > innerHeight + m) {
          leaf.y = -m;
          leaf.x = rand(-m, innerWidth + m);
          leaf.vy = rand(10, 40);
          leaf.vx = rand(-10, 10);
          leaf.spin = rand(-1.2, 1.2);
        }
        if (leaf.x < -m) leaf.x = innerWidth + m;
        if (leaf.x > innerWidth + m) leaf.x = -m;

        // Draw after update for latest position
        leaf.draw(ctx);
      }

      // Decay pointer velocity influence if the mouse stops
      if (hadMove && now - pointer.t > 160) { pointer.speed *= 0.9; if (pointer.speed < 5) hadMove = false; }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
