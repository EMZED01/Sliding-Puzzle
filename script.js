// Sliding Puzzle — mobile-first, colorful, no-sound version
const imgInput = document.getElementById('imgInput');
const boardEl = document.getElementById('board');
const shuffleBtn = document.getElementById('shuffleBtn');
const restartBtn = document.getElementById('restartBtn');
const sizeSelect = document.getElementById('sizeSelect');
const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const winPopup = document.getElementById('winPopup');
const finalTime = document.getElementById('finalTime');
const finalMoves = document.getElementById('finalMoves');
const playAgain = document.getElementById('playAgain');
const hiddenCanvas = document.getElementById('hiddenCanvas');

let size = parseInt(sizeSelect.value,10);
let tiles = []; // array of tile objects {index, correctIndex, el, imgData...}
let blankIndex;
let started = false;
let timer = null;
let startTime = null;
let moves = 0;
let img = null;
let tileSizePx = 0;

// Helpers
function formatTime(ms){
  if(!ms) return '00:00';
  const totalSec = Math.floor(ms/1000);
  const m = Math.floor(totalSec/60).toString().padStart(2,'0');
  const s = (totalSec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function updateTimer(){
  if(!started) return;
  const now = Date.now();
  timeEl.textContent = formatTime(now - startTime);
}

function startTimer(){
  if(started) return;
  started = true;
  startTime = Date.now();
  timer = setInterval(updateTimer, 300);
}

function stopTimer(){
  started = false;
  if(timer) clearInterval(timer);
  timer = null;
}

function setMoves(n){
  moves = n;
  movesEl.textContent = moves;
}

function enableControls(enabled){
  shuffleBtn.disabled = !enabled;
  restartBtn.disabled = !enabled;
}

// Create board visuals
function buildBoard(){
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;
  tileSizePx = Math.floor(boardEl.clientWidth / size) - 8; // spacing
  tiles.forEach(t=>{
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.index = t.index;
    tile.style.width = '100%';
    tile.style.height = '100%';
    tile.style.borderRadius = '6px';
    if(t.isBlank){
      tile.classList.add('blank');
    } else {
      tile.style.backgroundImage = `url(${t.dataUrl})`;
    }
    tile.addEventListener('click', ()=>onTileClick(t.index));
    // touch drag support - simple tap only for this build
    boardEl.appendChild(tile);
    t.el = tile;
  });
}

// Image processing: slice into tiles using canvas
function sliceImageToTiles(image, n){
  const canvas = hiddenCanvas;
  const ctx = canvas.getContext('2d');
  // Make square crop centered to adapt to various images (keeps mobile look)
  const minSide = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = Math.floor((image.naturalWidth - minSide) / 2);
  const sy = Math.floor((image.naturalHeight - minSide) / 2);
  canvas.width = minSide;
  canvas.height = minSide;
  ctx.clearRect(0,0,canvas.width, canvas.height);
  ctx.drawImage(image, sx, sy, minSide, minSide, 0,0,canvas.width, canvas.height);

  const tilePx = Math.floor(canvas.width / n);
  const out = [];
  for(let row=0; row<n; row++){
    for(let col=0; col<n; col++){
      const x = col * tilePx;
      const y = row * tilePx;
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = tilePx;
      tileCanvas.height = tilePx;
      const tctx = tileCanvas.getContext('2d');
      tctx.drawImage(canvas, x, y, tilePx, tilePx, 0,0, tilePx, tilePx);
      const dataUrl = tileCanvas.toDataURL();
      out.push(dataUrl);
    }
  }
  return out;
}

// Initialize tiles data model
function initTiles(dataUrls, n){
  tiles = [];
  const total = n*n;
  for(let i=0;i<total;i++){
    tiles.push({
      index: i, // current position index
      correctIndex: i,
      dataUrl: dataUrls[i],
      isBlank: false,
      el: null
    });
  }
  // set last tile as blank
  tiles[total-1].isBlank = true;
  tiles[total-1].dataUrl = '';
  blankIndex = total-1;
  buildBoard();
  setMoves(0);
  timeEl.textContent = '00:00';
  stopTimer();
  enableControls(true);
}

// shuffle by performing random legal moves (keeps solvable)
function shuffleMoves(times=200){
  const dirs = [[0,-1],[0,1],[-1,0],[1,0]]; // col,row changes
  const n = size;
  let last = null;
  for(let i=0;i<times;i++){
    const bRow = Math.floor(blankIndex / n);
    const bCol = blankIndex % n;
    const options = [];
    for(const [dc,dr] of dirs){
      const c = bCol + dc;
      const r = bRow + dr;
      if(c>=0 && c<n && r>=0 && r<n){
        const idx = r*n + c;
        if(idx !== last) options.push(idx);
      }
    }
    if(options.length===0) continue;
    const pick = options[Math.floor(Math.random()*options.length)];
    moveTileByIndex(pick, false); // move without counting as player move
    last = blankIndex; // previous blank becomes this for next iteration
  }
  setMoves(0);
}

// move tile if adjacent to blank
function canMove(idx){
  const n = size;
  const r1 = Math.floor(idx / n), c1 = idx % n;
  const r2 = Math.floor(blankIndex / n), c2 = blankIndex % n;
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return (dr + dc) === 1;
}

function swapPositions(i1,i2){
  const t1 = tiles[i1];
  const t2 = tiles[i2];
  // swap data urls and blank flags
  const tmpData = t1.dataUrl; const tmpBlank = t1.isBlank;
  t1.dataUrl = t2.dataUrl; t1.isBlank = t2.isBlank;
  t2.dataUrl = tmpData; t2.isBlank = tmpBlank;
  // update DOM backgrounds
  if(t1.el) t1.el.style.backgroundImage = t1.isBlank ? '' : `url(${t1.dataUrl})`;
  if(t2.el) t2.el.style.backgroundImage = t2.isBlank ? '' : `url(${t2.dataUrl})`;
  if(t1.isBlank) t1.el.classList.add('blank'); else t1.el.classList.remove('blank');
  if(t2.isBlank) t2.el.classList.add('blank'); else t2.el.classList.remove('blank');
}

function moveTileByIndex(idx, countMove=true){
  if(!canMove(idx)) return false;
  swapPositions(idx, blankIndex);
  blankIndex = idx;
  if(countMove) {
    setMoves(moves+1);
    if(!started) startTimer();
  }
  if(checkWin()) onWin();
  return true;
}

function onTileClick(idx){
  moveTileByIndex(idx, true);
}

// Check win: all tiles in correct order (blank at end)
function checkWin(){
  for(let i=0;i<tiles.length;i++){
    const t = tiles[i];
    // blank should be at last index
    if(t.isBlank && i !== tiles.length-1) return false;
    if(!t.isBlank){
      // find its original index data position by comparing dataUrls to initial ordering
      if(t.dataUrl !== originalDataUrls[t.correctIndex]) return false;
    }
  }
  return true;
}

// We'll keep a copy of original dataUrls for win checks
let originalDataUrls = [];

// UI event handlers
imgInput.addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = ()=>{
    img = image;
    prepareFromImage();
    URL.revokeObjectURL(url);
  };
  image.onerror = ()=>{
    alert('Could not load image. Try another one.');
  };
  image.src = url;
});

