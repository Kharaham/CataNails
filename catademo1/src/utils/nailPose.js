import { waitForOpenCV } from "./opencvLoader";

function toMatFromImage(cv, source) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return cv.matFromImageData(imgData);
}

function alphaToBinary(cv, rgbaMat, alphaThresh = 10) {
  const channels = new cv.MatVector();
  cv.split(rgbaMat, channels);
  const alpha = channels.get(3);
  const bin = new cv.Mat();
  cv.threshold(alpha, bin, alphaThresh, 255, cv.THRESH_BINARY);
  alpha.delete();
  channels.delete();
  return bin;
}

function refineBinaryMask(cv, bin, kernelSize = 3, blurSize = 1) {
  const kernel = cv.getStructuringElement(
    cv.MORPH_ELLIPSE,
    new cv.Size(kernelSize, kernelSize)
  );
  const closed = new cv.Mat();
  cv.morphologyEx(bin, closed, cv.MORPH_CLOSE, kernel);

  const inv = new cv.Mat();
  cv.bitwise_not(closed, inv);
  const filled = new cv.Mat();
  inv.copyTo(filled);
  const ffMask = new cv.Mat.zeros(inv.rows + 2, inv.cols + 2, cv.CV_8UC1);
  cv.floodFill(filled, ffMask, { x: 0, y: 0 }, new cv.Scalar(0));
  ffMask.delete();
  const filledInv = new cv.Mat();
  cv.bitwise_not(filled, filledInv);

  const refined = new cv.Mat();
  cv.bitwise_or(closed, filledInv, refined);

  const blurred = new cv.Mat();
  const k = Math.max(1, blurSize * 2 + 1);
  cv.GaussianBlur(refined, blurred, new cv.Size(k, k), 0);

  const binRefined = new cv.Mat();
  cv.threshold(blurred, binRefined, 127, 255, cv.THRESH_BINARY);

  kernel.delete();
  closed.delete();
  inv.delete();
  filled.delete();
  filledInv.delete();
  blurred.delete();
  return binRefined;
}

function poseFromMask(cv, bin) {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    bin,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE
  );
  hierarchy.delete();
  if (contours.size() === 0) {
    contours.delete();
    return null;
  }

  let maxIdx = 0,
    maxArea = 0;
  for (let i = 0; i < contours.size(); i++) {
    const a = cv.contourArea(contours.get(i));
    if (a > maxArea) {
      maxArea = a;
      maxIdx = i;
    }
  }
  const cnt = contours.get(maxIdx);
  const rotRect = cv.minAreaRect(cnt);

  let length = Math.max(rotRect.size.width, rotRect.size.height);
  let width = Math.min(rotRect.size.width, rotRect.size.height);

  let angle = rotRect.angle;
  if (rotRect.size.width < rotRect.size.height) angle += 90.0;
  const theta = (angle * Math.PI) / 180;

  const pose = {
    cx: rotRect.center.x,
    cy: rotRect.center.y,
    angle: theta,
    angleDeg: angle,
    length,
    width,
    area: maxArea,
  };

  contours.delete();
  return pose;
}

export async function refineMaskAndPose(imageElOrBitmap, opts = {}) {
  const cv = await waitForOpenCV();
  const src = toMatFromImage(cv, imageElOrBitmap);
  const bin0 = alphaToBinary(cv, src, opts.alphaThresh ?? 10);
  const bin = refineBinaryMask(
    cv,
    bin0,
    opts.kernelSize ?? 3,
    opts.blurSize ?? 1
  );
  const pose = poseFromMask(cv, bin);
  src.delete();
  bin0.delete();
  bin.delete();
  return pose;
}
