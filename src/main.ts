import Phaser from "phaser";
import { PlayScene } from "./scenes/PlayScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 650,
  height: 720,
  backgroundColor: "#1a1a2e",

  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0},
      debug: false,
    }
  },

  scene: [PlayScene],
};

new Phaser.Game(config);