import './style.css'

const getBackgroundColor = function(data) {
  const histogram = {}
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = data.slice(i, i + 4);
    const key = `${r},${g},${b},${a}`;
    if (key in histogram) {
      histogram[key]++;
    } else {
      histogram[key] = 1;
    }
  }
  // Find the maximum
  let max = 0;
  let maxKey = null;
  for (const key in histogram) {
    if (histogram[key] >= max) {
      max = histogram[key];
      maxKey = key;
    }
  }
  maxKey = maxKey.split(',');
  maxKey = maxKey.map((x) => parseInt(x));
  console.log(histogram);
  return maxKey;
};

const getTile = function(data, options, sx, sy) {
  const { width, height, tileWidth, tileHeight } = options;
  const canvas = document.createElement('canvas');
  canvas.width = tileWidth;
  canvas.height = tileHeight;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(tileWidth, tileHeight);
  const pixels = imageData.data;
  for (let x = 0; x < tileWidth; x++) {
    for (let y = 0; y < tileHeight; y++) {
      const i = (y * tileWidth + x) * 4;
      const [r, g, b, a] = data.slice(i, i + 4);
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = a;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

const generateGraph = function(data, options) {
  const { width, height, tileWidth, tileHeight } = options;
  const xtiles = Math.ceil(width / tileWidth);
  const ytiles = Math.ceil(height / tileHeight);
  for (let xtile = 0; xtile < xtiles; xtile++) {
    for (let ytile = 0; ytile < ytiles; ytile++) {
      const x = xtile * tileWidth;
      const y = ytile * tileHeight;
      const canvas = getTile(data, options, x, y);
      document.body.appendChild(canvas);
    }
  }
};

const generateMap = function(img) {
  const canvas = document.createElement('canvas');
  const width = img.width;
  const height = img.height;
  canvas.width = width;
  canvas.height = height;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const backgroundColor = getBackgroundColor(data);
  const options = {
    backgroundColor,
    width,
    height,
    tileWidth: 32,
    tileHeight: 32
  };
  console.log(backgroundColor);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  ctx.putImageData(imageData, 0, 0);
};

const main = function() {
  const img = document.createElement('img');
  img.src = 'magecity_1.png';
  document.body.appendChild(img);
  img.onload = () => generateMap(img);
};

document.addEventListener('DOMContentLoaded', main, false);