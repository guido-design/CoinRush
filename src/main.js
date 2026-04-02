import Boot from './scenes/Boot.js';
import MainMenu from './scenes/MainMenu.js';
import GamePlay from './scenes/GamePlay.js';
import GameOver from './scenes/GameOver.js';
import Shop from './scenes/Shop.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1200 }, debug: false },
  },
  scene: [Boot, MainMenu, GamePlay, GameOver, Shop],
};

new Phaser.Game(config);
