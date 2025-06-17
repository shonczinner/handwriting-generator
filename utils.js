
// Convert absolute [x, y, pen] points to delta format [dx, dy, pen]
export function toDeltaStrokes(points) {
  if (points.length === 0) return [];

  const deltas = [[0, 0, 0]]; // First delta is [0, 0, pen]
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2, pen] = points[i];
    deltas.push([x2 - x1, y2 - y1, pen]);
  }

  return deltas;
}

export function fromDeltaStrokes(deltas) {
  if (deltas.length === 0) return [];

  const absStrokes = [];
  let x = 0;
  let y = 0;

  for (const [dx, dy, pen] of deltas) {
    x += dx;
    y += dy;
    absStrokes.push([x, y, pen]);
  }

  return absStrokes;
}


export function denormalizeDeltas(points, meanX, meanY, stdX, stdY) {
  return points.map(([x, y, pen]) => [x * stdX + meanX, y * stdY + meanY, pen]);
}

// Normalize strokes: center the drawing around (0, 0)
export function normalizeDeltas(points, meanX, meanY, stdX, stdY) {
  if (points.length === 0) return [];

  if(!meanX){
      meanX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
       meanY = points.reduce((sum, p) => sum + p[1], 0) / points.length;

       const varianceX = points.reduce((sum, p) => sum + (p[0] - meanX) ** 2, 0) / points.length;
       const varianceY = points.reduce((sum, p) => sum + (p[1] - meanY) ** 2, 0) / points.length;

       stdX = Math.sqrt(varianceX) || 1; // avoid division by zero
       stdY = Math.sqrt(varianceY) || 1;
  }
 

  return points.map(([x, y, pen]) => [(x - meanX) / stdX, (y - meanY) / stdY, pen]);
}



// Convert stroke points to ONNX Tensor
export function strokesToTensor(strokes) {
  const data = new Float32Array(strokes.length * 3);
  for (let i = 0; i < strokes.length; i++) {
    data[i * 3 + 0] = strokes[i][0];
    data[i * 3 + 1] = strokes[i][1];
    data[i * 3 + 2] = strokes[i][2];
  }
  return new ort.Tensor("float32", data, [1, strokes.length, 3]);
}

// Convert ONNX Tensor back to array of [x, y, pen] strokes
export function tensorToDeltas(data) {
  const strokes = [];

  for (let i = 0; i < data.length; i += 3) {
    strokes.push([data[i], data[i + 1], data[i + 2]]);
  }

  return strokes;
}

export function drawStrokes(ctx, strokes) {
  if (!ctx || strokes.length === 0) return;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();

  ctx.scale(0.3, 0.3); //reduce drawing size
  ctx.translate(ctx.canvas.width / 10, ctx.canvas.height*0.25); // center the drawing

  ctx.beginPath();
  let isNewStroke = true;

  for (const [x, y, pen] of strokes) {
    if (isNewStroke) {
      ctx.moveTo(x, y);
      isNewStroke = false;
    } else {
      ctx.lineTo(x, y);
    }

    if (pen === 1) {
      // Pen lifted after this point — finish stroke segment
      isNewStroke = true;
    }
  }

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  // Reset current transformation matrix to the identity matrix
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
