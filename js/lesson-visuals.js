"use strict";

/* Interactive lesson visuals + multiple-choice checks per pattern. */

const LESSON_MC = {
  hashmap: [
    {
      q: "You're scanning an array once and need to know if you've seen a value before. What's the best first move?",
      choices: [
        "Use a HashMap to store value → index as you scan",
        "Sort the array, then binary search each element",
        "Nested loop comparing every pair",
        "Convert to a Set after the full scan"
      ],
      answer: 0,
      explain: "A HashMap gives O(1) 'have I seen this?' lookups while you scan once — that's the whole point of the pattern."
    },
    {
      q: "In one-pass Two Sum, when do you insert nums[i] into the map?",
      choices: [
        "After checking whether target - nums[i] is already in the map",
        "Before checking, so the map is always up to date",
        "Only at the end of the loop",
        "Never — use a Set instead"
      ],
      answer: 0,
      explain: "Insert AFTER the complement check. Inserting first lets an element match itself when target = 2 × nums[i]."
    },
    {
      q: "Counting lowercase letter frequencies in a string — HashMap or int[26]?",
      choices: [
        "int[26] — fixed alphabet, no boxing, faster",
        "HashMap<Character,Integer> — always more flexible",
        "TreeMap — keeps letters sorted",
        "Two arrays, one for vowels one for consonants"
      ],
      answer: 0,
      explain: "When keys are a small fixed alphabet, int[c - 'a']++ beats HashMap on speed and simplicity."
    }
  ],
  twopointers: [
    {
      q: "Container With Most Water: the left line is shorter. Which pointer moves?",
      choices: ["Move left (shorter line)", "Move right (taller line)", "Move both inward", "Move neither — try a wider window"],
      answer: 0,
      explain: "Area is capped by the shorter line. Moving the taller one only shrinks width without raising the cap."
    },
    {
      q: "3Sum on a sorted array — why sort first?",
      choices: [
        "So converging pointers can discard whole ranges after each comparison",
        "Sorting is required to use a HashMap",
        "To return elements in ascending order only",
        "It isn't — 3Sum uses a sliding window on unsorted input"
      ],
      answer: 0,
      explain: "Sorted order is what makes 'sum too small → move lo' a safe elimination."
    },
    {
      q: "Two Sum (return original indices) — best pattern?",
      choices: ["HashMap complement lookup", "Two pointers after sorting", "Binary search each element", "Sliding window"],
      answer: 0,
      explain: "Sorting destroys original indices. Two Sum is a HashMap problem, not two pointers."
    }
  ],
  slidingwindow: [
    {
      q: "Longest substring without repeats — shrink condition?",
      choices: [
        "while the window has a duplicate character",
        "if the window has a duplicate character",
        "while window size exceeds k",
        "never shrink — only expand right"
      ],
      answer: 0,
      explain: "One duplicate removal isn't always enough (e.g. 'pww'). The shrink must be a while loop."
    },
    {
      q: "Longest valid window (maximize length) — when do you record the answer?",
      choices: [
        "After shrinking while invalid, when the window is valid again",
        "Inside the shrink loop before removing from the left",
        "Before expanding right each time",
        "Only at the very end of the array"
      ],
      answer: 0,
      explain: "Max problems: shrink while INVALID, then record. Min problems flip this."
    },
    {
      q: "Why is sliding window O(n) with a nested while?",
      choices: [
        "left only moves forward, so it advances at most n times total",
        "The inner while always runs once",
        "right skips indices after duplicates",
        "The map size is bounded by alphabet size only"
      ],
      answer: 0,
      explain: "Each index enters and leaves the window at most once → ~2n pointer moves total."
    }
  ],
  grid: [
    {
      q: "Count islands in a grid — core traversal?",
      choices: ["DFS/BFS from each unvisited '1', mark visited", "Dynamic programming row by row", "Sort cells by value", "Two pointers on flattened grid"],
      answer: 0,
      explain: "Each DFS/BFS flood-fill marks one entire island. Count how many times you start a new flood."
    },
    {
      q: "Shortest path in an unweighted grid?",
      choices: ["BFS from the source cell", "DFS with backtracking", "Dijkstra's algorithm", "Binary search on path length"],
      answer: 0,
      explain: "BFS explores layer by layer, so the first time you reach a cell is the shortest path."
    },
    {
      q: "Multi-source BFS (rotten oranges) — how do you start?",
      choices: [
        "Enqueue ALL rotten cells at time 0, then BFS together",
        "BFS from one rotten cell, repeat for each",
        "DFS from each rotten cell",
        "Sort rotten cells by row"
      ],
      answer: 0,
      explain: "All sources start simultaneously — one BFS wave models time spreading in parallel."
    }
  ],
  binarysearch: [
    {
      q: "Classic binary search — when do you move lo?",
      choices: ["When nums[mid] < target (answer is to the right)", "When nums[mid] > target", "Every iteration regardless", "Only when lo == hi"],
      answer: 0,
      explain: "If nums[mid] is too small, everything at mid and left is too small — discard left half."
    },
    {
      q: "Search in rotated sorted array — nums[mid] > nums[hi]. Where is the pivot?",
      choices: ["Pivot is in the right half (lo..mid)", "Pivot is in the left half (mid+1..hi)", "Array isn't rotated", "Use linear scan instead"],
      answer: 0,
      explain: "If mid > hi, the drop (pivot) must be between mid and hi — left half is still sorted."
    },
    {
      q: "Binary search on answer (min capacity to ship) — what's monotonic?",
      choices: [
        "If capacity C works, any capacity > C also works",
        "If capacity C fails, any capacity < C also fails",
        "Both of the above — feasibility is monotonic in capacity",
        "Neither — you must try every capacity"
      ],
      answer: 2,
      explain: "Monotonic feasibility is what makes binary search on the answer space valid."
    }
  ],
  stack: [
    {
      q: "Valid parentheses — what goes on the stack?",
      choices: ["Opening brackets; pop when a matching close arrives", "Closing brackets only", "The entire string reversed", "Character counts in a HashMap"],
      answer: 0,
      explain: "Stack tracks unmatched openers. A closing bracket must match the top or the string is invalid."
    },
    {
      q: "Next greater element — stack stays…",
      choices: ["Monotonic decreasing (top is smallest seen)", "Monotonic increasing", "Sorted ascending", "Empty until the end"],
      answer: 0,
      explain: "Decreasing stack: when a larger element arrives, it resolves all smaller elements on top."
    },
    {
      q: "Evaluate RPN ('2 1 + 3 *') — stack holds…",
      choices: ["Numbers; pop two operands per operator", "Operators waiting for numbers", "The full expression tree", "Indices into the token array"],
      answer: 0,
      explain: "Each operator pops two numbers, computes, pushes the result. Final stack top is the answer."
    }
  ],
  dp: [
    {
      q: "Climbing stairs — what does dp[i] mean?",
      choices: ["Number of distinct ways to reach step i", "Minimum cost to reach step i", "Maximum steps taken so far", "Whether step i is reachable (boolean only)"],
      answer: 0,
      explain: "Define the state before writing transitions. Here: dp[i] = dp[i-1] + dp[i-2]."
    },
    {
      q: "House robber — transition at house i?",
      choices: [
        "dp[i] = max(dp[i-1], nums[i] + dp[i-2])",
        "dp[i] = dp[i-1] + nums[i]",
        "dp[i] = max(dp[i-1], dp[i-2])",
        "dp[i] = nums[i] + dp[i-1]"
      ],
      answer: 0,
      explain: "At each house: skip it (dp[i-1]) or rob it plus best before the previous house (nums[i]+dp[i-2])."
    },
    {
      q: "When can you reduce dp[i] to two variables?",
      choices: [
        "When dp[i] only depends on dp[i-1] and dp[i-2]",
        "Never — always keep the full array",
        "Only when the array fits in memory",
        "When there are only two test cases"
      ],
      answer: 0,
      explain: "If each state only needs the last k states, roll the array into k variables."
    }
  ],
  heap: [
    {
      q: "Find k largest elements — best approach?",
      choices: ["Min-heap of size k", "Max-heap of all n elements", "Sort the entire array", "HashMap frequency count"],
      answer: 0,
      explain: "Min-heap of k keeps the k largest seen. O(n log k) beats sorting when k << n."
    },
    {
      q: "Merge k sorted linked lists — key operation?",
      choices: ["Min-heap holding the current head of each list", "Merge two at a time repeatedly", "Concatenate then sort", "Two pointers on all lists"],
      answer: 0,
      explain: "Heap always gives the smallest current head across k lists — O(n log k) total."
    },
    {
      q: "Java PriorityQueue is by default a…",
      choices: ["Min-heap", "Max-heap", "Sorted list", "FIFO queue"],
      answer: 0,
      explain: "Default PriorityQueue is min-heap. For max-heap: new PriorityQueue<>(Collections.reverseOrder())."
    }
  ],
  matrix: [
    {
      q: "Spiral matrix traversal — primary control variables?",
      choices: ["top, bottom, left, right boundaries shrinking inward", "A single index i from 0 to n²", "Row and column DFS visited set", "Sort all cells by distance from center"],
      answer: 0,
      explain: "Four walls shrink after each direction: right along top, down right edge, left along bottom, up left edge."
    },
    {
      q: "Rotate matrix 90° clockwise in-place — first step?",
      choices: ["Transpose, then reverse each row", "Reverse each column", "Swap opposite corners only", "Cannot be done in-place"],
      answer: 0,
      explain: "Transpose (swap across diagonal) + reverse each row = 90° clockwise rotation."
    },
    {
      q: "Search a 2D matrix (sorted rows, first of row > last of prev) — approach?",
      choices: ["Treat as 1D sorted array, binary search on index", "DFS from top-left", "Search each row linearly", "Two pointers on diagonals"],
      answer: 0,
      explain: "Index i maps to row i/cols, col i%cols — standard binary search on virtual 1D array."
    }
  ],
  greedy: [
    {
      q: "Assign cookies to children (each child wants one cookie) — greedy rule?",
      choices: ["Sort both; give smallest cookie that satisfies each child", "Give largest cookie to largest child always", "Random assignment", "Dynamic programming on subsets"],
      answer: 0,
      explain: "Sort ascending. Match smallest sufficient cookie to each child — if it doesn't fit, skip that cookie."
    },
    {
      q: "Jump game (can you reach the last index?) — greedy check?",
      choices: ["Track farthest reachable index while scanning", "BFS every position", "Try every jump length recursively", "Sort jump lengths descending"],
      answer: 0,
      explain: "If i > farthest, you're stuck. Else farthest = max(farthest, i + nums[i])."
    },
    {
      q: "When does greedy work?",
      choices: [
        "When a locally optimal choice leads to a globally optimal solution",
        "Whenever the input is sorted",
        "Only for tree problems",
        "Never — always use DP"
      ],
      answer: 0,
      explain: "Greedy needs a proof (or strong intuition) that local choices don't block a better global answer."
    }
  ]
};

