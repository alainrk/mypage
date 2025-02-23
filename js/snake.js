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
const nextDirection = {
  dx: validDirections[startDir][0],
  dy: validDirections[startDir][1],
};

const helpMessage = "[WASD] to move, P/R pause/restart.";
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
    // Only R key allowed to get out of Game Over.
    if (!["r", "R"].includes(e.key)) {
      return;
    }

    resetGame();
    return;
  }

  if (
    !gameStarted &&
    ["w", "a", "s", "d", "r", "p", "W", "A", "S", "D", "R", "P"].includes(e.key)
  ) {
    gameStarted = true;
  }

  switch (e.key.toLowerCase()) {
    case "w":
      resumeGame();
      if (currentDirection.dy !== 1) {
        nextDirection.dx = 0;
        nextDirection.dy = -1;
      }
      break;
    case "s":
      resumeGame();
      if (currentDirection.dy !== -1) {
        nextDirection.dx = 0;
        nextDirection.dy = 1;
      }
      break;
    case "a":
      resumeGame();
      if (currentDirection.dx !== 1) {
        nextDirection.dx = -1;
        nextDirection.dy = 0;
      }
      break;
    case "d":
      resumeGame();
      if (currentDirection.dx !== -1) {
        nextDirection.dx = 1;
        nextDirection.dy = 0;
      }
      break;
    case "p":
      if (gamePaused) resumeGame();
      else pauseGame();
      break;
    case "r":
      resetGame();
      break;
  }
}

function drawGame() {
  const currentTime = Date.now();
  if (currentTime - lastRenderTime < gameSpeed) {
    requestAnimationFrame(drawGame);
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
  generateSpecialFood();
  drawSpecialFood();

  requestAnimationFrame(drawGame);
}

function moveSnake() {
  if (gamePaused) return;

  // Update current direction only when snake actually moves
  currentDirection.dx = nextDirection.dx;
  currentDirection.dy = nextDirection.dy;

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

  if (specialFood.active && specialFood.expiration > 0) {
    specialFood.expiration--;

    // Remove it from the canvas if expired
    if (specialFood.expiration <= 0) {
      specialFood.x = -1;
      specialFood.y = -1;
    }

    if (head.x === specialFood.x && head.y === specialFood.y) {
      score += 50;
      msgElement.textContent = `${score}`;
      msgElement.style.display = "block";

      // Remove it from the canvas if eaten
      specialFood.x = -1;
      specialFood.y = -1;
    }
  }

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    msgElement.textContent = `${score}`;
    msgElement.style.display = "block";

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
  setMsg(`${score}`);
}

function pauseGame() {
  gamePaused = true;
  setMsg(helpMessage);
}

function resetGame() {
  let x = Math.floor(Math.random() * tileCount);
  let y = Math.floor(Math.random() * tileCount);
  while (snake.length > 0) {
    snake.pop();
  }
  for (let i = 1; i <= 4; i++) {
    snake.push({ x: x, y: y + i });
  }

  const startDir = Math.floor(Math.random() * validDirections.length);
  currentDirection.dx = validDirections[startDir][0];
  currentDirection.dy = validDirections[startDir][1];
  nextDirection.dx = validDirections[startDir][0];
  nextDirection.dy = validDirections[startDir][1];

  specialFood.x = -1;
  specialFood.y = -1;
  specialFood.active = false;

  score = 0;
  gameStarted = false;
  gameOver = false;
  setMsg(helpMessage);
  generateFood(true);
}

drawGame();
