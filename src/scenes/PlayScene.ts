import Phaser from "phaser";

const GAP_HEIGHT = 160;
const PIPE_WIDTH = 60;
const PIPE_SPEED = -200;
const SPAWN_INTERVAL_MS = 1500;

// returns number in range [0, 1)
function seededRandom01(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class PlayScene extends Phaser.Scene {

  private penguin!: Phaser.Physics.Arcade.Sprite;
  private pipes!: Phaser.Physics.Arcade.Group;

  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;

  // temp local variables, will come from server in future
  private sessionStartTime = 0;
  private seed = Math.floor(Math.random() * 1_000_000_000);

  private lastSpawnedIndex = -1;

  constructor() {
    super("play");
  }

  create(): void {
    if (this.sessionStartTime === 0) {
      this.sessionStartTime = this.time.now;
    }

    this.penguin = this.physics.add.sprite(200, 300, "__WHITE");
    this.penguin.setDisplaySize(32, 32);
    this.penguin.setTint(0xffd23f);

    this.penguin.setGravityY(900);
    this.penguin.setCollideWorldBounds(true, 0, 0, true);

    this.input.keyboard?.on("keydown-SPACE", (event: KeyboardEvent) => {
        if (event.repeat) return;
        this.jump();
    });

    this.input.on("pointerdown", () => this.jump());

    this.physics.add.overlap(this.penguin, this.pipes, () => this.die());
    this.physics.world.on("worldbounds", (body: Phaser.Physics.Arcade.Body) => {
      if (body.gameObject === this.penguin && body.blocked.down) {
        this.die();
      }
    });

    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffffff",
    });
  }

  override update(): void {
    const elapsedMs = this.time.now - this.sessionStartTime;
    const nextIndex = Math.floor(elapsedMs / SPAWN_INTERVAL_MS);

    // spawns only the pipes from the next due index onwards
    // this prevents new players from starting directly on top of pipes
    if (nextIndex > this.lastSpawnedIndex) {
      this.spawnPipes(nextIndex);
      this.lastSpawnedIndex = nextIndex;
    }

    this.pipes.getChildren().forEach((pipe) => {
      const sprite = pipe as Phaser.Physics.Arcade.Sprite;
      if (sprite.x < -PIPE_WIDTH) {
        sprite.destroy();
        return;
      }

      const isTop = sprite.getData("isTop") as boolean | undefined;
      const alreadyScored = sprite.getData("scored") as boolean | undefined;

      if (isTop && !alreadyScored && sprite.x + PIPE_WIDTH / 2 < this.penguin.x) {
        sprite.setData("scored", true);
        this.score += 1;
        this.scoreText.setText(`Score: ${this.score}`);
      }
    });
  }

  private jump(): void {
    this.penguin.setVelocityY(-350);
  }

  private die(): void {
    this.scene.restart();
    this.score = 0;
  }

  private spawnPipes(index: number): void {
    const canvasHeight = this.scale.height;
    const canvasWidth = this.scale.width;

    const gapCenterY = 150 + seededRandom01(this.seed, index) * (canvasHeight - 300);

    const topHeight = gapCenterY - GAP_HEIGHT / 2;
    const topPipe = this.pipes.create(
      canvasWidth + PIPE_WIDTH / 2,
      topHeight / 2,
      "__WHITE"
    ) as Phaser.Physics.Arcade.Sprite;
    topPipe.setDisplaySize(PIPE_WIDTH, topHeight);
    topPipe.setTint(0x2ecc71);
    topPipe.setVelocityX(PIPE_SPEED);
    (topPipe.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    topPipe.setData("isTop", true);
    topPipe.setData("scored", false);

    const bottomHeight = canvasHeight - (gapCenterY + GAP_HEIGHT / 2);
    const bottomPipe = this.pipes.create(
      canvasWidth + PIPE_WIDTH / 2,
      canvasHeight - bottomHeight / 2,
      "__WHITE"
    ) as Phaser.Physics.Arcade.Sprite;
    bottomPipe.setDisplaySize(PIPE_WIDTH, bottomHeight);
    bottomPipe.setTint(0x2ecc71);
    bottomPipe.setVelocityX(PIPE_SPEED);
    (bottomPipe.body as Phaser.Physics.Arcade.Body).allowGravity = false;
  }
}