/* SVG visual diagrams — one per pattern, step-through driven */
function lessonVisualHtml(patternId) {
  const fn = VISUALS[patternId];
  if (!fn) return "";
  return `<div class="lesson-visual" data-pattern="${escapeHtml(patternId)}">
    <div class="visual-head"><strong>Visual walkthrough</strong><span class="visual-step-label">Step 1</span></div>
    <div class="visual-stage">${fn(0)}</div>
    <div class="visual-controls">
      <button type="button" class="btn-ghost small visual-prev" disabled>&#8592; Prev</button>
      <button type="button" class="btn-primary small visual-next">Next &#8594;</button>
      <span class="visual-caption"></span>
    </div>
  </div>`;
}

const VISUALS = {
  hashmap: (step) => {
    const frames = [
      { cap: "Start: empty map, scan index 0 (value 2). Need 9−2=7. Map empty → no hit.", svg: hashmapSvg([2,7,11,15], 0, {}, [7]) },
      { cap: "Store 2→0 in map. Map now has {2:0}.", svg: hashmapSvg([2,7,11,15], 0, {2:0}, []) },
      { cap: "Index 1 (value 7). Need 9−7=2. Map has 2 at index 0 → found pair [0,1]!", svg: hashmapSvg([2,7,11,15], 1, {2:0}, [0,1], true) }
    ];
    return wrapFrame(frames[step] || frames[frames.length - 1]);
  },
  twopointers: (step) => {
    const frames = [
      { cap: "lo=0 (h=1), hi=8 (h=7). Area = min(1,7)×8 = 8. Left is shorter → move lo.", svg: tpSvg([1,8,6,2,5,4,8,3,7], 0, 8, 8) },
      { cap: "lo=1 (h=8), hi=8 (h=7). Area = min(8,7)×7 = 49. Best so far. Right shorter → move hi.", svg: tpSvg([1,8,6,2,5,4,8,3,7], 1, 8, 49) },
      { cap: "Keep moving the shorter line inward. Nothing beats 49.", svg: tpSvg([1,8,6,2,5,4,8,3,7], 1, 8, 49, true) }
    ];
    return wrapFrame(frames[step] || frames[frames.length - 1]);
  },
  slidingwindow: (step) => {
    const frames = [
      { cap: "Expand right. Window 'p' — valid, length 1.", svg: swSvg("pwwkew", 0, 0, "p") },
      { cap: "Add 'w'. Window 'pw' — valid, length 2.", svg: swSvg("pwwkew", 0, 1, "pw") },
      { cap: "Add 'w' — duplicate! Shrink left until valid. Window 'w'.", svg: swSvg("pwwkew", 2, 2, "w") },
      { cap: "Expand to 'wke' — length 3, new best!", svg: swSvg("pwwkew", 2, 4, "wke") }
    ];
    return wrapFrame(frames[step] || frames[frames.length - 1]);
  },
  grid: (step) => {
    const grid = [["1","1","0"],["1","0","0"],["0","0","1"]];
    const visited = step >= 1 ? [[0,0],[0,1],[1,0]] : [];
    const caps = [
      "Grid of 1s (land) and 0s (water). Start DFS from first unvisited '1'.",
      "DFS flood-fill marks connected 1s. One island found.",
      "Next unvisited '1' at (2,2) starts a second island. Total: 2 islands."
    ];
    return wrapFrame({ cap: caps[step] || caps[2], svg: gridSvg(grid, visited, step >= 2 ? [[2,2]] : []) });
  },
  binarysearch: (step) => {
    const arr = [1,3,5,7,9,11,13];
    const frames = [
      { lo: 0, hi: 6, mid: 3, cap: "lo=0, hi=6, mid=3 (val 7). 7 < 11 → discard left half, lo=4." },
      { lo: 4, hi: 6, mid: 5, cap: "lo=4, hi=6, mid=5 (val 11). Found target!" },
      { lo: 4, hi: 6, mid: 5, cap: "Binary search: each step eliminates half the search space → O(log n).", found: true }
    ];
    const f = frames[step] || frames[1];
    return wrapFrame({ cap: f.cap, svg: bsSvg(arr, f.lo, f.hi, f.mid, f.found) });
  },
  stack: (step) => {
    const caps = [
      "Read '('. Push onto stack.",
      "Read ')'. Pop — must match '('. Stack empty → valid so far.",
      "Unmatched openers left on stack → invalid. Empty stack at end → valid."
    ];
    const stacks = [["("], [], ["("]];
    return wrapFrame({ cap: caps[step] || caps[1], svg: stackSvg(stacks[step] || stacks[1], step) });
  },
  dp: (step) => {
    const caps = [
      "dp[0]=1 (one way to stay). dp[1]=1 (one step or one hop).",
      "dp[2] = dp[1]+dp[0] = 2. Two ways to reach step 2.",
      "Each step: dp[i] = dp[i-1] + dp[i-2]. Fill left to right."
    ];
    const dps = [[1,1,"?"], [1,1,2], [1,1,2,3,5]];
    return wrapFrame({ cap: caps[step] || caps[2], svg: dpSvg(dps[step] || dps[2]) });
  },
  heap: (step) => {
    const caps = [
      "Stream: 3. Min-heap of size k=2: [3].",
      "Stream: 1. Heap: [1,3]. Still size 2.",
      "Stream: 5. 1 is smallest of k → pop 1. Heap: [3,5]. Top 2 largest: [3,5]."
    ];
    return wrapFrame({ cap: caps[step] || caps[2], svg: heapSvg(step) });
  },
  matrix: (step) => {
    const caps = [
      "Spiral: go right along top row →",
      "Then down the right column ↓",
      "Then left along bottom, up left column. Shrink boundaries each lap."
    ];
    return wrapFrame({ cap: caps[step] || caps[2], svg: spiralSvg(step) });
  },
  greedy: (step) => {
    const caps = [
      "Jump from index 0. farthest = 0 + 2 = 2.",
      "At index 1: farthest = max(2, 1+3) = 4. Can reach index 4.",
      "farthest >= last index → reachable. Greedy tracks max reach."
    ];
    return wrapFrame({ cap: caps[step] || caps[2], svg: greedySvg(step) });
  }
};

