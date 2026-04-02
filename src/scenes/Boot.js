// Boot scene: generate all assets programmatically (no external files needed)
export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // Player — white square
    const pg = this.make.graphics({ x: 0, y: 0, add: false });
    pg.fillStyle(0xffffff);
    pg.fillRect(0, 0, 32, 32);
    pg.generateTexture('player', 32, 32);
    pg.destroy();

    // Ground tile — gray rect
    const gg = this.make.graphics({ x: 0, y: 0, add: false });
    gg.fillStyle(0x4a4e69);
    gg.fillRect(0, 0, 64, 32);
    gg.generateTexture('ground', 64, 32);
    gg.destroy();

    // Coin — yellow circle
    const cg = this.make.graphics({ x: 0, y: 0, add: false });
    cg.fillStyle(0xffd700);
    cg.fillCircle(10, 10, 10);
    cg.generateTexture('coin', 20, 20);
    cg.destroy();

    // Spike — red triangle
    const sg = this.make.graphics({ x: 0, y: 0, add: false });
    sg.fillStyle(0xff4444);
    sg.fillTriangle(16, 0, 32, 32, 0, 32);
    sg.generateTexture('spike', 32, 32);
    sg.destroy();

    // Special coin (gem) — cyan circle
    const gemG = this.make.graphics({ x: 0, y: 0, add: false });
    gemG.fillStyle(0x00ffff);
    gemG.fillCircle(12, 12, 12);
    gemG.generateTexture('gem', 24, 24);
    gemG.destroy();

    this.scene.start('MainMenu');
  }
}
