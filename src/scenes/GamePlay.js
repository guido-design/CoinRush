import GameState from '../GameState.js';

// Tuned coin economy — first upgrade (~400c) reachable in ~6 runs
function coinsForDistance(meters) {
  if (meters <= 100) return Math.floor(meters / 3);
  if (meters <= 500) return Math.floor(100 / 3) + Math.floor((meters - 100) / 2);
  if (meters <= 1000) return Math.floor(100 / 3) + Math.floor(400 / 2) + (meters - 500);
  return Math.floor(100 / 3) + Math.floor(400 / 2) + 500 + Math.floor((meters - 1000) * 1.5);
}

const GROUND_Y      = 390;
const PLAYER_START_X = 120;
const WORLD_SCALE   = 5;       // px per meter
const BASE_SPEED    = 280;
const SPEED_INC     = 10;      // px/s per 100m
const JUMP_VEL      = -680;
const MAGNET_RADIUS = 130;

// Zone thresholds: [minMeters, bgColor, accentColor, label]
const ZONES = [
  [0,    0x1a1a2e, 0x4a4e69, 'ZONE 1: CITY'],
  [250,  0x0d1b2a, 0x1b4332, 'ZONE 2: JUNGLE'],
  [500,  0x2d1b00, 0x7f3f00, 'ZONE 3: DESERT'],
  [1000, 0x0a0010, 0x6a0dad, 'ZONE 4: SPACE'],
];

function getZone(m) {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    if (m >= ZONES[i][0]) return ZONES[i];
  }
  return ZONES[0];
}

export default class GamePlay extends Phaser.Scene {
  constructor() { super('GamePlay'); }

  create() {
    this.upgrades    = { ...GameState.upgrades };
    this.distanceM   = 0;
    this.coinsCollected = 0;
    this.runSpeed    = BASE_SPEED;
    this.shieldActive = this.upgrades.shield;
    this.maxJumps    = this.upgrades.doubleJump ? 2 : 1;
    this.jumpsLeft   = 0;
    this.alive       = true;
    this.reviveUsed  = false;
    this.currentZone = null;

    // Combo system
    this.combo       = 0;       // consecutive airborne coin pickups
    this.onGround    = false;

    this.cameras.main.setBackgroundColor(ZONES[0][1]);

    // ---- Physics groups ----
    this.platforms = this.physics.add.staticGroup();
    this.coins     = this.physics.add.group();
    this.spikes    = this.physics.add.staticGroup();

    this._generateChunk(0, 900);

    // ---- Player ----
    this.player = this.physics.add.sprite(PLAYER_START_X, GROUND_Y - 32, 'player');
    this.player.setCollideWorldBounds(false);
    this.player.body.setSize(28, 28).setOffset(2, 2);

    // ---- Particles ----
    this.coinParticles = this.add.particles(0, 0, 'coin', {
      speed: { min: 80, max: 180 },
      scale: { start: 0.6, end: 0 },
      lifespan: 350,
      quantity: 6,
      emitting: false,
    });
    this.deathParticles = this.add.particles(0, 0, 'player', {
      speed: { min: 100, max: 300 },
      scale: { start: 0.5, end: 0 },
      lifespan: 600,
      quantity: 12,
      tint: 0xff4444,
      emitting: false,
    });

    // ---- Colliders ----
    this.physics.add.collider(this.player, this.platforms, () => {
      if (!this.onGround) {
        // Land — squash tween
        this.tweens.add({ targets: this.player, scaleX: 1.4, scaleY: 0.7, duration: 60, yoyo: true });
        this.combo = 0; // reset combo on landing
      }
      this.jumpsLeft = this.maxJumps;
      this.onGround  = true;
    });
    this.physics.add.overlap(this.player, this.coins,  this._collectCoin, null, this);
    this.physics.add.overlap(this.player, this.spikes, this._hitSpike,    null, this);

    // ---- Camera ----
    this.cameras.main.startFollow(this.player, true, 1, 0);
    this.cameras.main.setFollowOffset(-200, 0);

    // ---- Input ----
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', this._doJump, this);

    // ---- HUD ----
    this.hudDist = this.add.text(16, 16, '0m', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
    }).setScrollFactor(0).setDepth(10);

