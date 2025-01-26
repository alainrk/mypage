const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const msgElement = document.getElementById("message");
const msg = "[WASD] to move, P/R pause/restart.";
let currentDirection = { dx: 0, dy: -1 };
let nextDirection = { dx: 0, dy: -1 };

const gridSize = 20;
const tileCount = canvas.width / gridSize;

const messageElement = document.getElementById("message");
let snake = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
  { x: 10, y: 13 },
];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = -1;
let score = 0;
let gameStarted = false;
let gamePaused = false;
let lastRenderTime = 0;
const gameSpeed = 100;

document.addEventListener("keydown", handleKeyPress);

function setMsgToScore() {
  msgElement.textContent = `${score}`;
  msgElement.style.display = "block";
}

function setMsgToHelp() {
  msgElement.textContent = msg;
  msgElement.style.display = "block";
}

function handleKeyPress(e) {
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
        nextDirection = { dx: 0, dy: -1 };
      }
      break;
    case "s":
      resumeGame();
      if (currentDirection.dy !== -1) {
        nextDirection = { dx: 0, dy: 1 };
      }
      break;
    case "a":
      resumeGame();
      if (currentDirection.dx !== 1) {
        nextDirection = { dx: -1, dy: 0 };
      }
      break;
    case "d":
      resumeGame();
      if (currentDirection.dx !== -1) {
        nextDirection = { dx: 1, dy: 0 };
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
  checkCollision();
  drawSnake();
  drawFood();

  requestAnimationFrame(drawGame);
}

function moveSnake() {
  if (gamePaused) return;

  // Update current direction only when snake actually moves
  currentDirection = { ...nextDirection };

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

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    msgElement.textContent = `${score}`;
    msgElement.style.display = "block";
    generateFood();
  } else {
    snake.pop();
  }
}

function checkCollision() {
  const head = snake[0];
  for (let i = 1; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      resetGame();
    }
  }
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

function generateFood() {
  food = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount),
  };
  // Make sure food doesn't spawn on snake
  snake.forEach((segment) => {
    if (food.x === segment.x && food.y === segment.y) {
      generateFood();
    }
  });
}

function resumeGame() {
  gamePaused = false;
  setMsgToScore();
}

function pauseGame() {
  gamePaused = true;
  setMsgToHelp();
}

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
    { x: 10, y: 13 },
  ];
  currentDirection = { dx: 0, dy: -1 };
  nextDirection = { dx: 0, dy: -1 };
  score = 0;
  gameStarted = false;
  setMsgToHelp();
  generateFood();
}

drawGame();
