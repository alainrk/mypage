const helpMessage = "[WASD/HJKL] Move [P] Pause/Resume [R] Restart";
const validKeys = new Set([
  "w",
  "a",
  "s",
  "d",
  "r",
  "p",
  "h",
  "j",
  "k",
  "l",
  "W",
  "A",
  "S",
  "D",
  "R",
  "P",
  "H",
  "J",
  "K",
  "L",
]);

class InputManager {
  constructor(game) {
    this.game = game;
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      // We only care about a specific set of keys
      if (!validKeys.has(e.key)) return;
      e.preventDefault(); // Prevent browser scrolling with arrow/WASD keys
      this.game.enqueuePressedKey(e.key);
    });
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.gridSize = 20;
    this.tileCount = this.canvas.width / this.gridSize;

    // Initialize components
    this.input = new InputManager(this);
    this.autoPlayer = new AutoPlayer(this); // AI Player

    this.reset();
  }

  enqueuePressedKey(key) {
    this.keysQueue.unshift(key);
  }

  gameLoop(currentTime) {
    // The main loop is driven by requestAnimationFrame
    requestAnimationFrame(this.gameLoop.bind(this));

    // If the game hasn't started, don't update
    if (!this.started) return;

    const deltaTime = currentTime - this.lastTime;

    // Control game speed. Only update if enough time has passed.
    if (deltaTime < this.speed) {
      return;
    }

    this.lastTime = currentTime;
    this.update();
    this.render();
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
    this.specialFood = new SpecialFood(this, 5, 4000); // Spawns every 5 normal foods, lasts 4 seconds

    this.entities = [this.snake, this.food, this.specialFood, this.message];

    this.score = 0;
    this.isOver = false;
    this.started = true;
    this.isPaused = false;
    this.speed = 100; // ms per game tick
    this.lastTime = 0;

    // Ensure AI is reset as well
    if (this.autoPlayer.isAutoPlaying) {
      this.autoPlayer.stop();
    }
  }

  pause() {
    if (this.isOver) return;
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  start() {
    // This is called once to kick off the game loop.
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
    // First, process any user input
    this.processInput();

    // If AI is active, let it make a move
    if (this.autoPlayer.isAutoPlaying && !this.isPaused && !this.isOver) {
      this.autoPlayer.makeMove();
    }

    // Update score based on food eaten
    this.score = this.food.eaten * 10 + this.specialFood.eaten * 50;

    // Check for game over condition
    if (this.checkGameOver()) {
      this.isOver = true;
      this.isPaused = true; // Effectively stops movement
      this.message.set(`Game Over! Score: ${this.score}. Press R to restart.`);
      if (this.autoPlayer.isAutoPlaying) this.autoPlayer.stop();
    }

    // Update all game entities (snake, food, etc.)
    for (const entity of this.entities) {
      entity.update();
    }
  }

  processInput() {
    while (this.keysQueue.length > 0) {
      const key = this.keysQueue.pop().toLowerCase();

      if (this.isOver) {
        if (key === "r") this.reset();
        continue;
      }

      if (key === "p") {
        this.isPaused ? this.resume() : this.pause();
        continue;
      }

      if (this.isPaused) {
        if (key === "r") this.reset();
        continue;
      }

      if (key === "r") {
        this.reset();
        continue;
      }

      // If AI is playing, it handles movement. Ignore user movement keys.
      if (this.autoPlayer.isAutoPlaying) continue;

      // Delegate movement keys to the snake
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
    }
  }

  render() {
    // Clear the canvas with the background color from CSS variables
    this.ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-background")
      .trim();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render all game entities
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
    this.display = "block";
  }

  update() {
    // Logic to decide which message to show
    if (this.game.isOver) {
      this.set(`Game Over! Score: ${this.game.score}. Press R to restart.`);
    } else if (this.game.isPaused) {
      this.set(this.defaultText);
    } else if (this.game.score > 0) {
      this.set(`Score: ${this.game.score}`);
    } else {
      this.set(this.defaultText);
    }
  }

  set(text) {
    this.text = text;
  }

  render() {
    this.element.textContent = this.text;
    this.element.style.display = this.display;
  }
}

