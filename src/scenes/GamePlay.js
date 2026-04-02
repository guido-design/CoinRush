import GameState from '../GameState.js';

// Distance-based coin rate (meters per coin)
function coinsForDistance(meters) {
  if (meters <= 100) return Math.floor(meters / 10);
  if (meters <= 500) return Math.floor(100 / 10) + Math.floor((meters - 100) / 5);
  if (meters <= 1000) return Math.floor(100 / 10) + Math.floor(400 / 5) + Math.floor((meters - 500) / 3);
  return Math.floor(100 / 10) + Math.floor(400 / 5) + Math.floor(500 / 3) + (meters - 1000);
}

const GROUND_Y = 390;         // y position of ground surface
const PLAYER_START_X = 120;
const WORLD_SCALE = 5;        // pixels per meter
const BASE_SPEED = 280;       // px/s starting speed
const SPEED_INCREMENT = 8;    // px/s increase per 100m
const JUMP_VELOCITY = -680;
const MAGNET_RADIUS = 120;

export default class GamePlay extends Phaser.Scene {
  constructor() { super('GamePlay'); }

  create() {
    this.upgrades = { ...GameState.upgrades };

    // Camera world — wide scrolling world
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // ---- Physics groups ----
    this.platforms = this.physics.add.staticGroup();
    this.coins = this.physics.add.group();
    this.spikes = this.physics.add.staticGroup();

    // ---- World generation state ----
    this.worldX = 0;          // rightmost generated x
    this.distanceM = 0;
    this.coinsCollected = 0;
    this.runSpeed = BASE_SPEED;
    this.shieldActive = this.upgrades.shield;
    this.jumpsLeft = 0;
    this.maxJumps = this.upgrades.doubleJump ? 2 : 1;
    this.alive = true;

    // Seed ground so camera has something on spawn
    this._generateChunk(0, 900);

    // ---- Player ----
    this.player = this.physics.add.sprite(PLAYER_START_X, GROUND_Y - 32, 'player');
    this.player.setCollideWorldBounds(false);
    this.player.body.setSize(28, 28).setOffset(2, 2);

    // ---- Colliders ----
    this.physics.add.collider(this.player, this.platforms, () => {
      this.jumpsLeft = this.maxJumps;
    });
    this.physics.add.overlap(this.player, this.coins, this._collectCoin, null, this);
    this.physics.add.overlap(this.player, this.spikes, this._hitSpike, null, this);

    // ---- Camera follows player horizontally ----
    this.cameras.main.startFollow(this.player, true, 1, 0);
    this.cameras.main.setFollowOffset(-200, 0);

    // ---- Input ----
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', this._doJump, this);

    // ---- HUD (fixed to camera) ----
    const cam = this.cameras.main;
    this.hudDist = this.add.text(16, 16, '0m', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
    }).setScrollFactor(0).setDepth(10);

