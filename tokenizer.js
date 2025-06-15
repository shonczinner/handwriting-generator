let vocab = {};
let invVocab = {};

export async function loadTokenizer(path = "vocab.json") {
  const res = await fetch(path);
  vocab = await res.json();
  invVocab = Object.fromEntries(Object.entries(vocab).map(([k, v]) => [v, k]));
}

export function encodeText(text) {
  return text.split("").map(c => vocab[c] ?? vocab[" "]);
}

export function decodeText(indices) {
  return indices.map(i => invVocab[i] ?? " ").join("");
}
