import { loadTokenizer } from "./tokenizer.js";
import { normalizeDeltas, tensorToDeltas, drawStrokes,denormalizeDeltas,
    toDeltaStrokes, fromDeltaStrokes
} from "./utils.js";
import { initHandwritingModels, setAscii, primeModel, sampleStep } from "./handwriting.js";
import { enableCanvasDrawing} from "./draw.js";

let hiddenState;
let strokes = [];
let deltas = []
let canvasCtx;
let canvasControls;
const maxSteps = 1000;  // Set max steps here
let currentStep = 0;
let normalizationStats = null;  // store mean/std for denormalization
let primed = false;

async function setup() {
  await loadTokenizer();
  await initHandwritingModels();
  await loadNormalizationStats()
  canvasControls = enableCanvasDrawing(document.getElementById("inputCanvas"),false);
  canvasCtx = document.getElementById("outputCanvas").getContext("2d");
}

async function loadNormalizationStats() {
  const res = await fetch('normalize_stats.json');
  normalizationStats = await res.json();
}

document.getElementById("clearButton").addEventListener("click", () => {
  canvasControls.clear();
});

document.getElementById("generateBtn").onclick = async () => {
  strokes = [];
  deltas = []
  const promptText = document.getElementById("prompt").value;
  const primerText = document.getElementById("primer").value;
  const primingStrokes = canvasControls.getPoints();  // Capture strokes from input canvas

  if (!promptText ) {
    alert("Please enter text.");
    return;
  }


  if(primingStrokes.length === 0){
    primed = false
    setAscii(promptText);
    currentStep = 0;  // Reset step count
    requestAnimationFrame(drawLoop);

  }else{
    primed = true
    setAscii(primerText);
    const primingDeltas = toDeltaStrokes(primingStrokes)
    //const normalizedDeltas = normalizeDeltas(primingDeltas);
    //const normalizedDeltas = primingDeltas;
    const normalizedDeltas = normalizeDeltas(
      primingDeltas,
      normalizationStats.mu_dx,
      normalizationStats.mu_dy,
      normalizationStats.sd_dx,
      normalizationStats.sd_dy
    );

    hiddenState = await primeModel(normalizedDeltas); // Initialize model hidden state

    // // Denormalize the priming strokes back for drawing
    // deltas = normalizedDeltas
    // const denormalizedDeltas = denormalizeDeltas(
    //     normalizedDeltas,
    //     normalizationStats.mu_dx,
    //     normalizationStats.mu_dy,
    //     normalizationStats.sd_dx,
    //     normalizationStats.sd_dy
    // );


    //strokes = fromDeltaStrokes(denormalizedDeltas)

    setAscii(promptText);
    currentStep = 0;  // Reset step count
    requestAnimationFrame(drawLoop);
  }
};

async function drawLoop() {
  if (currentStep >= maxSteps) {
    console.log("Reached max steps, stopping generation.");
    return;  // Stop the loop when max steps reached
  }

  let nextDelta, hidden, phi;

  if (deltas.length === 0) {
    ({ nextDelta, hidden, phi } = await sampleStep());
  } else {
    const lastDelta = deltas[deltas.length - 1];
    ({ nextDelta, hidden, phi } = await sampleStep(lastDelta, hiddenState));
  }

  const next = tensorToDeltas(nextDelta)[0];

  // Append and update hidden state
  deltas.push(next);
  hiddenState = hidden;


  const denormalizedDeltas = denormalizeDeltas(
      [next],
      normalizationStats.mu_dx,
      normalizationStats.mu_dy,
      normalizationStats.sd_dx,
      normalizationStats.sd_dy
  )[0];

  if(strokes.length===0){
    strokes = [denormalizedDeltas]
  }else{
    const lastStroke = strokes[strokes.length - 1];
    strokes.push([denormalizedDeltas[0]+lastStroke[0],denormalizedDeltas[1]+lastStroke[1],
                    denormalizedDeltas[2]])
  }

  
  drawStrokes(canvasCtx, strokes);


  if (phi) {
    const phiArr = Array.from(phi);
    const phiLast = phiArr[phiArr.length - 1];  // phi[:, :, U-1]
    const phiMax = Math.max(...phiArr);

    if (phiLast === phiMax) {
      console.log("phi heuristic has ended generation.");
      return;
    }
  }
  currentStep++;
  requestAnimationFrame(drawLoop);
}

setup();
