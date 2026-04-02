import GameState from '../GameState.js';

export default class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) {
    this.distance = data.distance || 0;
    this.coinsEarned = data.coinsEarned || 0;
  }

  create() {
    const { width, height } = this.scale;

    // Dim overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    this.add.text(width / 2, 90, 'GAME OVER', {
      fontSize: '52px',
      fontFamily: 'monospace',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, 175, `Distance: ${this.distance}m`, {
      fontSize: '26px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, 215, `Coins earned: +${this.coinsEarned}`, {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5);

    this.add.text(width / 2, 252, `Total coins: ${GameState.totalCoins}`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    this.add.text(width / 2, 282, `Best: ${GameState.bestDistance}m`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    this._makeButton(width / 2, 345, 'PLAY AGAIN', 0x22cc44, () => {
      this.scene.start('GamePlay');
    });

    this._makeButton(width / 2, 405, 'SHOP', 0x4488ff, () => {
      this.scene.start('Shop');
    });
  }

  _makeButton(x, y, label, color, callback) {
    const btn = this.add.rectangle(x, y, 220, 48, color).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setAlpha(0.8));
    btn.on('pointerout', () => btn.setAlpha(1));
    btn.on('pointerdown', callback);
  }
}