class Snake extends Entity {
  constructor(game) {
    super(game);

    const validDirections = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    const startDirIndex = Math.floor(Math.random() * validDirections.length);
    const startDir = validDirections[startDirIndex];

    this.segments = [];
    this.currentDirection = { dx: startDir[0], dy: startDir[1] };
    this.directionQueue = [{ dx: startDir[0], dy: startDir[1] }];

    // Start snake in a safe position away from the edges
    let x = Math.floor(this.game.tileCount / 2);
    let y = Math.floor(this.game.tileCount / 2);

    // Build the initial snake body
    this.segments.push({ x, y });
    for (let i = 1; i <= 3; i++) {
      this.segments.push({
        x: x - i * this.currentDirection.dx,
        y: y - i * this.currentDirection.dy,
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

  // Methods to queue up direction changes
  up() {
    this.directionQueue.unshift({ dx: 0, dy: -1 });
  }
  down() {
    this.directionQueue.unshift({ dx: 0, dy: 1 });
  }
  right() {
    this.directionQueue.unshift({ dx: 1, dy: 0 });
  }
  left() {
    this.directionQueue.unshift({ dx: -1, dy: 0 });
  }

  processDirectionChange() {
    if (this.directionQueue.length === 0) return;

    const nextDir = this.directionQueue.pop();

    // Prevent moving directly opposite to the current direction
    if (
      nextDir.dx === -this.currentDirection.dx &&
      nextDir.dy === -this.currentDirection.dy
    ) {
      return;
    }

    this.currentDirection = nextDir;
  }

  update() {
    if (this.game.isPaused || this.game.isOver) return;

    this.processDirectionChange();

    // Calculate new head position
    const head = {
      x: this.segments[0].x + this.currentDirection.dx,
      y: this.segments[0].y + this.currentDirection.dy,
    };

    // Wall wrapping logic
    if (head.x >= this.game.tileCount) head.x = 0;
    if (head.x < 0) head.x = this.game.tileCount - 1;
    if (head.y >= this.game.tileCount) head.y = 0;
    if (head.y < 0) head.y = this.game.tileCount - 1;

    this.segments.unshift(head); // Add new head

    // Check for food collision
    if (
      this.game.specialFood.active &&
      head.x === this.game.specialFood.x &&
      head.y === this.game.specialFood.y
    ) {
      this.game.specialFood.eat();
    } else if (head.x === this.game.food.x && head.y === this.game.food.y) {
      this.game.food.eat();
      this.game.specialFood.counterToSpawn--;
    } else {
      this.segments.pop(); // Remove tail if no food was eaten
    }
  }

  render() {
    this.game.ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim();
    this.segments.forEach((segment, index) => {
      // Make head slightly different to be identifiable
      this.game.ctx.globalAlpha = index === 0 ? 1.0 : 0.8;
      this.game.ctx.fillRect(
        segment.x * this.game.gridSize,
        segment.y * this.game.gridSize,
        this.game.gridSize - 2,
        this.game.gridSize - 2,
      );
    });
    this.game.ctx.globalAlpha = 1.0;
  }
}

class Food extends Entity {
  constructor(game) {
    super(game);
    this.eaten = 0;
    this.generate();
  }

  generate() {
    while (true) {
      const x = Math.floor(Math.random() * this.game.tileCount);
      const y = Math.floor(Math.random() * this.game.tileCount);

      // Ensure food doesn't spawn on the snake
      let onSnake = this.game.snake.segments.some(
        (seg) => seg.x === x && seg.y === y,
      );
      if (!onSnake) {
        this.x = x;
        this.y = y;
        break;
      }
    }
  }

  eat() {
    this.eaten++;
    this.generate();
  }

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
    this.rate = rate; // Spawn after this many normal foods are eaten
    this.expiration = expiration; // Milliseconds it stays on screen
    this.eaten = 0;
    this.reset();
  }

  reset() {
    this.x = -1;
    this.y = -1;
    this.counterToSpawn = this.rate;
    this.lastCreation = null;
    this.active = false;
  }

  eat() {
    this.eaten++;
    this.active = false;
    this.counterToSpawn = this.rate;
  }

  generate() {
    while (true) {
      const x = Math.floor(Math.random() * this.game.tileCount);
      const y = Math.floor(Math.random() * this.game.tileCount);

      if (x === this.game.food.x && y === this.game.food.y) continue;
      let onSnake = this.game.snake.segments.some(
        (seg) => seg.x === x && seg.y === y,
      );
      if (onSnake) continue;

      this.x = x;
      this.y = y;
      this.lastCreation = Date.now();
      this.active = true;
      break;
    }
  }

  update() {
    if (this.active) {
      // Deactivate if it has expired
      if (Date.now() - this.lastCreation > this.expiration) {
        this.active = false;
        this.counterToSpawn = this.rate;
      }
    } else if (this.counterToSpawn <= 0) {
      // Spawn if it's time
      this.generate();
    }
  }

  render() {
    if (!this.active) return;
    this.game.ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-special-food")
      .trim();
    this.game.ctx.fillRect(
      this.x * this.game.gridSize,
      this.y * this.game.gridSize,
      this.game.gridSize - 2,
      this.game.gridSize - 2,
    );
  }
}

// AI Player for autonomous gameplay
class AutoPlayer {
  constructor(game) {
    this.game = game;
    this.isAutoPlaying = false;
    this.autoPlayInterval = null;
    this.autoPlaySpeed = 50; // ms between AI decisions

    this.directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    this.setupControlPanel();
  }

  setupControlPanel() {
    const button = document.getElementById("autoPlayButton");
    button.addEventListener("click", () => this.toggleAutoPlay());
  }

  toggleAutoPlay() {
    this.isAutoPlaying = !this.isAutoPlaying;
    const button = document.getElementById("autoPlayButton");
    if (this.isAutoPlaying) {
      button.textContent = "Stop AI";
      this.game.resume();
    } else {
      button.textContent = "Lazy? Start AI";
    }
  }

  start() {
    if (!this.isAutoPlaying) this.toggleAutoPlay();
  }

  stop() {
    if (this.isAutoPlaying) this.toggleAutoPlay();
  }

  createGrid() {
    // Create a 2D array representing the game board
    const grid = Array(this.game.tileCount)
      .fill(null)
      .map(() => Array(this.game.tileCount).fill(0));
    // Mark snake segments as obstacles (1)
    for (const segment of this.game.snake.segments) {
      // Check for out of bounds, which can happen briefly during wrap around
      if (
        segment.x >= 0 &&
        segment.x < this.game.tileCount &&
        segment.y >= 0 &&
        segment.y < this.game.tileCount
      ) {
        grid[segment.y][segment.x] = 1;
      }
    }
    return grid;
  }

  findPath(startX, startY, goalX, goalY) {
    const grid = this.createGrid();
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();

    const gScore = new Map();
    gScore.set(`${startX},${startY}`, 0);

    const fScore = new Map();
    fScore.set(
      `${startX},${startY}`,
      this.manhattanDistance(startX, startY, goalX, goalY),
    );

    openSet.push({
      x: startX,
      y: startY,
      f: fScore.get(`${startX},${startY}`),
    });

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();

      if (current.x === goalX && current.y === goalY) {
        return this.reconstructPath(cameFrom, current);
      }

      closedSet.add(`${current.x},${current.y}`);

      for (const dir of this.directions) {
        let neighborX = current.x + dir.dx;
        let neighborY = current.y + dir.dy;

        // Handle grid wrapping
        if (neighborX >= this.game.tileCount) neighborX = 0;
        if (neighborX < 0) neighborX = this.game.tileCount - 1;
        if (neighborY >= this.game.tileCount) neighborY = 0;
        if (neighborY < 0) neighborY = this.game.tileCount - 1;

        if (closedSet.has(`${neighborX},${neighborY}`)) continue;
        if (grid[neighborY][neighborX] === 1) continue; // Obstacle

        const tentativeGScore = gScore.get(`${current.x},${current.y}`) + 1;

        if (
          tentativeGScore <
          (gScore.get(`${neighborX},${neighborY}`) || Infinity)
        ) {
          cameFrom.set(`${neighborX},${neighborY}`, current);
          gScore.set(`${neighborX},${neighborY}`, tentativeGScore);
          const newFScore =
            tentativeGScore +
            this.manhattanDistance(neighborX, neighborY, goalX, goalY);
          fScore.set(`${neighborX},${neighborY}`, newFScore);

          if (
            !openSet.some(
              (node) => node.x === neighborX && node.y === neighborY,
            )
          ) {
            openSet.push({ x: neighborX, y: neighborY, f: newFScore });
          }
        }
      }
    }
    return []; // No path found
  }

  reconstructPath(cameFrom, current) {
    const totalPath = [{ x: current.x, y: current.y }];
    let currentKey = `${current.x},${current.y}`;
    while (cameFrom.has(currentKey)) {
      current = cameFrom.get(currentKey);
      totalPath.unshift({ x: current.x, y: current.y });
      currentKey = `${current.x},${current.y}`;
    }
    totalPath.shift(); // Remove the starting node itself
    return totalPath;
  }

  manhattanDistance(x1, y1, x2, y2) {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    const tileCount = this.game.tileCount;
    // Consider wrap-around distance
    return Math.min(dx, tileCount - dx) + Math.min(dy, tileCount - dy);
  }

  // This is a simplified survival strategy: follow the snake's tail.
  findTailChasingPath() {
    const head = this.game.snake.segments[0];
    const tail = this.game.snake.segments[this.game.snake.segments.length - 1];
    return this.findPath(head.x, head.y, tail.x, tail.y);
  }

  setDirection(dx, dy) {
    if (dx === 1) this.game.snake.right();
    else if (dx === -1) this.game.snake.left();
    else if (dy === 1) this.game.snake.down();
    else if (dy === -1) this.game.snake.up();
  }

  makeMove() {
    const head = this.game.snake.segments[0];
    let pathToTarget;

    // Prioritize special food if it's active and reachable
    if (this.game.specialFood.active) {
      const path = this.findPath(
        head.x,
        head.y,
        this.game.specialFood.x,
        this.game.specialFood.y,
      );
      const timeToExpire =
        (this.game.specialFood.lastCreation +
          this.game.specialFood.expiration -
          Date.now()) /
        this.game.speed;
      if (path.length > 0 && path.length < timeToExpire) {
        pathToTarget = path;
      }
    }

    // If no path to special food, try for normal food
    if (!pathToTarget) {
      pathToTarget = this.findPath(
        head.x,
        head.y,
        this.game.food.x,
        this.game.food.y,
      );
    }

    // If a path to food is found, take it
    if (pathToTarget && pathToTarget.length > 0) {
      const nextMove = pathToTarget[0];
      const dx = nextMove.x - head.x;
      const dy = nextMove.y - head.y;
      // Handle wrap-around for direction calculation
      if (Math.abs(dx) > 1) this.setDirection(-dx / Math.abs(dx), dy);
      else if (Math.abs(dy) > 1) this.setDirection(dx, -dy / Math.abs(dy));
      else this.setDirection(dx, dy);
    } else {
      // SURVIVAL MODE: If no path to food, chase the tail to stay alive
      const safePath = this.findTailChasingPath();
      if (safePath && safePath.length > 0) {
        const nextMove = safePath[0];
        const dx = nextMove.x - head.x;
        const dy = nextMove.y - head.y;
        if (Math.abs(dx) > 1) this.setDirection(-dx / Math.abs(dx), dy);
        else if (Math.abs(dy) > 1) this.setDirection(dx, -dy / Math.abs(dy));
        else this.setDirection(dx, dy);
      } else {
        // LAST RESORT: if totally trapped, just move somewhere valid if possible
        // This part is tricky and often leads to game over. The tail-chasing is a better fallback.
      }
    }
  }
}

(() => {
  // Wait for the DOM to be fully loaded before starting the game
  document.addEventListener("DOMContentLoaded", () => {
    const game = new Game();
    game.start();
  });
})();