function visualStepCount(patternId) {
  const probe = VISUALS[patternId];
  if (!probe) return 0;
  for (let i = 0; i < 10; i++) if (!VISUALS[patternId](i).includes("visual-caption")) { /* noop */ }
  const counts = { hashmap:3, twopointers:3, slidingwindow:4, grid:3, binarysearch:3, stack:3, dp:3, heap:3, matrix:3, greedy:3 };
  return counts[patternId] || 3;
}

function wrapFrame({ cap, svg }) {
  return `${svg}<p class="visual-caption">${escapeHtml(cap)}</p>`;
}

/* --- SVG helpers --- */

function hashmapSvg(arr, cur, map, highlight, done) {
  const cells = arr.map((v, i) => {
    const hl = highlight.includes(i) ? ' class="hl-green"' : i === cur ? ' class="hl-blue"' : "";
    return `<rect x="${20 + i * 50}" y="20" width="44" height="44" rx="4"${hl}/><text x="${42 + i * 50}" y="48" text-anchor="middle">${v}</text><text x="${42 + i * 50}" y="78" text-anchor="middle" class="idx">${i}</text>`;
  }).join("");
  const mapEntries = Object.entries(map).map(([k,v], i) =>
    `<text x="320" y="${30 + i * 22}" class="map-t">${k} → ${v}</text>`
  ).join("");
  return `<svg viewBox="0 0 400 100" class="viz">${cells}<text x="320" y="14" class="lbl">Map</text>${mapEntries}${done ? '<text x="200" y="95" class="lbl win">Pair found!</text>' : ""}</svg>`;
}