    this.hudCoins = this.add.text(16, 42, 'Coins: 0', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffd700',
    }).setScrollFactor(0).setDepth(10);

    this.hudShield = this.add.text(16, 68, this.shieldActive ? '🛡 SHIELD' : '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00ffff',
    }).setScrollFactor(0).setDepth(10);

    this.hudCombo = this.add.text(400, 16, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ff9900',
      stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(10).setOrigin(0.5, 0);

    this.zoneLabel = this.add.text(784, 16, 'ZONE 1: CITY', {
      fontSize: '14px', fontFamily: 'monospace', color: '#556677',
    }).setScrollFactor(0).setDepth(10).setOrigin(1, 0);

    // First run bonus
    if (GameState.totalCoins === 0 && !GameState.upgrades.doubleJump) {
      this._showPopup('FIRST RUN BONUS!', '#ffd700');
      this.time.delayedCall(800, () => {
        this.coinsCollected += 50;
        this.hudCoins.setText(`Coins: ${this.coinsCollected}`);
      });
    }
  }

  update(time, delta) {
    if (!this.alive) return;

    // Track ground state
    this.onGround = this.player.body.blocked.down;

    // Jump input via keyboard
    if (Phaser.Input.Keyboard.JustDown(this.jumpKey)) this._doJump();

    // If in air, combo can build
    if (!this.onGround && this.combo > 0) {
      // combo persists while airborne — resets on land (handled in collider)
    }

    // Auto-run
    this.player.setVelocityX(this.runSpeed);

    // Distance
    const prevM = this.distanceM;
    this.distanceM = Math.max(0, Math.floor((this.player.x - PLAYER_START_X) / WORLD_SCALE));

    // Speed ramp
    this.runSpeed = BASE_SPEED + Math.floor(this.distanceM / 100) * SPEED_INC;

    // Distance coins
    const newCoins = coinsForDistance(this.distanceM) - coinsForDistance(prevM);
    if (newCoins > 0) {
      this.coinsCollected += newCoins;
      this._refreshCoinHUD();
    }

    // Zone check
    const zone = getZone(this.distanceM);
    if (zone !== this.currentZone) {
      this.currentZone = zone;
      this.cameras.main.setBackgroundColor(zone[1]);
      this.zoneLabel.setText(zone[3]);
      this._showPopup(zone[3], '#ffffff');
    }

    // HUD distance
    this.hudDist.setText(`${this.distanceM}m`);

    // Magnet
    if (this.upgrades.magnet) {
      this.coins.getChildren().forEach(c => {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) < MAGNET_RADIUS) {
          this.physics.moveToObject(c, this.player, 320);
        }
      });
    }

    // Near-miss spike detection
    this._checkNearMiss();

    // Generate world ahead
    if (this.player.x + 1200 > this.worldX) {
      this._generateChunk(this.worldX, this.worldX + 600);
    }

    this._cull();

    // Fall death
    if (this.player.y > 520) this._die();
  }

  _doJump() {
    if (!this.alive) return;
    if (this.jumpsLeft > 0) {
      this.player.setVelocityY(JUMP_VEL);
      this.jumpsLeft--;
      this.onGround = false;
      // Stretch tween on jump
      this.tweens.add({ targets: this.player, scaleX: 0.7, scaleY: 1.4, duration: 80, yoyo: true });
    }
  }

  _collectCoin(player, coin) {
    const worth = coin.getData('worth') || 1;

    // Combo: only builds while airborne
    if (!this.onGround) {
      this.combo++;
    } else {
      this.combo = 0;
    }

    const multiplier = this.combo >= 5 ? 3 : this.combo >= 3 ? 2 : 1;
    const earned = worth * multiplier;

    this.coinsCollected += earned;
    this._refreshCoinHUD();

    // Particle burst at coin position
    this.coinParticles.emitParticleAt(coin.x, coin.y);

    // Combo HUD
    if (this.combo >= 3) {
      this.hudCombo.setText(`x${multiplier} COMBO!`);
      this.tweens.add({ targets: this.hudCombo, scaleX: 1.2, scaleY: 1.2, yoyo: true, duration: 100 });
      this.time.delayedCall(800, () => { if (this.combo < 3) this.hudCombo.setText(''); });
    } else {
      this.hudCombo.setText('');
    }

    // Floating +N text
    this._floatText(coin.x, coin.y - 20, `+${earned}`, multiplier > 1 ? '#ff9900' : '#ffd700');

    coin.destroy();
  }

  _hitSpike(player, spike) {
    if (!this.alive) return;
    if (this.shieldActive) {
      this.shieldActive = false;
      this.hudShield.setText('');
      spike.destroy();
      this.cameras.main.shake(200, 0.008);
      this.tweens.add({ targets: this.player, alpha: 0.2, yoyo: true, repeat: 3, duration: 80 });
      this._showPopup('SHIELD BROKEN!', '#00ffff');
      return;
    }
    this._die();
  }

  _die() {
    if (!this.alive) return;
    this.alive = false;
    this.player.setVelocity(0, 0);
    this.player.setVisible(false);

    this.deathParticles.emitParticleAt(this.player.x, this.player.y);
    this.cameras.main.shake(400, 0.02);

    GameState.addCoins(this.coinsCollected);
    GameState.updateBest(this.distanceM);

    // Revive prompt (once per run, costs 50 coins)
    const canRevive = !this.reviveUsed && GameState.totalCoins >= 50;
    if (canRevive) {
      this._showRevivePrompt();
    } else {
      this.time.delayedCall(900, () => {
        this.scene.start('GameOver', { distance: this.distanceM, coinsEarned: this.coinsCollected });
      });
    }
  }

  _showRevivePrompt() {
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setScrollFactor(0).setDepth(20);
    this.add.text(width / 2, height / 2 - 70, 'CONTINUE?', {
      fontSize: '36px', fontFamily: 'monospace', color: '#ffffff',
    }).setScrollFactor(0).setDepth(21).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 28, `Spend 50 coins to revive\n(You have ${GameState.totalCoins})`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaaaaa', align: 'center',
    }).setScrollFactor(0).setDepth(21).setOrigin(0.5);

    // Countdown bar
    const barBg = this.add.rectangle(width / 2, height / 2 + 20, 300, 12, 0x333333).setScrollFactor(0).setDepth(21);
    const bar   = this.add.rectangle(width / 2 - 150, height / 2 + 20, 300, 12, 0x00cc44).setScrollFactor(0).setDepth(22).setOrigin(0, 0.5);
    this.tweens.add({ targets: bar, scaleX: 0, duration: 4000, ease: 'Linear', onComplete: () => {
      this.scene.start('GameOver', { distance: this.distanceM, coinsEarned: this.coinsCollected });
    }});

    // Revive button
    const yesBtn = this.add.rectangle(width / 2 - 80, height / 2 + 65, 140, 46, 0x22cc44).setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });
    this.add.text(width / 2 - 80, height / 2 + 65, 'REVIVE', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
    }).setScrollFactor(0).setDepth(22).setOrigin(0.5);
    yesBtn.on('pointerdown', () => {
      if (GameState.spendCoins(50)) {
        this.reviveUsed = true;
        this.tweens.killAll();
        overlay.destroy();
        this._revive();
      }
    });

    // Skip button
    const noBtn = this.add.rectangle(width / 2 + 80, height / 2 + 65, 140, 46, 0x884444).setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });
    this.add.text(width / 2 + 80, height / 2 + 65, 'SKIP', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
    }).setScrollFactor(0).setDepth(22).setOrigin(0.5);
    noBtn.on('pointerdown', () => {
      this.tweens.killAll();
      this.scene.start('GameOver', { distance: this.distanceM, coinsEarned: this.coinsCollected });
    });
  }

  _revive() {
    this.alive = true;
    this.shieldActive = true; // brief shield after revive
    this.hudShield.setText('🛡 SHIELD');
    this.player.setVisible(true);
    this.player.setTint(0xffffff);
    this.player.setPosition(this.player.x, GROUND_Y - 60);
    this.player.setVelocity(0, 0);
    this.jumpsLeft = this.maxJumps;
    this._showPopup('REVIVED!', '#22cc44');
  }

  _checkNearMiss() {
    this.spikes.getChildren().forEach(spike => {
      const dx = Math.abs(this.player.x - spike.x);
      const dy = Math.abs(this.player.y - spike.y);
      if (!spike.getData('nearMissed') && dx < 50 && dy < 60 && this.player.y < spike.y) {
        spike.setData('nearMissed', true);
        const bonus = 3;
        this.coinsCollected += bonus;
        this._refreshCoinHUD();
        this._floatText(this.player.x, this.player.y - 40, `CLOSE! +${bonus}`, '#ff6600');
      }
    });
  }

  _refreshCoinHUD() {
    this.hudCoins.setText(`Coins: ${this.coinsCollected}`);
    this.tweens.add({ targets: this.hudCoins, scaleX: 1.15, scaleY: 1.15, yoyo: true, duration: 60 });
  }

  _floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, {
      fontSize: '16px', fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: 3,
    }).setDepth(15).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => t.destroy() });
  }

  _showPopup(msg, color) {
    const { width, height } = this.scale;
    const t = this.add.text(width / 2, height / 2 - 30, msg, {
      fontSize: '28px', fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: 4,
    }).setScrollFactor(0).setDepth(15).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1, y: height / 2 - 60,
      duration: 300, ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, delay: 800, duration: 400, onComplete: () => t.destroy() });
      },
    });
  }

  // ---- Procedural world generation ----
  _generateChunk(fromX, toX) {
    let x = Math.max(fromX, 0);
    const TILE = 64;
    const GY   = GROUND_Y;

    if (fromX === 0) {
      for (let tx = 0; tx < 800; tx += TILE) {
        const t = this.platforms.create(tx + TILE / 2, GY + 16, 'ground');
        t.refreshBody();
      }
      this._spawnCoins(300, GY - 60, 5); // generous coins at start
      this.worldX = 800;
      x = 800;
    }

    // Difficulty scales with distance
    const difficulty = Math.min(this.distanceM / 1000, 1); // 0→1
    const gapChance   = 0.22 + difficulty * 0.20;
    const spikeChance = 0.20 + difficulty * 0.25;
    const elevChance  = 0.18 + difficulty * 0.10;

    while (x < toX) {
      const roll = Math.random();

      if (roll < gapChance) {
        // Gap — wider at higher difficulty
        const maxGap = Math.floor(2 + difficulty * 2);
        x += Phaser.Math.Between(1, maxGap) * TILE;

      } else if (roll < gapChance + elevChance) {
        // Elevated platform with coin trail leading to it
        const len  = Phaser.Math.Between(2, 5);
        const elevY = GY - Phaser.Math.Between(80, 150);
        for (let i = 0; i < len; i++) {
          const t = this.platforms.create(x + TILE / 2, elevY + 16, 'ground');
          t.refreshBody();
          x += TILE;
        }
        this._spawnCoins(x - len * TILE, elevY - 50, Phaser.Math.Between(3, 6));
        if (Math.random() < 0.12) this._spawnGem(x - TILE, elevY - 80);

      } else {
        // Flat ground segment
        const len = Phaser.Math.Between(3, 8);
        for (let i = 0; i < len; i++) {
          const t = this.platforms.create(x + TILE / 2, GY + 16, 'ground');
          t.refreshBody();
          x += TILE;
        }
        if (Math.random() < 0.65) {
          this._spawnCoins(x - len * TILE / 2, GY - 60, Phaser.Math.Between(2, 5));
        }
        if (Math.random() < 0.08) this._spawnGem(x - TILE * 2, GY - 80);
        if (Math.random() < spikeChance && len >= 4) {
          const sx = x - Math.floor(len / 2) * TILE;
          const spike = this.spikes.create(sx, GY - 16, 'spike');
          spike.refreshBody();
          spike.body.setSize(24, 24).setOffset(4, 8);
        }
      }
    }

    this.worldX = Math.max(this.worldX, x);
  }

  _spawnCoins(cx, cy, count) {
    for (let i = 0; i < count; i++) {
      const c = this.coins.create(cx + i * 30, cy, 'coin');
      c.setData('worth', 1);
      c.body.setAllowGravity(false);
      c.body.setImmovable(true);
    }
  }

  _spawnGem(cx, cy) {
    const c = this.coins.create(cx, cy, 'gem');
    c.setData('worth', 10);
    c.body.setAllowGravity(false);
    c.body.setImmovable(true);
    this.tweens.add({ targets: c, y: cy - 12, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
  }

  _cull() {
    const cullX = this.player.x - 900;
    this.platforms.getChildren().forEach(p => { if (p.x < cullX) p.destroy(); });
    this.coins.getChildren().forEach(c => { if (c.x < cullX) c.destroy(); });
    this.spikes.getChildren().forEach(s => { if (s.x < cullX) s.destroy(); });
  }
}
