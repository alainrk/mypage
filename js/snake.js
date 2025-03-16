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

const helpMessage = "[WASD] Move [P] Pause/Resume [R] Restart";
const gridSize = 20;
const specialFoodRate = 5;
const specialFoodExpiration = 50;
const tileCount = canvas.width / gridSize;

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

  if (
    !gameStarted &&
    ["w", "a", "s", "d", "r", "p", "W", "A", "S", "D", "R", "P"].includes(e.key)
  ) {
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
      if (currentDir.dy !== 1) {
        newDirection = { dx: 0, dy: -1 };
      }
      break;
    case "s":
      if (currentDir.dy !== -1) {
        newDirection = { dx: 0, dy: 1 };
      }
      break;
    case "a":
      if (currentDir.dx !== 1) {
        newDirection = { dx: -1, dy: 0 };
      }
      break;
    case "d":
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

resetGame();
mainLoop();