function tpSvg(h, lo, hi, area, done) {
  const bars = h.map((v, i) => {
    const x = 20 + i * 36;
    const hl = i === lo || i === hi ? ' class="hl-blue"' : "";
    return `<rect x="${x}" y="${80 - v * 7}" width="28" height="${v * 7}"${hl}/><text x="${x + 14}" y="92" text-anchor="middle" class="idx">${i}</text>`;
  }).join("");
  return `<svg viewBox="0 0 340 100" class="viz">${bars}<text x="170" y="12" text-anchor="middle" class="lbl">Area: ${area}${done ? " ✓ max" : ""}</text><text x="${20 + lo * 36 + 14}" y="${80 - h[lo] * 7 - 4}" text-anchor="middle" class="lbl">lo</text><text x="${20 + hi * 36 + 14}" y="${80 - h[hi] * 7 - 4}" text-anchor="middle" class="lbl">hi</text></svg>`;
}

function swSvg(s, left, right, window) {
  const chars = s.split("").map((c, i) => {
    const inWin = i >= left && i <= right;
    return `<text x="${20 + i * 28}" y="50" class="${inWin ? "hl-blue" : ""}">${c}</text>`;
  }).join("");
  return `<svg viewBox="0 0 220 70" class="viz">${chars}<text x="10" y="68" class="lbl">Window: "${window}" (L=${left} R=${right})</text></svg>`;
}

