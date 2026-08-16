import Phaser from "phaser";
import { playerUpdate } from "../network";

const GAP_HEIGHT = 160;
const PIPE_WIDTH = 60;
const PIPE_SPEED = -200;
const SPAWN_INTERVAL_MS = 1500;
const BACKGROUND_SCROLL_SPEED = 80;

// returns number in range [0, 1)
function seededRandom01(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class PlayScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private pipes!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;

  private serverStartTime = 0;
  private seed = 0;
  private lastSpawnedIndex = -1;

  private isPlaying = false;
  private penguin: Phaser.Physics.Arcade.Sprite | null = null;
  private score = 0;
  private onDeath: (() => void) | null = null;

  constructor() {
    super("play");
  }

  create(): void {
    this.background = this.add.tileSprite(0, 0, 650, 720, "bg").setOrigin(0, 0);
    this.pipes = this.physics.add.group();
    this.scoreText = this.add.text(16, 16, "", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffffff",
    });
  }

  // sets server's seed and start time
  setWorldInfo(seed: number, serverStartTime: number): void {
    this.seed = seed;
    this.serverStartTime = serverStartTime;

    const elapsedMs = Date.now() - this.serverStartTime;
    this.lastSpawnedIndex = Math.floor(elapsedMs / SPAWN_INTERVAL_MS);
  }

  // main gameplay loop
  public startPlaying(onDeath: () => void): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.onDeath = onDeath;

    const elapsedMs = Date.now() - this.serverStartTime;
    this.lastSpawnedIndex = Math.floor(elapsedMs / SPAWN_INTERVAL_MS);

    // reset game state
    this.score = 0;
    this.scoreText.setText("0");

    // penguin sprite setup
    this.penguin = this.physics.add.sprite(200, 300, "__WHITE");
    this.penguin.setDisplaySize(32, 32);
    this.penguin.setTint(0xffd23f);

    this.penguin.setGravityY(900);
    this.penguin.setCollideWorldBounds(true, 0, 0, true);


    // jumping setup
    this.input.keyboard?.on("keydown-SPACE", this.handleSpace, this);

    this.input.on("pointerdown", this.handlePointer, this);

    // pipe spawning/collision setup
    this.physics.add.overlap(this.penguin, this.pipes, () => this.die());
    this.physics.world.on("worldbounds", this.handleWorldBounds, this);
  }

  private handleSpace = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    this.jump();
  };

  private handlePointer = (): void => {
    this.jump();
  };

  private handleWorldBounds = (body: Phaser.Physics.Arcade.Body): void => {
    if (this.penguin && body.gameObject === this.penguin && body.blocked.down) {
      this.die();
    }
  };

  override update(_time: number, delta: number): void {
    this.background.tilePositionX += (BACKGROUND_SCROLL_SPEED * delta) / 1000;

    const canvasWidth = this.scale.width;
    const elapsedMs = Date.now() - this.serverStartTime;

    // only spawn pipes while actively playing
    // (still want to see ghosts/background moving)
    if (this.isPlaying) {
      const nextIndex = Math.floor(elapsedMs / SPAWN_INTERVAL_MS);

      while (this.lastSpawnedIndex < nextIndex) {
        this.lastSpawnedIndex++;
        this.spawnPipes(this.lastSpawnedIndex, elapsedMs);
      }
    }

    // pipe position updating and scoring loop
    this.pipes.getChildren().forEach((pipe) => {
      const sprite = pipe as Phaser.Physics.Arcade.Sprite;
      if (sprite.x < -PIPE_WIDTH) {
        sprite.destroy();
        return;
      }
      if (!this.penguin) return;

      const spawnTime = sprite.getData("spawnTime") as number;
      const timeAliveMs = elapsedMs - spawnTime;

      // update pipe position based on time (prevents stacking behaviour)
      sprite.x = (canvasWidth + PIPE_WIDTH / 2) + (timeAliveMs / 1000) * PIPE_SPEED;

      const isTop = sprite.getData("isTop") as boolean | undefined;
      const alreadyScored = sprite.getData("scored") as boolean | undefined;

      // only score top pipe to prevent double counting
      if (isTop && !alreadyScored && sprite.x + PIPE_WIDTH / 2 < this.penguin.x) {
        sprite.setData("scored", true);
        this.score += 1;
        this.scoreText.setText(`${this.score}`);
      }
    });

    if (this.penguin) {
      playerUpdate(Math.round(this.penguin.y), this.score);
    }
  }

  private jump(): void {
    this.penguin?.setVelocityY(-350);
  }

  private die(): void {
    if (!this.penguin) return;
    this.isPlaying = false;

    // disable gameplay inputs
    this.input.keyboard?.off("keydown-SPACE", this.handleSpace, this);
    this.input.off("pointerdown", this.handlePointer, this);
    this.physics.world.off("worldbounds", this.handleWorldBounds, this);

    this.penguin.destroy();
    this.penguin = null;

    this.pipes.clear(true, true);

    this.score = 0;
    this.scoreText.setText("0");

    const callback = this.onDeath;
    this.onDeath = null;
    callback?.();
  }

  private spawnPipes(index: number, elapsedMs: number): void {
    const canvasHeight = this.scale.height;
    const canvasWidth = this.scale.width;

    // calculate when pipe should have spawned
    const expectedSpawnTime = index * SPAWN_INTERVAL_MS;
    const timeSinceSpawnMs = elapsedMs - expectedSpawnTime;

    // calculate expected x coord of pipe (for smoothing out when switching tabs)
    const startX = (canvasWidth + PIPE_WIDTH / 2) + (timeSinceSpawnMs / 1000) * PIPE_SPEED;

    // don't attempt to spawn pipe if it's already off screen
    if (startX < -PIPE_WIDTH) {
      return; 
    }

    const gapCenterY = 150 + seededRandom01(this.seed, index) * (canvasHeight - 300);

    const topHeight = gapCenterY - GAP_HEIGHT / 2;
    const topPipe = this.pipes.create(
      startX,
      topHeight / 2,
      "__WHITE"
    ) as Phaser.Physics.Arcade.Sprite;
    topPipe.setDisplaySize(PIPE_WIDTH, topHeight);
    topPipe.setTint(0x2ecc71);
    (topPipe.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    topPipe.setData("isTop", true);
    topPipe.setData("scored", false);
    topPipe.setData("spawnTime", expectedSpawnTime);

    const bottomHeight = canvasHeight - (gapCenterY + GAP_HEIGHT / 2);
    const bottomPipe = this.pipes.create(
      startX,
      canvasHeight - bottomHeight / 2,
      "__WHITE"
    ) as Phaser.Physics.Arcade.Sprite;
    bottomPipe.setDisplaySize(PIPE_WIDTH, bottomHeight);
    bottomPipe.setTint(0x2ecc71);
    (bottomPipe.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    bottomPipe.setData("spawnTime", expectedSpawnTime);
  }
}