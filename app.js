// ============================================================
// PathMind - Pathfinding Algorithm Visualizer
// ============================================================

(() => {
  'use strict';

  // ---- CONFIGURATION ----
  const COLS = 35;
  const ROWS = 18;
  const DEFAULT_START = { row: 9, col: 3 };
  const DEFAULT_END = { row: 9, col: 31 };

  // ---- STATE ----
  const state = {
    grid: [],           // 2D array of cell data
    startNode: { ...DEFAULT_START },
    endNode: { ...DEFAULT_END },
    isRunning: false,
    isMouseDown: false,
    isDraggingStart: false,
    isDraggingEnd: false,
    drawMode: null,     // 'wall' or 'erase'
    animationTimeouts: [],
  };

  // ---- DOM REFS ----
  const dom = {
    grid: document.getElementById('grid'),
    btnStart: document.getElementById('btn-start'),
    btnMaze: document.getElementById('btn-maze'),
    btnClear: document.getElementById('btn-clear'),
    algoSelect: document.getElementById('algorithm-select'),
    speedSlider: document.getElementById('speed-slider'),
    speedValue: document.getElementById('speed-value'),
    statusBar: document.getElementById('status-bar'),
    statVisited: document.getElementById('stat-visited'),
    statPathLength: document.getElementById('stat-path-length'),
    statTime: document.getElementById('stat-time'),
    statAlgo: document.getElementById('stat-algo'),
  };

  // ---- HELPERS ----
  function getSpeed() {
    // Speed 1 = slow (80ms), speed 10 = fast (3ms)
    const val = parseInt(dom.speedSlider.value);
    return Math.max(2, 90 - val * 9);
  }

  function setStatus(text, className) {
    dom.statusBar.textContent = text;
    dom.statusBar.className = 'status-bar' + (className ? ' ' + className : '');
  }

  function updateStats(visited, pathLen, time, algo) {
    dom.statVisited.textContent = visited;
    dom.statPathLength.textContent = pathLen;
    dom.statTime.textContent = time + 'ms';
    dom.statAlgo.textContent = algo;
  }

  function getAlgoName(val) {
    const names = { astar: 'A*', bfs: 'BFS', dfs: 'DFS' };
    return names[val] || val;
  }

  // ---- GRID INITIALIZATION ----
  function createGrid() {
    dom.grid.innerHTML = '';
    dom.grid.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size))`;
    dom.grid.style.gridTemplateRows = `repeat(${ROWS}, var(--cell-size))`;
    state.grid = [];

    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        const data = {
          row: r,
          col: c,
          isWall: false,
          el: cell,
        };

        // Set start/end
        if (r === state.startNode.row && c === state.startNode.col) {
          cell.classList.add('start');
        }
        if (r === state.endNode.row && c === state.endNode.col) {
          cell.classList.add('end');
        }

        dom.grid.appendChild(cell);
        row.push(data);
      }
      state.grid.push(row);
    }
  }

  function clearVisualization() {
    // Clear animation timeouts
    state.animationTimeouts.forEach(t => clearTimeout(t));
    state.animationTimeouts = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = state.grid[r][c];
        cell.el.classList.remove('visited', 'path');
      }
    }
    updateStats(0, 0, 0, getAlgoName(dom.algoSelect.value));
  }

  function clearAll() {
    if (state.isRunning) return;
    clearVisualization();
    state.startNode = { ...DEFAULT_START };
    state.endNode = { ...DEFAULT_END };
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        state.grid[r][c].isWall = false;
        state.grid[r][c].el.className = 'cell';
      }
    }
    state.grid[state.startNode.row][state.startNode.col].el.classList.add('start');
    state.grid[state.endNode.row][state.endNode.col].el.classList.add('end');
    setStatus('Sẵn sàng. Hãy vẽ tường rồi nhấn "Tìm đường"!');
  }

  // ---- MOUSE EVENTS (draw walls, drag start/end) ----
  function handleMouseDown(e) {
    if (state.isRunning) return;
    e.preventDefault();
    const cell = e.target.closest('.cell');
    if (!cell) return;

    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    state.isMouseDown = true;

    // Clear previous visualization
    clearVisualization();

    if (r === state.startNode.row && c === state.startNode.col) {
      state.isDraggingStart = true;
    } else if (r === state.endNode.row && c === state.endNode.col) {
      state.isDraggingEnd = true;
    } else {
      // Toggle wall
      const data = state.grid[r][c];
      if (data.isWall) {
        state.drawMode = 'erase';
        data.isWall = false;
        cell.classList.remove('wall');
      } else {
        state.drawMode = 'wall';
        data.isWall = true;
        cell.classList.add('wall');
      }
    }
  }

  function handleMouseMove(e) {
    if (!state.isMouseDown || state.isRunning) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;

    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);

    if (state.isDraggingStart) {
      if ((r === state.endNode.row && c === state.endNode.col) || state.grid[r][c].isWall) return;
      // Remove old start
      state.grid[state.startNode.row][state.startNode.col].el.classList.remove('start');
      state.startNode = { row: r, col: c };
      cell.classList.add('start');
    } else if (state.isDraggingEnd) {
      if ((r === state.startNode.row && c === state.startNode.col) || state.grid[r][c].isWall) return;
      state.grid[state.endNode.row][state.endNode.col].el.classList.remove('end');
      state.endNode = { row: r, col: c };
      cell.classList.add('end');
    } else {
      // Draw/erase walls
      if (r === state.startNode.row && c === state.startNode.col) return;
      if (r === state.endNode.row && c === state.endNode.col) return;

      const data = state.grid[r][c];
      if (state.drawMode === 'wall' && !data.isWall) {
        data.isWall = true;
        cell.classList.add('wall');
      } else if (state.drawMode === 'erase' && data.isWall) {
        data.isWall = false;
        cell.classList.remove('wall');
      }
    }
  }

  function handleMouseUp() {
    state.isMouseDown = false;
    state.isDraggingStart = false;
    state.isDraggingEnd = false;
    state.drawMode = null;
  }

  // ---- ALGORITHMS ----
  function getNeighbors(node) {
    const { row, col } = node;
    const neighbors = [];
    const dirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
    ];
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !state.grid[nr][nc].isWall) {
        neighbors.push(state.grid[nr][nc]);
      }
    }
    return neighbors;
  }

  function heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }

  // --- A* ---
  function aStar() {
    const startData = state.grid[state.startNode.row][state.startNode.col];
    const endData = state.grid[state.endNode.row][state.endNode.col];

    const openSet = [startData];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    const closedSet = new Set();
    const visitedOrder = [];

    const key = (n) => `${n.row},${n.col}`;
    gScore.set(key(startData), 0);
    fScore.set(key(startData), heuristic(startData, endData));

    while (openSet.length > 0) {
      // Pick node with lowest fScore
      let lowestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if ((fScore.get(key(openSet[i])) || Infinity) < (fScore.get(key(openSet[lowestIdx])) || Infinity)) {
          lowestIdx = i;
        }
      }
      const current = openSet.splice(lowestIdx, 1)[0];
      const ck = key(current);

      if (current === endData) {
        return { visited: visitedOrder, path: reconstructPath(cameFrom, current) };
      }

      closedSet.add(ck);
      visitedOrder.push(current);

      for (const neighbor of getNeighbors(current)) {
        const nk = key(neighbor);
        if (closedSet.has(nk)) continue;

        const tentativeG = (gScore.get(ck) || 0) + 1;
        if (tentativeG < (gScore.get(nk) ?? Infinity)) {
          cameFrom.set(nk, current);
          gScore.set(nk, tentativeG);
          fScore.set(nk, tentativeG + heuristic(neighbor, endData));
          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return { visited: visitedOrder, path: [] };
  }

  // --- BFS ---
  function bfs() {
    const startData = state.grid[state.startNode.row][state.startNode.col];
    const endData = state.grid[state.endNode.row][state.endNode.col];

    const queue = [startData];
    const visited = new Set();
    const cameFrom = new Map();
    const visitedOrder = [];

    const key = (n) => `${n.row},${n.col}`;
    visited.add(key(startData));

    while (queue.length > 0) {
      const current = queue.shift();

      if (current === endData) {
        return { visited: visitedOrder, path: reconstructPath(cameFrom, current) };
      }

      visitedOrder.push(current);

      for (const neighbor of getNeighbors(current)) {
        const nk = key(neighbor);
        if (!visited.has(nk)) {
          visited.add(nk);
          cameFrom.set(nk, current);
          queue.push(neighbor);
        }
      }
    }

    return { visited: visitedOrder, path: [] };
  }

  // --- DFS ---
  function dfs() {
    const startData = state.grid[state.startNode.row][state.startNode.col];
    const endData = state.grid[state.endNode.row][state.endNode.col];

    const stack = [startData];
    const visited = new Set();
    const cameFrom = new Map();
    const visitedOrder = [];

    const key = (n) => `${n.row},${n.col}`;

    while (stack.length > 0) {
      const current = stack.pop();
      const ck = key(current);

      if (visited.has(ck)) continue;
      visited.add(ck);

      if (current === endData) {
        return { visited: visitedOrder, path: reconstructPath(cameFrom, current) };
      }

      visitedOrder.push(current);

      const neighbors = getNeighbors(current);
      // Reverse so we explore in a consistent visual order
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const neighbor = neighbors[i];
        const nk = key(neighbor);
        if (!visited.has(nk)) {
          cameFrom.set(nk, current);
          stack.push(neighbor);
        }
      }
    }

    return { visited: visitedOrder, path: [] };
  }

  function reconstructPath(cameFrom, endNode) {
    const path = [];
    let current = endNode;
    const key = (n) => `${n.row},${n.col}`;
    while (current) {
      path.unshift(current);
      current = cameFrom.get(key(current));
    }
    return path;
  }

  // ---- ANIMATION ----
  function animateResult(visited, path, computeTime) {
    const speed = getSpeed();
    const algoName = getAlgoName(dom.algoSelect.value);
    state.isRunning = true;
    dom.btnStart.disabled = true;
    setStatus(`🔍 ${algoName} đang khám phá...`, 'running');

    // Filter out start/end from visited for animation
    const startKey = `${state.startNode.row},${state.startNode.col}`;
    const endKey = `${state.endNode.row},${state.endNode.col}`;
    const filteredVisited = visited.filter(n => {
      const k = `${n.row},${n.col}`;
      return k !== startKey && k !== endKey;
    });

    // Animate visited nodes
    for (let i = 0; i < filteredVisited.length; i++) {
      const t = setTimeout(() => {
        filteredVisited[i].el.classList.add('visited');
        dom.statVisited.textContent = i + 1;
      }, speed * i);
      state.animationTimeouts.push(t);
    }

    // Then animate path
    const pathDelay = speed * filteredVisited.length + 200;

    if (path.length === 0) {
      const t = setTimeout(() => {
        setStatus('❌ Không tìm thấy đường đi! Thử xóa bớt tường.', 'no-path');
        updateStats(filteredVisited.length, 0, computeTime, algoName);
        state.isRunning = false;
        dom.btnStart.disabled = false;
      }, pathDelay);
      state.animationTimeouts.push(t);
      return;
    }

    const filteredPath = path.filter(n => {
      const k = `${n.row},${n.col}`;
      return k !== startKey && k !== endKey;
    });

    const pathSpeed = Math.max(20, speed * 1.5);
    for (let i = 0; i < filteredPath.length; i++) {
      const t = setTimeout(() => {
        filteredPath[i].el.classList.remove('visited');
        filteredPath[i].el.classList.add('path');
        dom.statPathLength.textContent = i + 1;
      }, pathDelay + pathSpeed * i);
      state.animationTimeouts.push(t);
    }

    // Done
    const doneDelay = pathDelay + pathSpeed * filteredPath.length + 100;
    const t = setTimeout(() => {
      setStatus(`✅ Hoàn thành! ${algoName} khám phá ${filteredVisited.length} ô, tìm đường dài ${path.length - 1} bước.`, 'done');
      updateStats(filteredVisited.length, path.length - 1, computeTime, algoName);
      state.isRunning = false;
      dom.btnStart.disabled = false;
    }, doneDelay);
    state.animationTimeouts.push(t);
  }

  // ---- RUN ALGORITHM ----
  function runAlgorithm() {
    if (state.isRunning) return;
    clearVisualization();

    const algo = dom.algoSelect.value;
    const t0 = performance.now();
    let result;

    switch (algo) {
      case 'astar': result = aStar(); break;
      case 'bfs': result = bfs(); break;
      case 'dfs': result = dfs(); break;
      default: result = aStar();
    }

    const computeTime = Math.round(performance.now() - t0);
    animateResult(result.visited, result.path, computeTime);
  }

  // ---- MAZE GENERATION (Recursive Division) ----
  function generateMaze() {
    if (state.isRunning) return;
    clearAll();
    setStatus('🎲 Đang tạo mê cung...', 'running');

    // Clear all walls first
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        state.grid[r][c].isWall = false;
        state.grid[r][c].el.classList.remove('wall');
      }
    }

    // Add border walls
    const wallsToAnimate = [];

    function addWall(r, c) {
      if (r === state.startNode.row && c === state.startNode.col) return;
      if (r === state.endNode.row && c === state.endNode.col) return;
      if (!state.grid[r][c].isWall) {
        state.grid[r][c].isWall = true;
        wallsToAnimate.push(state.grid[r][c]);
      }
    }

    // Recursive division
    function divide(rowStart, rowEnd, colStart, colEnd, orientation) {
      if (rowEnd - rowStart < 2 || colEnd - colStart < 2) return;

      const horizontal = orientation === 'horizontal';

      if (horizontal) {
        // Pick a row to draw wall on (even rows for walls)
        const possibleRows = [];
        for (let r = rowStart + 1; r < rowEnd; r += 2) possibleRows.push(r);
        if (possibleRows.length === 0) return;
        const wallRow = possibleRows[Math.floor(Math.random() * possibleRows.length)];

        // Pick a passage (odd columns for passages)
        const possiblePassages = [];
        for (let c = colStart; c <= colEnd; c += 2) possiblePassages.push(c);
        if (possiblePassages.length === 0) return;
        const passage = possiblePassages[Math.floor(Math.random() * possiblePassages.length)];

        for (let c = colStart; c <= colEnd; c++) {
          if (c !== passage) addWall(wallRow, c);
        }

        divide(rowStart, wallRow - 1, colStart, colEnd, chooseOrientation(wallRow - 1 - rowStart, colEnd - colStart));
        divide(wallRow + 1, rowEnd, colStart, colEnd, chooseOrientation(rowEnd - wallRow - 1, colEnd - colStart));
      } else {
        const possibleCols = [];
        for (let c = colStart + 1; c < colEnd; c += 2) possibleCols.push(c);
        if (possibleCols.length === 0) return;
        const wallCol = possibleCols[Math.floor(Math.random() * possibleCols.length)];

        const possiblePassages = [];
        for (let r = rowStart; r <= rowEnd; r += 2) possiblePassages.push(r);
        if (possiblePassages.length === 0) return;
        const passage = possiblePassages[Math.floor(Math.random() * possiblePassages.length)];

        for (let r = rowStart; r <= rowEnd; r++) {
          if (r !== passage) addWall(r, wallCol);
        }

        divide(rowStart, rowEnd, colStart, wallCol - 1, chooseOrientation(rowEnd - rowStart, wallCol - 1 - colStart));
        divide(rowStart, rowEnd, wallCol + 1, colEnd, chooseOrientation(rowEnd - rowStart, colEnd - wallCol - 1));
      }
    }

    function chooseOrientation(height, width) {
      if (width < height) return 'horizontal';
      if (height < width) return 'vertical';
      return Math.random() < 0.5 ? 'horizontal' : 'vertical';
    }

    divide(0, ROWS - 1, 0, COLS - 1, chooseOrientation(ROWS, COLS));

    // Animate walls appearing
    const speed = Math.max(2, 15);
    for (let i = 0; i < wallsToAnimate.length; i++) {
      const t = setTimeout(() => {
        wallsToAnimate[i].el.classList.add('wall');
      }, speed * i);
      state.animationTimeouts.push(t);
    }

    const t = setTimeout(() => {
      setStatus('✅ Mê cung đã sẵn sàng! Nhấn "Tìm đường" để bắt đầu.', 'done');
    }, speed * wallsToAnimate.length + 100);
    state.animationTimeouts.push(t);
  }

  // ---- EVENT BINDINGS ----
  function bindEvents() {
    // Grid mouse events
    dom.grid.addEventListener('mousedown', handleMouseDown);
    dom.grid.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Touch support
    dom.grid.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target) handleMouseDown({ preventDefault: () => e.preventDefault(), target });
    }, { passive: false });

    dom.grid.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target) handleMouseMove({ target });
    }, { passive: false });

    dom.grid.addEventListener('touchend', handleMouseUp);

    // Buttons
    dom.btnStart.addEventListener('click', runAlgorithm);
    dom.btnMaze.addEventListener('click', generateMaze);
    dom.btnClear.addEventListener('click', clearAll);

    // Speed slider
    dom.speedSlider.addEventListener('input', () => {
      dom.speedValue.textContent = dom.speedSlider.value;
    });

    // Prevent context menu on grid
    dom.grid.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---- INIT ----
  function init() {
    createGrid();
    bindEvents();
    updateStats(0, 0, 0, getAlgoName(dom.algoSelect.value));

    // Update algo name when selection changes
    dom.algoSelect.addEventListener('change', () => {
      dom.statAlgo.textContent = getAlgoName(dom.algoSelect.value);
    });
  }

  init();
})();