function gridSvg(grid, visited, starts) {
  let cells = "";
  grid.forEach((row, r) => row.forEach((c, col) => {
    const x = 20 + col * 44;
    const y = 20 + r * 44;
    const isVis = visited.some(([vr,vc]) => vr === r && vc === col);
    const isStart = starts.some(([sr,sc]) => sr === r && sc === col);
    const cls = isVis ? "hl-green" : isStart ? "hl-blue" : c === "0" ? "water" : "";
    cells += `<rect x="${x}" y="${y}" width="40" height="40" class="${cls}"/><text x="${x+20}" y="${y+26}" text-anchor="middle">${c}</text>`;
  }));
  return `<svg viewBox="0 0 160 160" class="viz">${cells}</svg>`;
}

function bsSvg(arr, lo, hi, mid, found) {
  const cells = arr.map((v, i) => {
    let cls = "";
    if (i === mid) cls = found ? "hl-green" : "hl-blue";
    else if (i >= lo && i <= hi) cls = "in-range";
    return `<rect x="${20 + i * 44}" y="30" width="38" height="38" class="${cls}"/><text x="${39 + i * 44}" y="55" text-anchor="middle">${v}</text>`;
  }).join("");
  return `<svg viewBox="0 0 340 90" class="viz">${cells}<text x="20" y="85" class="lbl">lo=${lo} mid=${mid} hi=${hi}</text></svg>`;
}

