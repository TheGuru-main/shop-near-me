window.SNM = window.SNM || {};

SNM.initParticles = function () {
  var canvas = document.getElementById("network-bg");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var particles = [];
  var n = 32;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  for (var i = 0; i < n; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6
    });
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20,83,45,0.45)";
      ctx.fill();
    });
    for (var a = 0; a < particles.length; a++) {
      for (var b = a + 1; b < particles.length; b++) {
        var dx = particles[a].x - particles[b].x;
        var dy = particles[a].y - particles[b].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.strokeStyle = "rgba(20,83,45," + (0.18 * (1 - d / 120)) + ")";
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
};
