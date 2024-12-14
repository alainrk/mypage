const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");

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
let lastRenderTime = 0;
const gameSpeed = 100;

document.addEventListener("keydown", handleKeyPress);

function handleKeyPress(e) {
  if (
    !gameStarted &&
    ["w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)
  ) {
    gameStarted = true;
    messageElement.style.display = "none";
  }

  switch (e.key.toLowerCase()) {
    case "w":
      if (dy === 0) {
        dx = 0;
        dy = -1;
      }
      break;
    case "s":
      if (dy === 0) {
        dx = 0;
        dy = 1;
      }
      break;
    case "a":
      if (dx === 0) {
        dx = -1;
        dy = 0;
      }
      break;
    case "d":
      if (dx === 0) {
        dx = 1;
        dy = 0;
      }
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
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // Wrap around edges
  if (head.x >= tileCount) head.x = 0;
  if (head.x < 0) head.x = tileCount - 1;
  if (head.y >= tileCount) head.y = 0;
  if (head.y < 0) head.y = tileCount - 1;

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = `Score: ${score}`;
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

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
    { x: 10, y: 13 },
  ];
  dx = 0;
  dy = -1;
  score = 0;
  gameStarted = false;
  messageElement.style.display = "block";
  scoreElement.textContent = `Score: ${score}`;
  generateFood();
}

drawGame();
