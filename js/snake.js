const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const msgElement = document.getElementById("message");

const validDirections = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];
const startDir = Math.floor(Math.random() * validDirections.length);
const currentDirection = {
  dx: validDirections[startDir][0],
  dy: validDirections[startDir][1],
};

const directionQueue = [];
directionQueue.push({
  dx: validDirections[startDir][0],
  dy: validDirections[startDir][1],
});

const helpMessage = "[WASD/HJKL] Move [P] Pause/Resume [R] Restart";
const gridSize = 20;
const specialFoodRate = 5;
const specialFoodExpiration = 50;
const tileCount = canvas.width / gridSize;
const validKeys = new Set(
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

const messageElement = document.getElementById("message");
let startx = Math.floor(Math.random() * tileCount);
let starty = Math.floor(Math.random() * tileCount);
const snake = [
  { x: startx, y: starty },
  { x: startx, y: starty + 1 },
  { x: startx, y: starty + 2 },
  { x: startx, y: starty + 3 },
];
let food = { x: 15, y: 15, ate: 0 };
let specialFood = {
  x: -1,
  y: -1,
  expiration: specialFoodExpiration,
  active: false,
};

let vimuser = false;
let score = 0;
let gameOver = false;
let gameStarted = false;
let gamePaused = false;
let lastRenderTime = 0;
const gameSpeed = 100;

document.addEventListener("keydown", handleKeyPress);

function setMsg(msg) {
  msgElement.textContent = msg;
  msgElement.style.display = "block";
}

function handleKeyPress(e) {
  if (gameOver) {
    if (!["r", "R"].includes(e.key)) {
      return;
    }

    resetGame();
    return;
  }

  if (gamePaused) {
    if (["r", "R"].includes(e.key)) {
      resetGame();
    }
    if (["p", "P"].includes(e.key)) {
      resumeGame();
    }
    return;
  }

  if (!gameStarted && validKeys.has(e.key)) {
    gameStarted = true;
  }

  // Get the current direction (either from the snake's movement or from the first queued direction)
  const currentDir =
    directionQueue.length > 0
      ? directionQueue[directionQueue.length - 1]
      : currentDirection;

  let newDirection;
  switch (e.key.toLowerCase()) {
    case "w":
    case "k":
      if (currentDir.dy !== 1) {
        newDirection = { dx: 0, dy: -1 };
      }
      break;
    case "s":
    case "j":
      if (currentDir.dy !== -1) {
        newDirection = { dx: 0, dy: 1 };
      }
      break;
    case "a":
    case "h":
      if (currentDir.dx !== 1) {
        newDirection = { dx: -1, dy: 0 };
      }
      break;
    case "d":
    case "l":
      if (currentDir.dx !== -1) {
        newDirection = { dx: 1, dy: 0 };
      }
      break;
    case "p":
      pauseGame();
      break;
    case "r":
      resetGame();
      break;
  }

  // Add the new direction to the queue if it's valid and different from the last queued direction
  if (newDirection) {
    // Only add if different from the last direction in the queue
    const lastDirection =
      directionQueue.length > 0
        ? directionQueue[directionQueue.length - 1]
        : null;

    if (
      !lastDirection ||
      newDirection.dx !== lastDirection.dx ||
      newDirection.dy !== lastDirection.dy
    ) {
      directionQueue.push(newDirection);
    }
  }
}

function mainLoop() {
  const currentTime = Date.now();
  if (currentTime - lastRenderTime < gameSpeed) {
    requestAnimationFrame(mainLoop);
    return;
  }
  lastRenderTime = currentTime;

  if (!gameStarted) {
    messageElement.style.display = "block";
  }

  // Clear canvas
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-background")
    .trim();
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  moveSnake();
  checkGameOver();
  drawSnake();
  drawFood();
  drawScore();
  generateSpecialFood();
  drawSpecialFood();

  requestAnimationFrame(mainLoop);
}

function moveSnake() {
  if (gamePaused) return;

  // Get the next direction from the queue if available
  if (directionQueue.length > 0) {
    const nextDir = directionQueue.shift();

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

function checkGameOver() {
  const head = snake[0];
  for (let i = 1; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      setGameOver();
    }
  }
}

function setGameOver() {
  gameOver = true;
  gamePaused = true;
  setMsg(`Game Over! Score: ${score}. Press R to restart.`);
}

function drawSnake() {
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-primary")
    .trim();
  snake.forEach((segment) => {
    ctx.fillRect(
      segment.x * gridSize,
      segment.y * gridSize,
      gridSize - 2,
      gridSize - 2,
    );
  });
}

function drawScore() {
  if (!gameOver && !gamePaused && score > 0) {
    setMsg(`Score: ${score}`);
  }
}

function drawFood() {
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-secondary")
    .trim();
  ctx.fillRect(
    food.x * gridSize,
    food.y * gridSize,
    gridSize - 2,
    gridSize - 2,
  );
}

function drawSpecialFood() {
  // Defensive check, shouldn't be needed
  if (
    !specialFood.active ||
    specialFood.expiration <= 0 ||
    specialFood.x < 0 ||
    specialFood.y < 0
  )
    return;

  ctx.fillStyle = "red";
  ctx.fillRect(
    specialFood.x * gridSize,
    specialFood.y * gridSize,
    gridSize - 2,
    gridSize - 2,
  );
}

function generateFood(start = false) {
  food = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount),
    ate: start ? 0 : food.ate + 1,
  };

  // Make sure food doesn't spawn on snake
  snake.forEach((segment) => {
    if (food.x === segment.x && food.y === segment.y) {
      generateFood();
    }
  });
}

