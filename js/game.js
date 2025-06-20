class Game {
  constructor() {
    this.ctx = document.getElementById("canvas").getContext("2d");

    this.entities = [
      Message(
        this,
        document.getElementsById("message"),
        "[WASD/HJKL] Move [P] Pause/Resume [R] Restart",
      ),
    ];

    this.gridSize = 20;
    this.specialFoodRate = 5;
    this.specialFoodExpiration = 50;
    this.tileCount = canvas.width / gridSize;
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

    let food = { x: 15, y: 15, ate: 0 };
    let specialFood = {
      x: -1,
      y: -1,
      expiration: specialFoodExpiration,
      active: false,
    };

    this.vimuser = false;
    this.score = 0;
    this.isOver = false;
    this.started = false;
    this.isPaused = false;
    this.speed = 100;
    this.lastTime = 0; // TODO: use deltatime
  }

  gameLoop(currentTime) {
    const deltaTime = (currentTime - this.lastTime) / 1000;

    if (deltaTime > gameSpeed) {
      return;
    }

    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(deltaTime) {}
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

    const directionQueue = [];
    directionQueue.push({
      dx: validDirections[startDir][0],
      dy: validDirections[startDir][1],
    });
  }

  update(deltaTime) {}

  render() {}
}

class Food extends Entity {}
