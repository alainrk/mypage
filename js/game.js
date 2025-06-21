const helpMessage = "[WASD/HJKL] Move [P] Pause/Resume [R] Restart";

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
    this.gridSize = 20;
    this.tileCount = this.canvas.width / this.gridSize;
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
    this.keysQueue = [];

    this.message = new Message(
      this,
      document.getElementsById("message"),
      helpMessage,
    );
    this.snake = new Snake(this);
    this.food = new Food(this);
    this.specialFood = new SpecialFood(this, 5, 20);

    this.entities = [this.message, this.snake, this.food, this.specialFood];

    this.score = 0;
    this.isOver = false;
    this.started = false;
    this.isPaused = false;
    this.speed = 100;
    this.lastTime = 0;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  start() {}

  stop() {}

  checkGameOver() {
    return this.snake.isSelfTouching();
  }

  update(_deltaTime) {
    if (this.checkGameOver()) {
      this.isOver = true;
      this.isPaused = true;
      this.message.set(`Game Over! Score: ${score}. Press R to restart.`);
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

  update(_deltaTime) {
    if (this.game.isPaused) return;

    // Get the next direction from the queue if available
    if (this.directionQueue.length > 0) {
      const nextDir = this.directionQueue.shift();

      // Only apply the direction if it's valid relative to the current direction
      if (
        (nextDir.dx === 0 && currentDirection.dx === 0) ||
        (nextDir.dy === 0 && currentDirection.dy === 0) ||
        (nextDir.dx !== -currentDirection.dx &&
          nextDir.dy !== -currentDirection.dy)
      ) {
        currentDirection.dx = nextDir.dx;
        currentDirection.dy = nextDir.dy;
      }

      // If we still have directions in the queue, ensure the next one is valid
      if (directionQueue.length > 0) {
        const nextQueuedDir = directionQueue[0];
        // Check if the next direction would be valid after applying the current one
        if (
          nextQueuedDir.dx === -currentDirection.dx &&
          nextQueuedDir.dy === -currentDirection.dy
        ) {
          // Invalid direction (would cause immediate game over), remove it
          directionQueue.shift();
        }
      }
    }

    const head = {
      x: snake[0].x + currentDirection.dx,
      y: snake[0].y + currentDirection.dy,
    };

    // Wrap around edges
    if (head.x >= tileCount) head.x = 0;
    if (head.x < 0) head.x = tileCount - 1;
    if (head.y >= tileCount) head.y = 0;
    if (head.y < 0) head.y = tileCount - 1;

    snake.unshift(head);

    // Special food management.
    if (specialFood.active && specialFood.expiration > 0) {
      specialFood.expiration--;

      // Remove it from the canvas if expired
      if (specialFood.expiration <= 0) {
        specialFood.x = -1;
        specialFood.y = -1;
      }

      if (head.x === specialFood.x && head.y === specialFood.y) {
        score += 50;

        // Remove it from the canvas if eaten
        specialFood.x = -1;
        specialFood.y = -1;
      }
    }

    // Normal food management.
    if (head.x === food.x && head.y === food.y) {
      score += 10;

      // Only reset special food when normal food is eaten
      if (specialFood.active && specialFood.expiration <= 0) {
        specialFood.active = false;
      }
      generateFood();
    } else {
      snake.pop();
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
  }

  generate() {
    const x = Math.floor(Math.random() * this.game.tileCount);
    const y = Math.floor(Math.random() * this.game.tileCount);

    // TODO: Improve, using proper collision detection
    // Make sure food doesn't spawn on snake
    this.game.snake.forEach((segment) => {
      if (x === segment.x && y === segment.y) {
        generate();
      }
    });

    this.x = x;
    this.y = y;
    this.eaten++;
  }

  update(deltaTime) {}

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
  }

  update(_deltaTime) {
    if (this.expiration <= 0 || this.x < 0 || this.y < 0) {
      this.active = false;
    }
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
