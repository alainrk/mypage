class InputManager {
  constructor(game) {
    this.game = game;
    this.validKeys = new Set(
      ...Array.from([
        "w",
        "a",
        "s",
        "d",
        "r",
        "p",
        "W",
        "A",
        "S",
        "D",
        "R",
        "P",
        "h",
        "j",
        "k",
        "l",
        "H",
        "J",
        "K",
        "L",
      ]),
    );

    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      if (!this.validKeys.has(key)) return;
      game.enqueuePressedKey(key);
    });
  }
}

class Game {
  constructor() {
    this.input = new InputManager();
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.keysQueue = [];

    this.message = new Message(
      this,
      document.getElementsById("message"),
      "[WASD/HJKL] Move [P] Pause/Resume [R] Restart",
    );
    this.snake = new Snake(this);
    this.food = new Food(this);
    this.specialFood = new SpecialFood(this, 5, 20);

    this.entities = [this.message, this.snake, this.food, this.specialFood];

    this.gridSize = 20;
    this.tileCount = this.canvas.width / this.gridSize;

    this.score = 0;
    this.isOver = false;
    this.started = false;
    this.isPaused = false;
    this.speed = 100;
    this.lastTime = 0;
  }

  enqueuePressedKey(key) {
    this.keysQueue.unshift(key);
  }

  gameLoop(currentTime) {
    const deltaTime = (currentTime - this.lastTime) / 1000;

    // TODO: Check if this is correct, or we can update in the meantime
    if (deltaTime < gameSpeed) {
      return;
    }

    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  reset() {
    throw new Error("Not implemented.");
  }

  pause() {
    throw new Error("Not implemented.");
  }

  resume() {
    throw new Error("Not implemented.");
  }

  start() {}

  stop() {}

  update(_deltaTime) {
    while (this.keysQueue.length) {
      const key = this.keysQueue.pop().toLowerCase();

      if (this.isOver) {
        // Only restart is allowed is the game is over.
        if (key !== "r") {
          continue;
        }

        this.reset();
        continue;
      }

      if (this.isPaused) {
        if (key === "r") {
          this.reset();
        }
        if (key === "p") {
          this.resume();
        }
        // Only unpause and restart are allowed if the game is over;
        continue;
      }

      if (key === "p") {
        this.pause();
      }
      if (key === "r") {
        this.reset();
      }

      // Any valid key otherwise is ok to start the game if it's not running.
      if (!this.started && this.input.validKeys.has(key)) {
        this.started = true;
        continue;
      }

      // For any other direction key, delegate to the Snake.
      switch (key) {
        case "w":
        case "k":
          this.snake.up();
          break;
        case "s":
        case "j":
          this.snake.down();
          break;
        case "a":
        case "h":
          this.snake.left();
          break;
        case "d":
        case "l":
          this.snake.up();
          break;
      }

      continue;
    }

    for (const entity of this.entities) {
      entity.update();
    }
  }

  render() {
    this.ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-background")
      .trim();

    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const entity of this.entities) {
      entity.render();
    }
  }
}

class Entity {
  constructor(game) {
    this.game = game;
  }

  update(_deltaTime) {}
  render() {}
}

class Message extends Entity {
  constructor(game, element, text) {
    super(game);
    this.element = element;
    this.defaultText = text;
    this.text = text;
    this.display = "none";
  }

  update(_deltaTime) {
    if (this.game.isPaused) {
      this.set(this.defaultText);
    } else if (this.game.isOver) {
      this.set(`Game Over! Score: ${this.game.score}. Press R to restart.`);
    } else if (
      !this.game.isOver &&
      !this.game.isPaused &&
      this.game.score > 0
    ) {
      this.set(`Score: ${this.game.score}`);
    } else {
      this.set(this.defaultText);
    }
  }

  set(text) {
    this.text = text;
  }

  hide() {
    this.display = "none";
  }

  show() {
    this.display = "block";
  }

  render() {
    this.element.textContent = this.text;
    this.element.style.display = this.display;
  }
}

class Snake extends Entity {
  constructor(game) {
    super(game);

    this.validDirections = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];

    this.segments = [];
    this.currentDirection = {};
    this.directionQueue = [];

    this.reset();
  }

  reset() {
    const startx = Math.floor(Math.random() * this.game.tileCount);
    const starty = Math.floor(Math.random() * this.game.tileCount);

    const startDir = Math.floor(Math.random() * validDirections.length);

    this.segments = [
      { x: startx, y: starty },
      { x: startx, y: starty + 1 },
      { x: startx, y: starty + 2 },
      { x: startx, y: starty + 3 },
    ];

    this.directionQueue = [
      {
        dx: this.validDirections[startDir][0],
        dy: this.validDirections[startDir][1],
      },
    ];
  }

  up() {
    this.directionQueue.push({ dx: 0, dy: -1 });
  }
  down() {
    this.directionQueue.push({ dx: 0, dy: 1 });
  }
  right() {
    this.directionQueue.push({ dx: 1, dy: 0 });
  }
  left() {
    this.directionQueue.push({ dx: -1, dy: 0 });
  }

  update(deltaTime) {}

  render() {}
}

class Food extends Entity {
  constructor(game) {
    super(game);
    this.x = -1;
    this.y = -1;
    this.eaten = false;
  }

  update(deltaTime) {}

  render() {}
}

class SpecialFood extends Entity {
  constructor(game, rate, expiration) {
    super(game);
    this.x = -1;
    this.y = -1;
    this.rate = rate;
    this.expiration = expiration;
    this.active = false;
  }

  update(deltaTime) {}

  render() {}
}
