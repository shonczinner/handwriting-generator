export function enableCanvasDrawing(canvas, drawDots = false) {
  const ctx = canvas.getContext("2d");
  let isDrawing = false;
  let points = [];
  let samplingInterval = null;
  let lastX = 0;
  let lastY = 0;

  function recordPoint(pen) {
    points.push([lastX, lastY, pen]);

    if (drawDots) {
      ctx.beginPath();
      ctx.arc(lastX, lastY, pen === 1 ? 2.5 : 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = pen === 1 ? "red" : "#000";
      ctx.fill();
    } else {
      if (pen === 0) {
        ctx.lineTo(lastX, lastY);
        ctx.stroke();
      } else {
        ctx.moveTo(lastX, lastY);
      }
    }
  }

  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
    if (!drawDots) ctx.beginPath();
    recordPoint(0);

    samplingInterval = setInterval(() => {
      recordPoint(0);
    }, 20);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    lastX = e.offsetX;
    lastY = e.offsetY;
  });

  function stopDrawing() {
    if (isDrawing) recordPoint(1);
    isDrawing = false;
    clearInterval(samplingInterval);
    samplingInterval = null;
    if (!drawDots) ctx.beginPath();
  }

  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseleave", stopDrawing);

  // Return control methods
  return {
    getPoints: () => points,
    clear: () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stopDrawing();
      points = [];
    }
  };
}