    this.hudCoins = this.add.text(16, 42, 'Coins: 0', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffd700',
    }).setScrollFactor(0).setDepth(10);

    // Shield indicator
    this.hudShield = this.add.text(16, 68, this.shieldActive ? 'SHIELD' : '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00ffff',
    }).setScrollFactor(0).setDepth(10);

    // ---- Zone label ----
    this.add.text(400, 20, 'ZONE 1: CITY', {
      fontSize: '16px', fontFamily: 'monospace', color: '#555577',
    }).setScrollFactor(0).setDepth(10).setOrigin(0.5, 0);
  }

  update(time, delta) {
    if (!this.alive) return;

    const dt = delta / 1000;

    // Auto-run
    this.player.setVelocityX(this.runSpeed);

    // Jump input
    if (Phaser.Input.Keyboard.JustDown(this.jumpKey)) this._doJump();

    // Distance tracking
    const prevM = this.distanceM;
    this.distanceM = Math.floor((this.player.x - PLAYER_START_X) / WORLD_SCALE);
    if (this.distanceM < 0) this.distanceM = 0;

    // Speed scaling per 100m
    this.runSpeed = BASE_SPEED + Math.floor(this.distanceM / 100) * SPEED_INCREMENT;

    // HUD update
    this.hudDist.setText(`${this.distanceM}m`);

    // Award distance coins
    const newCoins = coinsForDistance(this.distanceM) - coinsForDistance(prevM);
    if (newCoins > 0) {
      this.coinsCollected += newCoins;
      this.hudCoins.setText(`Coins: ${this.coinsCollected}`);
    }

    // Magnet: pull nearby coins
    if (this.upgrades.magnet) {
      this.coins.getChildren().forEach(c => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
        if (dist < MAGNET_RADIUS) {
          this.physics.moveToObject(c, this.player, 300);
        }
      });
    }

    // Procedural generation: keep world ahead of player
    const genAhead = this.player.x + 1200;
    if (genAhead > this.worldX) {
      this._generateChunk(this.worldX, this.worldX + 600);
    }

    // Cull objects far behind player
    this._cull();

    // Fall-death
    if (this.player.y > 520) this._die();
  }

  // ---- Jump ----
  _doJump() {
    if (!this.alive) return;
    if (this.jumpsLeft > 0) {
      this.player.setVelocityY(JUMP_VELOCITY);
      this.jumpsLeft--;
    }
  }

  // ---- Coin collection ----
  _collectCoin(player, coin) {
    const worth = coin.getData('worth') || 1;
    this.coinsCollected += worth;
    this.hudCoins.setText(`Coins: ${this.coinsCollected}`);
    // Small flash
    this.tweens.add({ targets: this.hudCoins, alpha: 0.3, yoyo: true, duration: 80 });
    coin.destroy();
  }

  // ---- Spike hit ----
  _hitSpike(player, spike) {
    if (!this.alive) return;
    if (this.shieldActive) {
      this.shieldActive = false;
      this.hudShield.setText('');
      spike.destroy();
      // Flash player
      this.tweens.add({ targets: this.player, alpha: 0.2, yoyo: true, repeat: 3, duration: 80 });
      return;
    }
    this._die();
  }

  _die() {
    if (!this.alive) return;
    this.alive = false;
    this.player.setVelocity(0, 0);
    this.player.setTint(0xff0000);

    // Save state
    const earned = coinsForDistance(this.distanceM) + this.coinsCollected;
    GameState.addCoins(this.coinsCollected);
    GameState.updateBest(this.distanceM);

    this.time.delayedCall(900, () => {
      this.scene.start('GameOver', {
        distance: this.distanceM,
        coinsEarned: this.coinsCollected,
      });
    });
  }

  // ---- Procedural world generation ----
  _generateChunk(fromX, toX) {
    let x = Math.max(fromX, 0);
    const TILE = 64;
    const GY = GROUND_Y;

    // Always place ground at the very start
    if (fromX === 0) {
      for (let tx = 0; tx < 800; tx += TILE) {
        const t = this.platforms.create(tx + TILE / 2, GY + 16, 'ground');
        t.refreshBody();
      }
      this.worldX = 800;
      x = 800;
    }

    while (x < toX) {
      const roll = Math.random();

      if (roll < 0.55) {
        // Standard flat platform segment (3–8 tiles)
        const len = Phaser.Math.Between(3, 8);
        for (let i = 0; i < len; i++) {
          const t = this.platforms.create(x + TILE / 2, GY + 16, 'ground');
          t.refreshBody();
          x += TILE;
        }
        // Maybe drop a coin on this segment
        if (Math.random() < 0.5) {
          this._spawnCoins(x - len * TILE / 2, GY - 60, Phaser.Math.Between(1, 3));
        }
        // Rarely drop a gem
        if (Math.random() < 0.06) {
          this._spawnGem(x - TILE, GY - 80);
        }
        // Maybe add a spike mid-segment
        if (Math.random() < 0.25 && len >= 4) {
          const sx = x - Math.floor(len / 2) * TILE;
          const spike = this.spikes.create(sx, GY - 16, 'spike');
          spike.refreshBody();
          spike.body.setSize(24, 24).setOffset(4, 8);
        }
      } else if (roll < 0.8) {
        // Gap (1–3 tiles wide)
        x += Phaser.Math.Between(1, 3) * TILE;
      } else {
        // Elevated platform
        const len = Phaser.Math.Between(2, 5);
        const elevY = GY - Phaser.Math.Between(80, 140);
        for (let i = 0; i < len; i++) {
          const t = this.platforms.create(x + TILE / 2, elevY + 16, 'ground');
          t.refreshBody();
          x += TILE;
        }
        this._spawnCoins(x - len * TILE / 2, elevY - 50, Phaser.Math.Between(2, 4));
      }
    }

    this.worldX = Math.max(this.worldX, x);
  }

  _spawnCoins(cx, cy, count) {
    for (let i = 0; i < count; i++) {
      const c = this.coins.create(cx + i * 28, cy, 'coin');
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
    // Gentle bob
    this.tweens.add({ targets: c, y: cy - 10, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
  }

  _cull() {
    const cullX = this.player.x - 900;
    this.platforms.getChildren().forEach(p => { if (p.x < cullX) p.destroy(); });
    this.coins.getChildren().forEach(c => { if (c.x < cullX) c.destroy(); });
    this.spikes.getChildren().forEach(s => { if (s.x < cullX) s.destroy(); });
  }
}
