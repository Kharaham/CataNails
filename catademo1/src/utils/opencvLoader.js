let cvReadyPromise = null;

export function waitForOpenCV() {
  if (cvReadyPromise) return cvReadyPromise;
  cvReadyPromise = new Promise((resolve) => {
    const check = () => {
      if (window.cv && window.cv.Mat) resolve(window.cv);
      else setTimeout(check, 50);
    };
    check();
  });
  return cvReadyPromise;
}