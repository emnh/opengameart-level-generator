import './style.css'
import * as d3 from 'd3';

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

  // const rfk = 1;
  // const rf = x => Math.ceil(x / rfk) * rfk;
  const rf = x => x;

  for (let x = 0; x < tileWidth; x++) {
    for (let y = 0; y < tileHeight; y++) {
      const tx = x + sx;
      const ty = y + sy;
      const i = (ty * width + tx) * 4;
      const i2 = (y * tileWidth + x) * 4;
      const [r, g, b, a] = data.slice(i, i + 4);

      if (x == 0) {
        const i3 = y * 4;
        left[i3 + 0] = rf(r);
        left[i3 + 1] = rf(g);
        left[i3 + 2] = rf(b);
        left[i3 + 3] = rf(a);
      }
      if (x == tileWidth - 1) {
        const i3 = y * 4;
        right[i3 + 0] = rf(r);
        right[i3 + 1] = rf(g);
        right[i3 + 2] = rf(b);
        right[i3 + 3] = rf(a);
      }
      if (y == 0) {
        const i3 = x * 4;
        top[i3 + 0] = rf(r);
        top[i3 + 1] = rf(g);
        top[i3 + 2] = rf(b);
        top[i3 + 3] = rf(a);
      }
      if (y == tileHeight - 1) {
        const i3 = x * 4;
        bottom[i3 + 0] = rf(r);
        bottom[i3 + 1] = rf(g);
        bottom[i3 + 2] = rf(b);
        bottom[i3 + 3] = rf(a);
      }

      pixels[i2 + 0] = r;
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
  const { backgroundColor, width, height, tileWidth, tileHeight } = options;
  const xtiles = Math.ceil(width / tileWidth);
  const ytiles = Math.ceil(height / tileHeight);
  
  const tiles = [];
  let tileIndex = 0;
  const tileBordersLeft = {};
  const tileBordersRight = {};
  const tileBordersTop = {};
  const tileBordersBottom = {};

  const threshold = 5;
  // TODO: Should be different if width and height are different.
  const sumThreshold = threshold * Math.max(tileWidth, tileHeight);

  const keyFunc = x => {
    const sum = x.reduce((a, b) => a + b, 0);
    // console.log("sum", sum);
    return Math.round(sum / sumThreshold) * sumThreshold;
    // return x.join(',');
  };

  const compareFunc = (a, b) => {
    const c = 
      a
        .map((x, i) => x - b[i] <= threshold)
        .reduce((a, b) => a && b, true);
    return c;
  };

  for (let xtile = 0; xtile < xtiles; xtile++) {
    for (let ytile = 0; ytile < ytiles; ytile++) {
      const tileIndex = tiles.length;
      const x = xtile * tileWidth;
      const y = ytile * tileHeight;
      const tile = getTile(data, options, x, y);
      tile.x = x;
      tile.y = y;
      const { canvas, discriminator } = tile;
      tiles.push(tile);
      const { left, right, top, bottom } = discriminator;
      const leftDiscriminator = keyFunc(left);
      const rightDiscriminator = keyFunc(right);
      const topDiscriminator = keyFunc(top);
      const bottomDiscriminator = keyFunc(bottom);
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
    const { canvas, discriminator } = tile;
    const { left, right, top, bottom } = discriminator;
    const leftDiscriminator = keyFunc(left);
    const rightDiscriminator = keyFunc(right);
    const topDiscriminator = keyFunc(top);
    const bottomDiscriminator = keyFunc(bottom);
    const f = x => {
      const noSelfLoop = x != tileIndex;
      return noSelfLoop;
    };
    const g = compareFunc;
    const leftMatches = 
      leftDiscriminator in tileBordersRight ?
        tileBordersRight[leftDiscriminator].filter(f).filter(id => {
          const otherTile = tiles[id];
          return g(left, otherTile.discriminator.right);
        }
    ) : [];
    const rightMatches =
      rightDiscriminator in tileBordersLeft ?
        tileBordersLeft[rightDiscriminator].filter(f).filter(id => {
          const otherTile = tiles[id];
          return g(right, otherTile.discriminator.left);
        }
    ) : [];
    const topMatches =
      topDiscriminator in tileBordersBottom ?
        tileBordersBottom[topDiscriminator].filter(f).filter(id => {
          const otherTile = tiles[id];
          return g(top, otherTile.discriminator.bottom);
        }
    ) : [];
    const bottomMatches =
      bottomDiscriminator in tileBordersTop ?
        tileBordersTop[bottomDiscriminator].filter(f).filter(id => {
          const otherTile = tiles[id];
          return g(bottom, otherTile.discriminator.top);
        }
    ) : [];

    // const rightMatches = rightDiscriminator in tileBordersLeft ? tileBordersLeft[rightDiscriminator].filter(f) : [];
    // const topMatches = topDiscriminator in tileBordersBottom ? tileBordersBottom[topDiscriminator].filter(f) : [];
    // const bottomMatches = bottomDiscriminator in tileBordersTop ? tileBordersTop[bottomDiscriminator].filter(f) : [];
    
    let leftDiscriminatorIsBackgroundColor = true;
    for (let i = 0; i < left.length; i += 4) {
      const [r, g, b, a] = left.slice(i, i + 4);
      if (r != backgroundColor[0] || g != backgroundColor[1] || b != backgroundColor[2] || a != backgroundColor[3]) {
        leftDiscriminatorIsBackgroundColor = false;
        break;
      }
    }
    let rightDiscriminatorIsBackgroundColor = true;
    for (let i = 0; i < right.length; i += 4) {
      const [r, g, b, a] = right.slice(i, i + 4);
      if (r != backgroundColor[0] || g != backgroundColor[1] || b != backgroundColor[2] || a != backgroundColor[3]) {
        rightDiscriminatorIsBackgroundColor = false;
        break;
      }
    }
    let topDiscriminatorIsBackgroundColor = true;
    for (let i = 0; i < top.length; i += 4) {
      const [r, g, b, a] = top.slice(i, i + 4);
      if (r != backgroundColor[0] || g != backgroundColor[1] || b != backgroundColor[2] || a != backgroundColor[3]) {
        topDiscriminatorIsBackgroundColor = false;
        break;
      }
    }
    let bottomDiscriminatorIsBackgroundColor = true;
    for (let i = 0; i < bottom.length; i += 4) {
      const [r, g, b, a] = bottom.slice(i, i + 4);
      if (r != backgroundColor[0] || g != backgroundColor[1] || b != backgroundColor[2] || a != backgroundColor[3]) {
        bottomDiscriminatorIsBackgroundColor = false;
        break;
      }
    }
    // const leftDiscriminatorIsBackgroundColor = false;
    // const rightDiscriminatorIsBackgroundColor = false;
    // const topDiscriminatorIsBackgroundColor = false;
    // const bottomDiscriminatorIsBackgroundColor = false;

    if (leftDiscriminatorIsBackgroundColor) {
      tile.leftMatches = [];
    } else {
      tile.leftMatches = leftMatches;
    }
    if (rightDiscriminatorIsBackgroundColor) {
      tile.rightMatches = [];
    } else {
      tile.rightMatches = rightMatches;
    }
    if (topDiscriminatorIsBackgroundColor) {
      tile.topMatches = [];
    } else {
      tile.topMatches = topMatches;
    }
    if (bottomDiscriminatorIsBackgroundColor) {
      tile.bottomMatches = [];
    } else {
      tile.bottomMatches = bottomMatches;
    }
  }

  // Create and display graph from the tile canvases using the d3 visualization library
  const graph = {
    nodes: [],
    links: []
  };

  for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
    const tile = tiles[tileIndex];
    const node = {
      id: tileIndex,
      tile: tile
    };
    graph.nodes.push(node);
  }

  for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
    const tile = tiles[tileIndex];
    const { leftMatches, rightMatches, topMatches, bottomMatches } = tile;
    for (let leftMatch of leftMatches) {
      const link = {
        source: tileIndex,
        target: leftMatch
      };
      graph.links.push(link);
    }
    for (let rightMatch of rightMatches) {
      const link = {
        source: tileIndex,
        target: rightMatch
      };
      graph.links.push(link);
    }
    for (let topMatch of topMatches) {
      const link = {
        source: tileIndex,
        target: topMatch
      };
      graph.links.push(link);
    }
    for (let bottomMatch of bottomMatches) {
      const link = {
        source: tileIndex,
        target: bottomMatch
      };
      graph.links.push(link);
    }
  }

  const d3width = 800;
  const d3height = 800;

  const svg = d3.select(options.logParent).append('svg')
      .attr('width', 800)
      .attr('height', 800);

  const dx = tileWidth;
  const dy = tileHeight;
  const radius = Math.sqrt(dx * dx + dy * dy) / 2;
  
  const simulation = d3.forceSimulation(graph.nodes)
      .force('link', d3.forceLink(graph.links).id((d) => d.id))
      .force('charge', d3.forceManyBody(-100))
      .force('collision', d3.forceCollide(radius))
      .force('center', d3.forceCenter(d3width / 2, d3height / 2))
      .force('x', d3.forceX(d3width / 2).strength(0.1))
      .force('y', d3.forceY(d3height / 2).strength(0.1));

  const scale = 1.1;

  const node = svg.append('g')
      .attr('class', 'nodes')
    .selectAll('image')
    .data(graph.nodes)
    .enter().append('image')
      .attr('xlink:href', (d) => {
        const tile = tiles[d.id];
        const { canvas } = tile;
        return canvas.toDataURL();
      })
      .attr('x', (d) => {
        const tile = tiles[d.id];
        const { x } = tile;
        return x * scale;
      })
      .attr('y', (d) => {
        const tile = tiles[d.id];
        const { y } = tile;
        return y * scale;
      })
      .attr('width', tileWidth)
      .attr('height', tileHeight)
      .append('title')
        .text((d) => {
          const tile1 = tiles[d.id];
          const discriminator1 = tile1.discriminator;
          const { top } = discriminator1;
          const k = 10;

          const nbID = d.id > 0 ? d.id - 1 : 0;
          const tile2 = tiles[nbID];
          const discriminator2 = tile2.discriminator;
          const { bottom } = discriminator2;
          const keys = [keyFunc(top), keyFunc(bottom)];
          const val = compareFunc(top, bottom);
          
          const obj = {
            id: d.id, top: top.slice(0, k), bottom: bottom.slice(0, k),
            keys, val
          };
          // const tile2 = tiles[d.id - 1];

          return JSON.stringify(obj);
        });
      ;
      // .call(d3.drag()
      //     .on('start', dragstarted)
      //     .on('drag', dragged)
      //     .on('end', dragended));

  const link = svg.append('g')
      .attr('class', 'links')
    .selectAll('line')
    .data(graph.links)
    .enter().append('line')
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('x1', (d) => {
        const tile = tiles[d.source.id];
        const { x } = tile;
        return (x + tileWidth / 2) * scale;
      })
      .attr('y1', (d) => {
        const tile = tiles[d.source.id];
        const { y } = tile;
        return (y + tileHeight / 2) * scale;
      })
      .attr('x2', (d) => {
        const tile = tiles[d.target.id];
        const { x } = tile;
        return (x + tileWidth / 2) * scale;
      })
      .attr('y2', (d) => {
        const tile = tiles[d.target.id];
        const { y } = tile;
        return (y + tileHeight / 2) * scale;
      });

      // .attr('y1', (d) => d.source.y + tileHeight * scale / 2)
      // .attr('x2', (d) => d.target.x + tileWidth * scale / 2)
      // .attr('y2', (d) => d.target.y + tileHeight * scale / 2);

  // simulation
  //     .nodes(graph.nodes)
  //     .on('tick', () => {
  //       node
  //           .attr('x', (d) => d.x - tileWidth / 2)
  //           .attr('y', (d) => d.y - tileHeight / 2);
        
  //       link
  //           .attr('x1', (d) => d.source.x)
  //           .attr('y1', (d) => d.source.y)
  //           .attr('x2', (d) => d.target.x)
  //           .attr('y2', (d) => d.target.y);
  //     });
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