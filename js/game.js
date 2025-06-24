const helpMessage = "[WASD/HJKL] Move [P] Pause/Resume [R] Restart";
const validKeys = new Set(
  Array.from([
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

class InputManager {
  constructor(game) {
    this.game = game;
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      if (!validKeys.has(e.key)) return;
      this.game.enqueuePressedKey(e.key);
    });
  }
}

class Game {
  constructor() {
    this.input = new InputManager(this);
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.gridSize = 20;
    this.tileCount = this.canvas.width / this.gridSize;

    this.reset();
  }

  enqueuePressedKey(key) {
    this.keysQueue.unshift(key);
  }

  gameLoop(currentTime) {
    if (!this.started) return;

    const deltaTime = currentTime - this.lastTime;

    if (deltaTime < this.speed) {
      requestAnimationFrame(this.gameLoop.bind(this));
      return;
    }

    this.lastTime = currentTime;
    this.update();
    this.render();

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  reset() {
    this.keysQueue = [];

    this.message = new Message(
      this,
      document.getElementById("message"),
      helpMessage,
    );
    this.snake = new Snake(this);
    this.food = new Food(this);
    this.specialFood = new SpecialFood(this, 1, 2000);

    this.entities = [this.message, this.snake, this.food, this.specialFood];

    this.score = 0;
    this.isOver = false;
    this.started = false;
    this.isPaused = false;
    this.speed = 100;
    this.lastTime = 0;

    this.started = true;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  start() {
    this.started = true;
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  stop() {
    this.started = false;
  }

  checkGameOver() {
    return this.snake.isSelfTouching();
  }

  update() {
    // Update score
    this.score = this.food.eaten * 10 + this.specialFood.eaten * 50;

    // Check game over
    if (this.checkGameOver()) {
      this.isOver = true;
      this.isPaused = true;
      this.message.set(`Game Over! Score: ${this.score}. Press R to restart.`);
    }

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
      if (!this.started && validKeys.has(key)) {
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
          this.snake.right();
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

  update() {}
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

  update() {
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

    const startDir = Math.floor(Math.random() * this.validDirections.length);

    this.currentDirection.dx = this.validDirections[startDir][0];
    this.currentDirection.dy = this.validDirections[startDir][1];

    // Clear and reset the direction queue
    this.directionQueue.length = 0;
    this.directionQueue.push({
      dx: this.validDirections[startDir][0],
      dy: this.validDirections[startDir][1],
    });

    // Clean up the snake.
    while (this.segments.length > 0) {
      this.segments.pop();
    }

    // Get the head randomly, but I want to avoid wrapping at the first iteration.
    let x = Math.min(
      this.game.tileCount - 4,
      Math.max(4, Math.floor(Math.random() * this.game.tileCount)),
    );
    let y = Math.min(
      this.game.tileCount - 4,
      Math.max(4, Math.floor(Math.random() * this.game.tileCount)),
    );

    // Compose the snake.
    // Push the head.
    this.segments.push({ x: x, y: y });
    for (let i = 3; i > 0; i--) {
      // Push the rest of the snake according to direction.
      this.segments.push({
        x: x + i * this.currentDirection.dx,
        y: y + i * this.currentDirection.dy,
      });
    }
  }

  isSelfTouching() {
    const head = this.segments[0];
    for (let i = 1; i < this.segments.length; i++) {
      if (head.x === this.segments[i].x && head.y === this.segments[i].y) {
        return true;
      }
    }
    return false;
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

  processDirectionChange() {
    if (this.game.isPaused) {
      this.directionQueue = [];
    }

    if (this.directionQueue.length === 0) {
      return;
    }

    const nextDir = this.directionQueue.shift();

    // Idempotent direction, skip
    if (
      nextDir.dx === this.currentDirection.dx &&
      nextDir.dy === this.currentDirection.dy
    )
      return;
    // Opposite direction, it would cause game over, skip
    if (
      nextDir.dx === -this.currentDirection.dx &&
      nextDir.dy === -this.currentDirection.dy
    )
      return;

    // Otherwise, apply the direction
    this.currentDirection.dx = nextDir.dx;
    this.currentDirection.dy = nextDir.dy;
  }

  update() {
    if (this.game.isPaused || this.game.isOver) return;

    this.processDirectionChange();

    // Process snake movement and eating
    const head = {
      x: this.segments[0].x + this.currentDirection.dx,
      y: this.segments[0].y + this.currentDirection.dy,
    };

    // Wrap around edges
    if (head.x >= this.game.tileCount) head.x = 0;
    if (head.x < 0) head.x = this.game.tileCount - 1;
    if (head.y >= this.game.tileCount) head.y = 0;
    if (head.y < 0) head.y = this.game.tileCount - 1;

    // New head
    this.segments.unshift(head);

    // Special food management.
    if (this.game.specialFood.active && this.game.specialFood.expiration > 0) {
      // TODO: Must be handled in the SpecialFood class
      this.game.specialFood.expiration--;

      // TODO: Must be handled in the SpecialFood class
      // Remove it from the canvas if expired
      if (this.game.specialFood.expiration <= 0) {
        this.game.specialFood.x = -1;
        this.game.specialFood.y = -1;
      }

      // Special food management.
      if (
        head.x === this.game.specialFood.x &&
        head.y === this.game.specialFood.y
      ) {
        // Remove it from the canvas if eaten
        this.game.specialFood.eat();
      }
    }

    // Normal food management.
    if (head.x === this.game.food.x && head.y === this.game.food.y) {
      // Only reset special food when normal food is eaten
      this.game.specialFood.generate();
      this.game.food.eat();
    } else {
      // If no eating, keep the snake of the same length
      this.segments.pop();
    }
  }

  render() {
    this.game.ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim();
    this.segments.forEach((segment) => {
      this.game.ctx.fillRect(
        segment.x * this.game.gridSize,
        segment.y * this.game.gridSize,
        this.game.gridSize - 2,
        this.game.gridSize - 2,
      );
    });
  }
}

class Food extends Entity {
  constructor(game) {
    super(game);
    this.x = -1;
    this.y = -1;
    this.eaten = 0;
    this.active = false;

    this.generate();
  }

  generate() {
    const x = Math.floor(Math.random() * this.game.tileCount);
    const y = Math.floor(Math.random() * this.game.tileCount);

    // TODO: Improve, using proper collision detection
    // Make sure food doesn't spawn on snake
    this.game.snake.segments.forEach((segment) => {
      if (x === segment.x && y === segment.y) {
        this.generate();
      }
    });

    this.x = x;
    this.y = y;
  }

  eat() {
    this.eaten++;
    this.active = false;
    this.generate();
  }

  update() {}

  render() {
    this.game.ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-secondary")
      .trim();
    this.game.ctx.fillRect(
      this.x * this.game.gridSize,
      this.y * this.game.gridSize,
      this.game.gridSize - 2,
      this.game.gridSize - 2,
    );
  }
}

class SpecialFood extends Entity {
  constructor(game, rate, expiration) {
    super(game);
    this.x = -1;
    this.y = -1;
    this.rate = rate;
    this.expiration = expiration;
    this.active = false;
    this.eaten = 0;
  }

  eat() {
    this.x = -1;
    this.y = -1;
    this.expiration = 0;
    this.eaten++;
  }

  // TODO: Improve, using proper collision detection
  generate() {
    if (
      // Special food already created.
      this.active ||
      // Wait at least the minimum rate to generate the first special food.
      this.game.food.eaten < this.rate ||
      // Wait the rate-th occurrence of normal food.
      this.game.food.eaten % this.rate !== 0
    )
      return;

    const x = Math.floor(Math.random() * this.game.tileCount);
    const y = Math.floor(Math.random() * this.game.tileCount);

    // Make sure food doesn't spawn on normal food
    if (x === this.game.food.x && y === this.game.food.y) {
      this.generate();
    }

    // Make sure food doesn't spawn on snake
    this.game.snake.segments.forEach((segment) => {
      if (x === segment.x && y === segment.y) {
        this.generate();
      }
    });

    this.expiration = 50;
    this.active = true;
  }

  update() {
    this.expiration--;

    if (this.active && this.expiration <= 0) {
      this.active = false;
    }

    if (this.expiration <= 0 || this.x < 0 || this.y < 0) {
      this.active = false;
      return;
    }

    this.generate();
  }

  render() {
    if (!this.active) return;

    this.game.ctx.fillStyle = "red";
    this.game.ctx.fillRect(
      this.x * this.game.gridSize,
      this.y * this.game.gridSize,
      this.game.gridSize - 2,
      this.game.gridSize - 2,
    );
  }
}

(() => {
  const game = new Game();
  game.start();
})();
