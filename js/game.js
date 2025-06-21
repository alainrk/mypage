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
    this.ctx = document.getElementById("canvas").getContext("2d");

    this.keysQueue = [];
    this.snake = new Snake(this);
    this.entities = [
      new Message(
        this,
        document.getElementsById("message"),
        "[WASD/HJKL] Move [P] Pause/Resume [R] Restart",
      ),
      snake,
      new Food(this),
      new SpecialFood(this, 5, 50),
    ];

    this.tileCount = canvas.width / gridSize;
    this.gridSize = 20;

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
  }
  render() {}
  start() {}
  stop() {}
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
  }

  update(_deltaTime) {
    if (this.game.isPaused) {
      this.text = this.defaultText;
    } else if (this.game.isOver) {
      this.text = `Game Over! Score: ${this.game.score}. Press R to restart.`;
    } else if (
      !this.game.isOver &&
      !this.game.isPaused &&
      this.game.score > 0
    ) {
      this.text = `Score: ${this.game.score}`;
    } else {
      this.text = this.defaultText;
    }
  }

  render() {
    this.element.textContent = this.text;
    this.element.style.display = "block";
  }
}

class Snake extends Entity {
  constructor(game) {
    super(game);

    const startx = Math.floor(Math.random() * tileCount);
    const starty = Math.floor(Math.random() * tileCount);

    this.validDirections = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];

    const startDir = Math.floor(Math.random() * validDirections.length);

    this.segments = [
      { x: startx, y: starty },
      { x: startx, y: starty + 1 },
      { x: startx, y: starty + 2 },
      { x: startx, y: starty + 3 },
    ];

    this.currentDirection = {
      dx: validDirections[startDir][0],
      dy: validDirections[startDir][1],
    };

    this.directionQueue = [];
    directionQueue.push({
      dx: validDirections[startDir][0],
      dy: validDirections[startDir][1],
    });
  }

  up() {}
  down() {}
  right() {}
  left() {}

  update(deltaTime) {
    // // Get the current direction (either from the snake's movement or from the first queued direction)
    // const currentDir =
    //   directionQueue.length > 0
    //     ? directionQueue[directionQueue.length - 1]
    //     : currentDirection;
    //
    // let newDirection;
    // switch (key.toLowerCase()) {
    //   case "w":
    //   case "k":
    //     if (currentDir.dy !== 1) {
    //       newDirection = { dx: 0, dy: -1 };
    //     }
    //     break;
    //   case "s":
    //   case "j":
    //     if (currentDir.dy !== -1) {
    //       newDirection = { dx: 0, dy: 1 };
    //     }
    //     break;
    //   case "a":
    //   case "h":
    //     if (currentDir.dx !== 1) {
    //       newDirection = { dx: -1, dy: 0 };
    //     }
    //     break;
    //   case "d":
    //   case "l":
    //     if (currentDir.dx !== -1) {
    //       newDirection = { dx: 1, dy: 0 };
    //     }
    //     break;
    // }
    //
    // // Add the new direction to the queue if it's valid and different from the last queued direction
    // if (newDirection) {
    //   // Only add if different from the last direction in the queue
    //   const lastDirection =
    //     directionQueue.length > 0
    //       ? directionQueue[directionQueue.length - 1]
    //       : null;
    //
    //   if (
    //     !lastDirection ||
    //     newDirection.dx !== lastDirection.dx ||
    //     newDirection.dy !== lastDirection.dy
    //   ) {
    //     directionQueue.push(newDirection);
    //   }
    // }
  }

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
