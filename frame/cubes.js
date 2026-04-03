
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  const SIZE = 30;
  const COLORS = [
    "#FF6B6B", "#4ECDC4", "#1A535C", "#FFCE67", "#6B4226", "#F25F5C",
    "#247BA0", "#70C1B3", "#B2DBBF", "#F3FFBD", "#EDD382", "#F4845F",
    "#9DD9D2", "#5D576B", "#3A3335", "#D72638", "#3F88C5", "#F49D37",
    "#140F2D", "#FF6F59", "#254441", "#43AA8B", "#B2B09B", "#F7C59F",
    "#61C0BF", "#6B4226", "#F9C80E", "#EA3546", "#662E9B", "#A8C256",
    "#FFB400", "#C0C0C0", "#B80C09", "#8E44AD", "#2980B9", "#27AE60",
    "#F39C12", "#E74C3C", "#16A085", "#2C3E50"
  ];

  const letters = ["T", "H", "A", "N", "K", "Y", "O", "U"];
  let letterIndex = 0;

  class Cube {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.z = 0;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.Qx = Math.random() * Math.PI;
      this.Qy = Math.random() * Math.PI;
      this.Qz = Math.random() * Math.PI;
      this.dx = 0;
      this.dy = 0;
      this.dz = 0;
      this.colors = Array.from({ length: 6 }, () =>
        COLORS[Math.floor(Math.random() * COLORS.length)]
      );
      this.selected = false;
      this.frozen = false;
      this.letter = null;
    }


    checkCollision(other) {
  const dx = this.x - other.x;
  const dy = this.y - other.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDist = SIZE * 2;

  if (distance < minDist) {
    const overlap = minDist - distance;
    const nx = dx / distance;
    const ny = dy / distance;

    // 其中一个是 selected 或 frozen，就只推动另一个
    if (this.selected || this.frozen) {
      other.x -= nx * overlap;
      other.y -= ny * overlap;
      other.vx = -nx;
      other.vy = -ny;
    } else if (other.selected || other.frozen) {
      this.x += nx * overlap;
      this.y += ny * overlap;
      this.vx = nx;
      this.vy = ny;
    } else {
      // 都不是特殊的，就各自移动一半
      this.x += nx * overlap / 2;
      this.y += ny * overlap / 2;
      other.x -= nx * overlap / 2;
      other.y -= ny * overlap / 2;

      // 简单速度反向模拟弹性碰撞
      const tempVx = this.vx;
      const tempVy = this.vy;
      this.vx = other.vx;
      this.vy = other.vy;
      other.vx = tempVx;
      other.vy = tempVy;
    }
  }
}

    project([x, y, z]) {
      let x1 = x * Math.cos(this.Qz) + y * Math.sin(this.Qz);
      let y1 = y * Math.cos(this.Qz) - x * Math.sin(this.Qz);
      let z1 = z;

      let x2 = x1;
      let y2 = y1 * Math.cos(this.Qx) + z1 * Math.sin(this.Qx);
      let z2 = z1 * Math.cos(this.Qx) - y1 * Math.sin(this.Qx);

      let x3 = x2 * Math.cos(this.Qy) + z2 * Math.sin(this.Qy);
      let y3 = y2;
      return [x3, y3];
    }

    toCanvasCoords([x, y]) {
      return [x + this.x, -y + this.y];
    }

    update() {
      if (this.selected || this.frozen) return;
      this.x += this.vx;
      this.y += this.vy;

      // bounce
      if (this.x < 100 || this.x > canvas.width - 100) this.vx *= -1;
      if (this.y < 100 || this.y > canvas.height - 100) this.vy *= -1;

      // rotation based on direction
      this.Qx += this.vy * 0.01;
      this.Qy += this.vx * 0.01;
    }

    draw() {
      const vertices = [
        [+SIZE, +SIZE, +SIZE],
        [-SIZE, +SIZE, +SIZE],
        [-SIZE, -SIZE, +SIZE],
        [+SIZE, -SIZE, +SIZE],
        [+SIZE, +SIZE, -SIZE],
        [-SIZE, +SIZE, -SIZE],
        [-SIZE, -SIZE, -SIZE],
        [+SIZE, -SIZE, -SIZE]
      ];

      const faces = [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [0, 3, 7, 4],
        [1, 2, 6, 5],
        [0, 1, 5, 4],
        [3, 2, 6, 7]
      ];

      const projected = vertices.map(v => this.toCanvasCoords(this.project(v)));

      faces.forEach((face, i) => {
        ctx.beginPath();
        face.forEach((idx, j) => {
          const [x, y] = projected[idx];
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        if (this.letter === null) {
          ctx.fillStyle = this.colors[i];
          ctx.fill();
        }
        ctx.strokeStyle = "white";
        ctx.lineWidth = 0;
        ctx.stroke();
      });

      if (this.letter !== null) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.font = "bold 50px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.letter, 0, 0);
        ctx.restore();
      }
    }
  }

  const cubes = [];
  for (let i = 0; i < 34; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    cubes.push(new Cube(x, y));
  }

  canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (const cube of cubes) cube.selected = false;
    for (const cube of cubes) {
      const dx = cube.x - x;
      const dy = cube.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < SIZE * 2 && !cube.frozen) {
        cube.selected = true;
        break;
      }
    }
  });

  canvas.addEventListener("dblclick", () => {
    for (const cube of cubes) {
      if (cube.selected && !cube.frozen) {
        cube.frozen = true;
        cube.selected = false;
        if (letterIndex < letters.length) {
          cube.letter = letters[letterIndex++];
        }
        break;
      }
    }
  });

  window.addEventListener("keydown", e => {
    const step = Math.PI / 180;
    for (const cube of cubes) {
      if (!cube.selected) continue;
      switch (e.key.toLowerCase()) {
        case "w": cube.dx += step; break;
        case "s": cube.dx -= step; break;
        case "a": cube.dy -= step; break;
        case "d": cube.dy += step; break;
        case "z": cube.dz -= step; break;
        case "x": cube.dz += step; break;
      }
    }
  });

  function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 碰撞检测：逐对检查
  for (let i = 0; i < cubes.length; i++) {
    for (let j = i + 1; j < cubes.length; j++) {
      cubes[i].checkCollision(cubes[j]);
    }
  }

  for (const cube of cubes) {
    cube.update();
    cube.Qx += cube.dx;
    cube.Qy += cube.dy;
    cube.Qz += cube.dz;
    cube.dx *= 0.98;
    cube.dy *= 0.98;
    cube.dz *= 0.98;
    cube.draw();
  }

  requestAnimationFrame(animate);
}


  animate();
});