function generateSpecialFood() {
  if (
    // Wait at least the minimum rate to generate the first special food.
    food.ate < specialFoodRate ||
    // Wait the rate-th occurrence of normal food.
    food.ate % specialFoodRate !== 0 ||
    // Special food already created.
    specialFood.active
  )
    return;

  specialFood = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount),
    expiration: 50,
    active: true,
  };

  // Make sure food doesn't spawn on normal food
  if (specialFood.x === food.x && specialFood.y === food.y) {
    generateSpecialFood();
  }

  // Make sure food doesn't spawn on snake
  snake.forEach((segment) => {
    if (food.x === segment.x && food.y === segment.y) {
      generateSpecialFood();
    }
  });
}

function resumeGame() {
  gamePaused = false;
}

function pauseGame() {
  gamePaused = true;
  setMsg(helpMessage);
}

function resetGame() {
  const startDir = Math.floor(Math.random() * validDirections.length);

  currentDirection.dx = validDirections[startDir][0];
  currentDirection.dy = validDirections[startDir][1];

  // Clear and reset the direction queue
  directionQueue.length = 0;
  directionQueue.push({
    dx: validDirections[startDir][0],
    dy: validDirections[startDir][1],
  });

  // Clean up the snake.
  while (snake.length > 0) {
    snake.pop();
  }

  // Get the head randomly, but I want to avoid wrapping at the first iteration.
  let x = Math.min(
    tileCount - 4,
    Math.max(4, Math.floor(Math.random() * tileCount)),
  );
  let y = Math.min(
    tileCount - 4,
    Math.max(4, Math.floor(Math.random() * tileCount)),
  );

  // Compose the snake.
  // Push the head.
  snake.push({ x: x, y: y });
  for (let i = 3; i > 0; i--) {
    // Push the rest of the snake according to direction.
    snake.push({
      x: x + i * currentDirection.dx,
      y: y + i * currentDirection.dy,
    });
  }

  specialFood.x = -1;
  specialFood.y = -1;
  specialFood.active = false;

  score = 0;
  gameStarted = false;
  gamePaused = false;
  gameOver = false;
  setMsg(helpMessage);
  generateFood(true);
}