function stackSvg(stack, step) {
  const items = stack.map((c, i) =>
    `<rect x="160" y="${70 - i * 28}" width="40" height="24" class="hl-blue"/><text x="180" y="${86 - i * 28}" text-anchor="middle">${c}</text>`
  ).join("");
  return `<svg viewBox="0 0 360 100" class="viz"><text x="180" y="14" text-anchor="middle" class="lbl">Stack</text>${items}<text x="30" y="55" class="lbl">${step === 0 ? "Push '('" : step === 1 ? "Pop matching ')'" : "Check empty"}</text></svg>`;
}

function dpSvg(vals) {
  const cells = vals.map((v, i) =>
    `<rect x="${20 + i * 48}" y="30" width="42" height="42" class="${v === '?' ? '' : 'hl-green'}"/><text x="${41 + i * 48}" y="57" text-anchor="middle">${v}</text><text x="${41 + i * 48}" y="82" text-anchor="middle" class="idx">dp[${i}]</text>`
  ).join("");
  return `<svg viewBox="0 0 280 90" class="viz">${cells}</svg>`;
}

function heapSvg(step) {
  const heaps = [[3], [1,3], [3,5]];
  const h = heaps[step] || heaps[2];
  const nodes = h.map((v, i) => {
    const x = 80 + i * 60;
    return `<circle cx="${x}" cy="45" r="22" class="hl-blue"/><text x="${x}" y="50" text-anchor="middle">${v}</text>`;
  }).join("");
  return `<svg viewBox="0 0 240 80" class="viz"><text x="120" y="14" text-anchor="middle" class="lbl">Min-heap (size k=2)</text>${nodes}</svg>`;
}

function spiralSvg(step) {
  const dirs = ["→ right", "↓ down", "← left", "↑ up"];
  return `<svg viewBox="0 0 160 160" class="viz">
    <rect x="20" y="20" width="120" height="120" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M30,30 H130 M130,30 V130 M130,130 H30 M30,130 V50" fill="none" stroke="var(--blue)" stroke-width="3" stroke-dasharray="${step >= 1 ? '0' : '6 4'}"/>
    <text x="80" y="155" text-anchor="middle" class="lbl">${dirs[step] || dirs[3]}</text>
  </svg>`;
}

function greedySvg(step) {
  const reach = [2, 4, 4];
  const cells = [0,1,2,3,4].map((i) => {
    const hl = i <= reach[step] ? "hl-green" : "";
    return `<rect x="${20 + i * 44}" y="40" width="38" height="38" class="${hl}"/><text x="${39 + i * 44}" y="64" text-anchor="middle">${i}</text>`;
  }).join("");
  return `<svg viewBox="0 0 260 90" class="viz">${cells}<text x="130" y="20" text-anchor="middle" class="lbl">farthest reachable: ${reach[step]}</text></svg>`;
}

