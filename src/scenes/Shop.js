import GameState from '../GameState.js';

const UPGRADES = [
  {
    key: 'doubleJump',
    label: 'Double Jump',
    desc: 'Unlocks a second mid-air jump',
    cost: 500,
    color: 0x9b5de5,
  },
  {
    key: 'shield',
    label: 'Shield',
    desc: 'Absorbs 1 hit before dying',
    cost: 750,
    color: 0x00b4d8,
  },
  {
    key: 'magnet',
    label: 'Coin Magnet',
    desc: 'Auto-collects nearby coins',
    cost: 400,
    color: 0xffd700,
  },
];

export default class Shop extends Phaser.Scene {
  constructor() { super('Shop'); }

  create() {
    GameState.reload();
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, 36, 'SHOP', {
      fontSize: '40px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.coinText = this.add.text(width / 2, 80, `Coins: ${GameState.totalCoins}`, {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    // Draw upgrade cards
    this.cards = [];
    UPGRADES.forEach((upg, i) => {
      this._drawCard(upg, 130 + i * 115, i);
    });

    // Back button
    this._makeButton(width / 2, 420, 'BACK', 0x555555, () => {
      this.scene.start('MainMenu');
    });
  }

  _drawCard(upg, cardY, idx) {
    const { width } = this.scale;
    const cx = width / 2;
    const owned = GameState.upgrades[upg.key];

    const cardBg = this.add.rectangle(cx, cardY, 560, 100,
      owned ? 0x224422 : 0x222244).setInteractive({ useHandCursor: !owned });

    this.add.text(cx - 260, cardY - 28, upg.label, {
      fontSize: '20px', fontFamily: 'monospace',
      color: owned ? '#44ff44' : '#ffffff',
    }).setOrigin(0, 0.5);

    this.add.text(cx - 260, cardY, upg.desc, {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0, 0.5);

    const costLabel = owned ? 'OWNED' : `${upg.cost} coins`;
    const costColor = owned ? '#44ff44' : (GameState.totalCoins >= upg.cost ? '#ffd700' : '#ff6666');

    const costText = this.add.text(cx + 260, cardY, costLabel, {
      fontSize: '18px', fontFamily: 'monospace', color: costColor,
    }).setOrigin(1, 0.5);

    if (!owned) {
      cardBg.on('pointerover', () => cardBg.setStrokeStyle(2, upg.color));
      cardBg.on('pointerout', () => cardBg.setStrokeStyle(0));
      cardBg.on('pointerdown', () => this._buy(upg));
    }

    // Store refs for refresh
    this.cards.push({ cardBg, costText, upg });
  }

  _buy(upg) {
    if (GameState.upgrades[upg.key]) return;
    if (!GameState.spendCoins(upg.cost)) {
      // Flash red — not enough coins
      this.coinText.setColor('#ff4444');
      this.time.delayedCall(400, () => this.coinText.setColor('#ffffff'));
      return;
    }
    GameState.buyUpgrade(upg.key);
    // Refresh scene
    this.scene.restart();
  }

  _makeButton(x, y, label, color, callback) {
    const btn = this.add.rectangle(x, y, 180, 44, color).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setAlpha(0.8));
    btn.on('pointerout', () => btn.setAlpha(1));
    btn.on('pointerdown', callback);
  }
}
