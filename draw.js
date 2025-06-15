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
      // Dot mode: draw small circle
      ctx.beginPath();
      ctx.arc(lastX, lastY, pen === 1 ? 2.5 : 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = pen === 1 ? "red" : "#000"; // red dot for lift points
      ctx.fill();
    } else {
      // Line mode: draw continuous stroke
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
    recordPoint(0); // Start of stroke

    samplingInterval = setInterval(() => {
      recordPoint(0); // Sample mid-stroke
    }, 15);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    lastX = e.offsetX;
    lastY = e.offsetY;
  });

  canvas.addEventListener("mouseup", () => {
    if (isDrawing) recordPoint(1); // Pen lifted
    isDrawing = false;
    clearInterval(samplingInterval);
    samplingInterval = null;
    if (!drawDots) ctx.beginPath();
  });

  canvas.addEventListener("mouseleave", () => {
    if (isDrawing) recordPoint(1); // Treat as lift
    isDrawing = false;
    clearInterval(samplingInterval);
    samplingInterval = null;
    if (!drawDots) ctx.beginPath();
  });

  return () => points;
}
