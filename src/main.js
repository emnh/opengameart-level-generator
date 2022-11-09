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
  // console.log(histogram);
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
  
  const left = new Uint8Array(tileHeight * 4);
  const right = new Uint8Array(tileHeight * 4);
  const top = new Uint8Array(tileWidth * 4);
  const bottom = new Uint8Array(tileWidth * 4);

  for (let x = 0; x < tileWidth; x++) {
    for (let y = 0; y < tileHeight; y++) {
      const tx = x + sx;
      const ty = y + sy;
      const i = (ty * width + tx) * 4;
      const i2 = (y * tileWidth + x) * 4;
      const [r, g, b, a] = data.slice(i, i + 4);

      if (x == 0) {
        const i3 = y * 4;
        left[i3] = r;
        left[i3 + 1] = g;
        left[i3 + 2] = b;
        left[i3 + 3] = a;
      }
      if (x == tileWidth - 1) {
        const i3 = y * 4;
        right[i3] = r;
        right[i3 + 1] = g;
        right[i3 + 2] = b;
        right[i3 + 3] = a;
      }
      if (y == 0) {
        const i3 = x * 4;
        top[i3] = r;
        top[i3 + 1] = g;
        top[i3 + 2] = b;
        top[i3 + 3] = a;
      }
      if (y == tileHeight - 1) {
        const i3 = x * 4;
        bottom[i3] = r;
        bottom[i3 + 1] = g;
        bottom[i3 + 2] = b;
        bottom[i3 + 3] = a;
      }

      pixels[i2] = r;
      pixels[i2 + 1] = g;
      pixels[i2 + 2] = b;
      pixels[i2 + 3] = a;
    }
  }
  const discriminator = {
    left,
    right,
    top,
    bottom
  };
  ctx.putImageData(imageData, 0, 0);
  return {
    canvas,
    discriminator
  };
};

const generateGraph = function(data, options) {
  const { width, height, tileWidth, tileHeight } = options;
  const xtiles = Math.ceil(width / tileWidth);
  const ytiles = Math.ceil(height / tileHeight);
  
  const tiles = [];
  let tileIndex = 0;
  const tileBordersLeft = {};
  const tileBordersRight = {};
  const tileBordersTop = {};
  const tileBordersBottom = {};

  for (let xtile = 0; xtile < xtiles; xtile++) {
    for (let ytile = 0; ytile < ytiles; ytile++) {
      const tileIndex = tiles.length;
      const x = xtile * tileWidth;
      const y = ytile * tileHeight;
      const tile = getTile(data, options, x, y);
      const { canvas, discriminator } = tile;
      tiles.push(tile);
      const { left, right, top, bottom } = discriminator;
      const leftDiscriminator = left.join(',');
      const rightDiscriminator = right.join(',');
      const topDiscriminator = top.join(',');
      const bottomDiscriminator = bottom.join(',');
      if (leftDiscriminator in tileBordersLeft) {
        tileBordersLeft[leftDiscriminator].push(tileIndex);
      } else {
        tileBordersLeft[leftDiscriminator] = [tileIndex];
      }
      if (rightDiscriminator in tileBordersRight) {
        tileBordersRight[rightDiscriminator].push(tileIndex);
      } else {
        tileBordersRight[rightDiscriminator] = [tileIndex];
      }
      if (topDiscriminator in tileBordersTop) {
        tileBordersTop[topDiscriminator].push(tileIndex);
      } else {
        tileBordersTop[topDiscriminator] = [tileIndex];
      }
      if (bottomDiscriminator in tileBordersBottom) {
        tileBordersBottom[bottomDiscriminator].push(tileIndex);
      } else {
        tileBordersBottom[bottomDiscriminator] = [tileIndex];
      }
      options.logParent.appendChild(canvas);
    }
  }

  for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
    const tile = tiles[tileIndex];
    const { discriminator } = tile;
    const { left, right, top, bottom } = discriminator;
    const leftDiscriminator = left.join(',');
    const rightDiscriminator = right.join(',');
    const topDiscriminator = top.join(',');
    const bottomDiscriminator = bottom.join(',');
    const leftMatches = tileBordersRight[leftDiscriminator].remove(tileIndex);
    const rightMatches = tileBordersLeft[rightDiscriminator].remove(tileIndex);
    const topMatches = tileBordersBottom[topDiscriminator].remove(tileIndex);
    const bottomMatches = tileBordersTop[bottomDiscriminator].remove(tileIndex);
    tile.leftMatches = leftMatches;
    tile.rightMatches = rightMatches;
    tile.topMatches = topMatches;
    tile.bottomMatches = bottomMatches;
  }

  
};

const generateMap = function(img) {
  const canvas = document.createElement('canvas');
  const width = img.width;
  const height = img.height;
  canvas.width = width;
  canvas.height = height;
  // document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const backgroundColor = getBackgroundColor(data);
  const div = document.createElement('div');
  document.body.appendChild(div);
  const options = {
    backgroundColor,
    width,
    height,
    tileWidth: 32,
    tileHeight: 32,
    logParent: div
  };
  generateGraph(data, options);

  // for (let i = 0; i < data.length; i += 4) {
  //   data[i] = 255 - data[i];
  //   data[i + 1] = 255 - data[i + 1];
  //   data[i + 2] = 255 - data[i + 2];
  // }
  // ctx.putImageData(imageData, 0, 0);
};

const main = function() {
  const img = document.createElement('img');
  img.src = 'magecity_1.png';
  document.body.appendChild(img);
  img.onload = () => generateMap(img);
};

document.addEventListener('DOMContentLoaded', main, false);