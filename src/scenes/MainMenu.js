import GameState from '../GameState.js';

export default class MainMenu extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create() {
    GameState.reload();
    const { width, height } = this.scale;

    // Background gradient feel via rects
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, 90, 'COIN RUSH', {
      fontSize: '56px',
      fontFamily: 'monospace',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Coin counter
    this.coinText = this.add.text(width / 2, 155, `Coins: ${GameState.totalCoins}`, {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Best distance
    this.add.text(width / 2, 185, `Best: ${GameState.bestDistance}m`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Play button
    this._makeButton(width / 2, 270, 'PLAY', 0x22cc44, () => {
      this.scene.start('GamePlay');
    });

    // Shop button
    this._makeButton(width / 2, 345, 'SHOP', 0x4488ff, () => {
      this.scene.start('Shop');
    });

    // Controls hint
    this.add.text(width / 2, 420, 'SPACE / TAP to jump', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);
  }

  _makeButton(x, y, label, color, callback) {
    const btn = this.add.rectangle(x, y, 220, 52, color, 1).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '26px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setAlpha(0.8));
    btn.on('pointerout', () => btn.setAlpha(1));
    btn.on('pointerdown', callback);
    return btn;
  }
}
