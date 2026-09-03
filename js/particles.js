window.SNM = window.SNM || {};

SNM.initParticles = function () {
  var canvas = document.getElementById("network-bg");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var particles = [];
  var n = 36;

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
      vy: (Math.random() - 0.5) * 0.6,
      r: 1.5 + Math.random() * 2
    });
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(22,101,52,0.35)";
      ctx.fill();
      for (var j = i + 1; j < particles.length; j++) {
        var q = particles[j];
        var dx = p.x - q.x;
        var dy = p.y - q.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 110) {
          ctx.strokeStyle = "rgba(22,101,52," + (0.18 * (1 - d / 110)) + ")";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
};