function wireVisual(root, patternId) {
  const el = root.querySelector(".lesson-visual");
  if (!el) return;
  const total = visualStepCount(patternId);
  let step = 0;
  const stage = el.querySelector(".visual-stage");
  const label = el.querySelector(".visual-step-label");
  const prev = el.querySelector(".visual-prev");
  const next = el.querySelector(".visual-next");

  function render() {
    stage.innerHTML = VISUALS[patternId](step);
    label.textContent = `Step ${step + 1} of ${total}`;
    prev.disabled = step === 0;
    next.disabled = step >= total - 1;
    next.textContent = step >= total - 1 ? "Done ✓" : "Next →";
  }

  prev.addEventListener("click", () => { if (step > 0) { step--; render(); } });
  next.addEventListener("click", () => { if (step < total - 1) { step++; render(); } else next.textContent = "Done ✓"; });
  render();
}

function wireWalkthrough(root, pattern) {
  const el = root.querySelector(".walkthrough-interactive");
  if (!el) return;
  const steps = pattern.lesson.walkthrough.steps;
  const result = pattern.lesson.walkthrough.result;
  let idx = -1;
  const list = el.querySelector(".wt-steps");
  const btn = el.querySelector(".wt-next");
  const done = el.querySelector(".wt-result");

  function render() {
    if (idx < 0) {
      list.innerHTML = `<li class="muted">Click below to reveal the first step — try to predict it before you look.</li>`;
      btn.textContent = "Reveal step 1";
      done.classList.add("hidden");
      return;
    }
    list.innerHTML = steps.slice(0, idx + 1).map((s, i) => `<li class="${i === idx ? "wt-current" : ""}">${escapeHtml(s)}</li>`).join("");
    if (idx >= steps.length - 1) {
      btn.textContent = "Show takeaway";
      done.classList.remove("hidden");
      done.textContent = result;
    } else {
      btn.textContent = `Next step (${idx + 2}/${steps.length})`;
      done.classList.add("hidden");
    }
  }

  btn.addEventListener("click", () => {
    if (idx < steps.length - 1) { idx++; render(); }
  });
  render();
}

function wireSnippetGate(root) {
  const gate = root.querySelector(".snippet-gate");
  if (!gate) return;
  const btn = gate.querySelector(".snippet-reveal");
  const body = gate.querySelector(".snippet-body");
  btn.addEventListener("click", () => {
    body.classList.remove("hidden");
    btn.classList.add("hidden");
  });
}

function wireMcChecks(root, patternId) {
  const host = root.querySelector(".checks");
  if (!host) return;
  host.innerHTML = "";
  const items = LESSON_MC[patternId] || [];
  const progress = state.learning?.[patternId]?.checks || {};

  items.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "qcheck mc";
    const done = progress[i];
    div.innerHTML = `<div class="check-q">${i + 1}. ${escapeHtml(c.q)}</div>
      <div class="mc-choices">${c.choices.map((ch, j) =>
        `<label class="mc-opt${done != null && j === c.answer ? " correct" : done === j && j !== c.answer ? " wrong" : ""}">
          <input type="radio" name="mc-${patternId}-${i}" value="${j}" ${done != null ? "disabled" : ""} ${done === j ? "checked" : ""}>
          <span>${escapeHtml(ch)}</span>
        </label>`
      ).join("")}</div>
      <div class="mc-feedback hidden"></div>`;

    if (done != null) {
      const fb = div.querySelector(".mc-feedback");
      fb.classList.remove("hidden");
      fb.className = "mc-feedback " + (done === c.answer ? "ok" : "bad");
      fb.textContent = done === c.answer ? "✓ " + c.explain : "✗ " + c.explain;
    }

    div.querySelectorAll("input[type=radio]").forEach((inp) => {
      inp.addEventListener("change", () => {
        const pick = +inp.value;
        if (!state.learning) state.learning = {};
        if (!state.learning[patternId]) state.learning[patternId] = {};
        state.learning[patternId].checks = state.learning[patternId].checks || {};
        state.learning[patternId].checks[i] = pick;
        persist.learning();
        wireMcChecks(root, patternId);
      });
    });
    host.appendChild(div);
  });
}

function wireLessonInteractive(root, pattern) {
  wireVisual(root, pattern.id);
  wireWalkthrough(root, pattern);
  wireSnippetGate(root);
  wireMcChecks(root, pattern.id);
}