sizeSelect.addEventListener('change', ()=>{
  size = parseInt(sizeSelect.value,10);
  if(img) prepareFromImage();
});

shuffleBtn.addEventListener('click', ()=>{
  shuffleMoves(Math.max(200, size*size*50));
  setMoves(0);
  stopTimer();
  timeEl.textContent = '00:00';
});

restartBtn.addEventListener('click', ()=>{
  // reset to solved state with same image
  initTiles(originalDataUrls.slice(), size);
});

playAgain.addEventListener('click', ()=>{
  winPopup.classList.add('hidden');
  shuffleBtn.click();
});

// when won
function onWin(){
  stopTimer();
  finalTime.textContent = timeEl.textContent;
  finalMoves.textContent = moves;
  winPopup.classList.remove('hidden');
}

// Prepare tiles after image loaded or size changed
function prepareFromImage(){
  size = parseInt(sizeSelect.value,10);
  const data = sliceImageToTiles(img, size);
  originalDataUrls = data.slice();
  initTiles(data.slice(), size);
  // shuffle immediately so user can play
  setTimeout(()=>{ shuffleBtn.disabled = false; shuffleBtn.click(); }, 120);
}

// keep check on window resize to rebuild board sizing
window.addEventListener('resize', ()=>{
  if(tiles.length) buildBoard();
});

// initialize disabled state
enableControls(false);
