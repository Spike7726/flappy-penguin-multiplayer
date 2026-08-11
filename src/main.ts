import Phaser from "phaser";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 480,
  height: 720,
  backgroundColor: "#1a1a2e",
};

new Phaser.Game(config);