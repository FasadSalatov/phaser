import Phaser from 'phaser';

export default {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#33A5E7',
  scale: {
    width: 432,
    height: 432,
    max: {
      width: 360,
      height: 360
    },
    min: {
      width: 280,
      height: 280
    },
    mode: Phaser.Scale.FIT,
    transparent: true,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

