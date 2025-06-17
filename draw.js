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

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.offsetX;
      y = e.offsetY;
    }
    return { x, y };
  }

  function startDrawing(e) {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    isDrawing = true;
    lastX = x;
    lastY = y;
    if (!drawDots) ctx.beginPath();
    recordPoint(0);
    samplingInterval = setInterval(() => {
      recordPoint(0);
    }, 20);
  }

  function moveDrawing(e) {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoords(e);
    lastX = x;
    lastY = y;
  }

  function stopDrawing(e) {
    if (isDrawing) recordPoint(1);
    isDrawing = false;
    clearInterval(samplingInterval);
    samplingInterval = null;
    if (!drawDots) ctx.beginPath();
  }

  // Mouse events
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", moveDrawing);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseleave", stopDrawing);

  // Touch events
  canvas.addEventListener("touchstart", startDrawing, { passive: false });
  canvas.addEventListener("touchmove", moveDrawing, { passive: false });
  canvas.addEventListener("touchend", stopDrawing);
  canvas.addEventListener("touchcancel", stopDrawing);

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
