export function countChars(text) {
  return Array.from(String(text || '')).length;
}

export function validatePostLength(text, max = 280) {
  const length = countChars(text);
  return {
    ok: length <= max,
    length,
    max,
    overflow: Math.max(0, length - max)
  };
}
