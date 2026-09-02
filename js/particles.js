window.SNM = window.SNM || {};

SNM.initParticles = function () {
  var canvas = document.getElementById("network-bg");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var particles = [];
  var N = 36;
  var maxDist = 120;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function Particle() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.6;
    this.vy = (Math.random() - 0.5) * 0.6;
    this.r = 1.2 + Math.random() * 1.6;
  }

  Particle.prototype.step = function () {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
  };

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var i, j, a, b, dx, dy, d;

    for (i = 0; i < particles.length; i++) {
      a = particles[i];
      a.step();
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();

      for (j = i + 1; j < particles.length; j++) {
        b = particles[j];
        dx = a.x - b.x;
        dy = a.y - b.y;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) {
          ctx.strokeStyle = "rgba(255,255,255," + (0.22 * (1 - d / maxDist)) + ")";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  particles = [];
  for (var k = 0; k < N; k++) particles.push(new Particle());
  draw();
};
