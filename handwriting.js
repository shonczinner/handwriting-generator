import { encodeText } from "./tokenizer.js";
import { strokesToTensor } from "./utils.js";

let sampleSession;
let asciiTensor;

const initSession = await ort.InferenceSession.create("initial_state_model.onnx");
const initOutputs = await initSession.run({});

// Extract hidden states
const hidden = {};
const numLayers = Object.keys(initOutputs).filter(k => k.startsWith("hidden_core_")).length;


/** Load the ONNX handwriting model */
export async function initHandwritingModels() {
  sampleSession = await ort.InferenceSession.create("sample_model.onnx");
}

/** Encode text and store ascii tensor for inference */
export function setAscii(text) {
  const ascii = encodeText(text);
  asciiTensor = new ort.Tensor("int64", BigInt64Array.from(ascii.map(BigInt)), [1, ascii.length]);
}

async function getInitialHidden(){
    // Initialize hidden state using initial_state_model.onnx
  const initSession = await ort.InferenceSession.create("initial_state_model.onnx");
  const initOutputs = await initSession.run({});
  
  // Extract hidden states
  const hidden = {};
  const numLayers = Object.keys(initOutputs).filter(k => k.startsWith("hidden_core_")).length;
  for (let i = 0; i < numLayers; i++) {
    hidden[`hidden_core_${i}.1`] = initOutputs[`hidden_core_${i}`];
  }
  hidden["kappa.1"] = initOutputs["kappa"];
  hidden["w0.1"] = initOutputs["w0"];
  return hidden

}

/** Prime the model using a known stroke sequence (non-autoregressive)
 * Returns the final hidden state after full priming */
export async function primeModel(strokePoints) {
  
  const strokes = strokesToTensor(strokePoints); // shape: [1, N, 3]
  const numSteps = strokes.dims[1];

  let hidden = await getInitialHidden();

  // Loop through stroke sequence
  for (let t = 0; t < numSteps; t++) {
    const inputVec = strokes.data.slice(t * 3, (t + 1) * 3);
    const inputTensor = new ort.Tensor("float32", new Float32Array(inputVec), [1, 1, 3]);

    // Prepare input
    const feeds = {
      input: inputTensor,
      ascii: asciiTensor,
      temperature: new ort.Tensor("float32", new Float32Array([1])),
      ...hidden
    };

    // Run a single step
    //console.log("Model inputs:", sampleSession.inputNames);
    //console.log("Feeds:", feeds);
    const output = await sampleSession.run(feeds);

    // Update hidden state from outputs
    let outputIdx = 1; // index 0 is "output"
    for (let i = 0; i < numLayers; i++) {
      hidden[`hidden_core_${i}.1`] = output[`hidden_core_${i}`];
    }
    hidden["kappa.1"] = output["kappa"];
    hidden["w0.1"] = output["w0"];
  }
  
  // reset attention hidden states
  const hidden2 = await getInitialHidden();
  hidden["kappa.1"] = hidden2["kappa.1"];
  hidden["w0.1"] = hidden2["w0.1"];

  return hidden;
}

/** Run one sample step given current input and hidden state */
export async function sampleStep(inputVec, hidden, temperature) {
  if(!hidden){
     hidden = await getInitialHidden();
  }
  if(!inputVec){
    inputVec = [0,0,0];
  }

  const inputTensor = new ort.Tensor("float32", new Float32Array(inputVec), [1, 1, 3]);
  const feeds = {
    input: inputTensor,
    ascii: asciiTensor,
    temperature: new ort.Tensor("float32", new Float32Array([temperature])),
    ...hidden,
  };

  const result = await sampleSession.run(feeds);

  const nextDelta = result["output"].data;
  const phi = result["phi"].data;

  const updatedHidden = {};
  const numLayers = Object.keys(result).filter(k => k.startsWith("hidden_core_")).length;
  for (let i = 0; i < numLayers; i++) {
    updatedHidden[`hidden_core_${i}.1`] = result[`hidden_core_${i}`];
  }
  updatedHidden["kappa.1"] = result["kappa"];
  updatedHidden["w0.1"] = result["w0"];

  return {
    nextDelta,
    hidden: updatedHidden,
    phi
  };
}
