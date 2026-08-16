import Phaser from "phaser";
import { PlayScene } from "./scenes/PlayScene";
import { promptName } from "./ui/namePrompt";
import { getGameInfo, leaveGame } from "./network";

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

const game = new Phaser.Game(config);

async function beginRound(): Promise<void> {
  const gameInfo = await getGameInfo();
  const playScene = game.scene.getScene("play") as PlayScene;
  playScene.setWorldInfo(gameInfo.SERVER_SEED, gameInfo.SERVER_START_TIME);

  await promptName();
  playScene.startPlaying(handleDeath);
}

function handleDeath(): void {
  leaveGame();
  void beginRound();
}

beginRound();