// Auto Snake Player - Self-contained function that setup and plays snake
// automatically using pathfinding and obstacle avoidance algorithms
function initAutoSnakePlayer() {
  // Wait for the game to be initialized
  const checkGameLoaded = setInterval(() => {
    if (
      typeof snake !== "undefined" &&
      typeof food !== "undefined" &&
      typeof canvas !== "undefined"
    ) {
      clearInterval(checkGameLoaded);
      startAutoPlayer();
    }
  }, 100);

  function startAutoPlayer() {
    createControlPanel();

    // Variables to control the auto player
    let isAutoPlaying = false;
    let autoPlayInterval = null;
    const autoPlaySpeed = 50; // ms between moves

    // Game parameters
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    function toggleAutoPlay() {
      isAutoPlaying = !isAutoPlaying;

      if (isAutoPlaying) {
        document.getElementById("autoPlayButton").textContent = "Stop AI";
        autoPlayInterval = setInterval(makeMove, autoPlaySpeed);
      } else {
        document.getElementById("autoPlayButton").textContent =
          "Lazy? Start AI";
        clearInterval(autoPlayInterval);
      }
    }

    // 2D Grid representation of the game
    function createGrid() {
      const grid = Array(tileCount)
        .fill()
        .map(() => Array(tileCount).fill(0));

      // Mark snake body as obstacles
      for (let i = 0; i < snake.length; i++) {
        grid[snake[i].y][snake[i].x] = 1;
      }

      return grid;
    }

    // A* pathfinding algorithm
    function findPath(startX, startY, goalX, goalY) {
      const grid = createGrid();

      // Priority queue for open nodes
      const openSet = [];
      const closedSet = new Set();

      // Start node
      const start = {
        x: startX,
        y: startY,
        g: 0,
        h: manhattanDistance(startX, startY, goalX, goalY),
        f: 0,
        parent: null,
      };
      start.f = start.g + start.h;
      openSet.push(start);

      while (openSet.length > 0) {
        // Find node with lowest f score
        let lowestIndex = 0;
        for (let i = 0; i < openSet.length; i++) {
          if (openSet[i].f < openSet[lowestIndex].f) {
            lowestIndex = i;
          }
        }

        const current = openSet[lowestIndex];

        // If we reached the goal
        if (current.x === goalX && current.y === goalY) {
          let path = [];
          let temp = current;
          while (temp.parent) {
            path.push({ x: temp.x, y: temp.y });
            temp = temp.parent;
          }
          return path.reverse();
        }

        // Remove current from openSet and add to closedSet
        openSet.splice(lowestIndex, 1);
        closedSet.add(`${current.x},${current.y}`);

        // Check all neighbors
        for (const dir of directions) {
          const neighborX = current.x + dir.dx;
          const neighborY = current.y + dir.dy;

          // Skip if out of bounds
          if (
            neighborX < 0 ||
            neighborX >= tileCount ||
            neighborY < 0 ||
            neighborY >= tileCount
          ) {
            continue;
          }

          // Skip if in closedSet
          if (closedSet.has(`${neighborX},${neighborY}`)) {
            continue;
          }

          // Skip if obstacle (snake body)
          if (grid[neighborY][neighborX] === 1) {
            continue;
          }

          const g = current.g + 1;
          const h = manhattanDistance(neighborX, neighborY, goalX, goalY);
          const f = g + h;

          // Check if this is a better path
          let isBetter = true;
          for (const node of openSet) {
            if (node.x === neighborX && node.y === neighborY && node.f <= f) {
              isBetter = false;
              break;
            }
          }

          if (isBetter) {
            openSet.push({
              x: neighborX,
              y: neighborY,
              g: g,
              h: h,
              f: f,
              parent: current,
            });
          }
        }
      }

      // No path found
      return [];
    }

    // Manhattan distance heuristic
    function manhattanDistance(x1, y1, x2, y2) {
      return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    // Find safest direction if no path to food
    function findSafeDirection() {
      const head = snake[0];
      const safestDir = { dir: null, space: -1 };

      // Try each direction and see which has the most open space
      for (const dir of directions) {
        const newX = head.x + dir.dx;
        const newY = head.y + dir.dy;

        // Skip if it would hit the snake
        let willHitSnake = false;
        for (let i = 0; i < snake.length; i++) {
          if (snake[i].x === newX && snake[i].y === newY) {
            willHitSnake = true;
            break;
          }
        }

        // Skip if out of bounds
        if (
          newX < 0 ||
          newX >= tileCount ||
          newY < 0 ||
          newY >= tileCount ||
          willHitSnake
        ) {
          continue;
        }

        // Flood fill to count available space
        const grid = createGrid();
        const spaceCount = floodFill(grid, newX, newY);

        if (spaceCount > safestDir.space) {
          safestDir.dir = dir;
          safestDir.space = spaceCount;
        }
      }

      return safestDir.dir;
    }

    // Flood fill algorithm to count open spaces
    function floodFill(grid, x, y) {
      if (
        x < 0 ||
        x >= tileCount ||
        y < 0 ||
        y >= tileCount ||
        grid[y][x] === 1
      ) {
        return 0;
      }

      grid[y][x] = 1; // Mark as visited
      let count = 1;

      // Check adjacent cells
      count += floodFill(grid, x + 1, y);
      count += floodFill(grid, x - 1, y);
      count += floodFill(grid, x, y + 1);
      count += floodFill(grid, x, y - 1);

      return count;
    }

    // Set movement direction
    function setDirection(dx, dy) {
      // Find matching direction
      for (let i = 0; i < directionQueue.length; i++) {
        if (directionQueue[i].dx === dx && directionQueue[i].dy === dy) {
          return; // Direction already queued
        }
      }

      // Add new direction to queue
      directionQueue.push({ dx, dy });
    }

    // Make a move decision
    function makeMove() {
      if (gameOver || !isAutoPlaying) {
        return;
      }

      const head = snake[0];
      let pathToTarget;

      // Check if special food is active and prioritize it
      if (
        specialFood &&
        specialFood.active &&
        specialFood.x >= 0 &&
        specialFood.y >= 0 &&
        specialFood.expiration > 0
      ) {
        // Path to special food
        pathToTarget = findPath(head.x, head.y, specialFood.x, specialFood.y);

        // If we can't reach special food in time or no path exists, check regular food
        if (
          pathToTarget.length === 0 ||
          pathToTarget.length > specialFood.expiration
        ) {
          // Fall back to regular food
          pathToTarget = findPath(head.x, head.y, food.x, food.y);
        }
      } else {
        // No special food, go for regular food
        pathToTarget = findPath(head.x, head.y, food.x, food.y);
      }

      if (pathToTarget.length > 0) {
        // Move toward target food
        const nextMove = pathToTarget[0];
        const dx = nextMove.x - head.x;
        const dy = nextMove.y - head.y;
        setDirection(dx, dy);
      } else {
        // No path to any food, find safest direction
        const safeDir = findSafeDirection();
        if (safeDir) {
          setDirection(safeDir.dx, safeDir.dy);
        }
      }
    }

    // Create control panel
    function createControlPanel() {
      const controlPanel = document.createElement("div");
      controlPanel.style.marginTop = "10px";
      controlPanel.style.textAlign = "center";

      const autoPlayButton = document.createElement("button");
      autoPlayButton.id = "autoPlayButton";
      autoPlayButton.textContent = "Lazy? Start AI";
      autoPlayButton.style.padding = "8px 16px";
      autoPlayButton.style.backgroundColor = "var(--color-primary)";
      autoPlayButton.style.color = "black";
      autoPlayButton.style.border = "none";
      autoPlayButton.style.borderRadius = "4px";
      autoPlayButton.style.cursor = "pointer";
      autoPlayButton.style.fontSize = "14px";
      autoPlayButton.style.fontFamily = "Roboto Mono, monospace";
      autoPlayButton.style.marginBottom = "10px";

      autoPlayButton.title = "AI uses A* pathfinding";

      autoPlayButton.addEventListener("click", toggleAutoPlay);

      controlPanel.appendChild(autoPlayButton);

      const snakeContainer = document.getElementById("snake");
      if (snakeContainer) {
        snakeContainer.appendChild(controlPanel);
      }
    }
  }
}

// AI Initializer function
(function () {
  // Check if we're on a page with the snake game
  if (document.getElementById("snake") || document.getElementById("canvas")) {
    document.addEventListener("DOMContentLoaded", initAutoSnakePlayer);
  }
})();

resetGame();
mainLoop();
