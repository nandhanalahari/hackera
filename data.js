const PATTERNS = [
  {
    id: "hashmap",
    name: "HashMap / frequency counting",
    summary:
      "The highest-yield OA pattern by far: whenever the question asks about duplicates, complements, anagrams, or \"how many times,\" reach for a map before anything else. It converts an O(n^2) nested scan into a single O(n) pass by trading memory for lookup speed.",
    lesson: {
      recognize: [
        "The prompt says duplicate, anagram, frequency, count, or \"how many times\".",
        "You catch yourself about to write a nested loop that compares every pair.",
        "You need to ask \"have I seen this before?\" while scanning once.",
        "You need to group items that share some property."
      ],
      mechanics:
        "A HashMap replaces the question \"is this value somewhere in the array?\" (an O(n) rescan) with an O(1) lookup. You pay one array's worth of memory to remove an entire nested loop, which is almost always the right trade in an OA.\n\nThere are only two shapes you need. The first is counting: walk the input and do map.put(key, map.getOrDefault(key, 0) + 1). The second is complement lookup: as you scan, compute the partner value you would need, and check whether you have already stored it.\n\nFor complement lookup the ordering inside the loop is the whole ballgame. Check for the complement first, then insert the current element. If you insert first, an element can match itself.\n\nWhen the key space is a small fixed alphabet, like lowercase English letters, swap the HashMap for int[26]. It avoids hashing and autoboxing entirely and is noticeably faster under a time limit.",
      walkthrough: {
        title: "Two Sum on nums = [2, 7, 11, 15], target = 9",
        steps: [
          "i = 0, value 2. Need 9 - 2 = 7. Map is empty, so no hit. Store 2 -> 0. Map: {2:0}",
          "i = 1, value 7. Need 9 - 7 = 2. Map contains 2 at index 0. Hit.",
          "Return [0, 1]. One pass, never looked backwards explicitly."
        ],
        result: "The map is doing the \"look backwards\" for you in O(1), which is exactly why the nested loop disappears."
      },
      pitfalls: [
        "Inserting into the map before checking for the complement, which lets an element pair with itself when target is 2 * nums[i].",
        "Comparing boxed Integer keys with == instead of .equals. Java caches only -128..127, so == silently works on small tests and fails on large ones.",
        "Assuming HashMap iteration order is insertion order. It is not. Use LinkedHashMap if order matters.",
        "Reaching for a HashMap when the alphabet is fixed and tiny, where int[26] is strictly better."
      ],
      complexity: "O(n) time and O(n) space for both shapes. This is optimal for these problems, since you must at minimum read the whole input."
    },
    checks: [
      {
        q: "In one-pass Two Sum, why must you check for the complement BEFORE putting the current number into the map?",
        a: "Otherwise, when target is exactly 2 * nums[i], the current element finds itself and you return [i, i], reusing one element twice. Checking first guarantees any hit refers to an earlier, distinct index."
      },
      {
        q: "You need to group anagrams together. What makes a valid map key, and what does it cost?",
        a: "Either the word's characters sorted into a string, at O(k log k) per word, or a 26-slot count array serialized into a string, at O(k) per word. Both send every anagram of a word to one identical key."
      },
      {
        q: "When should you use int[26] instead of a HashMap?",
        a: "When keys are a small fixed alphabet such as lowercase letters. Array indexing skips hashing and boxing, so it is meaningfully faster, and c - 'a' gives you the index directly."
      }
    ],
    snippet: `// Counting
Map<Character, Integer> freq = new HashMap<>();
for (char c : s.toCharArray()) {
    freq.put(c, freq.getOrDefault(c, 0) + 1);
}

// Complement lookup in ONE pass (Two Sum)
Map<Integer, Integer> seen = new HashMap<>(); // value -> index
for (int i = 0; i < nums.length; i++) {
    int need = target - nums[i];
    if (seen.containsKey(need)) return new int[]{seen.get(need), i};
    seen.put(nums[i], i);          // AFTER the check, never before
}

// Grouping by a canonical key
Map<String, List<String>> groups = new HashMap<>();
for (String w : words) {
    char[] a = w.toCharArray();
    Arrays.sort(a);
    groups.computeIfAbsent(new String(a), k -> new ArrayList<>()).add(w);
}

// Fixed alphabet: int[] beats a Map
int[] count = new int[26];
count[c - 'a']++;`
  },

  {
    id: "twopointers",
    name: "Two pointers",
    summary:
      "Use when the input is sorted (or you can sort it) and you need a pair or triple meeting a condition. Two converging pointers turn an O(n^2) pair search into O(n), because each comparison lets you discard an entire side.",
    lesson: {
      recognize: [
        "The input is sorted, or sorting it does not destroy what the problem asks for.",
        "You need a pair, triple, or subarray whose sum meets a target.",
        "The problem demands O(1) extra space or an in-place rearrangement.",
        "Palindrome checks, reversing, or partitioning around a value."
      ],
      mechanics:
        "Converging pointers work because sortedness makes a single comparison informative. With lo at the smallest remaining value and hi at the largest, if their sum is too small then no partner for lo anywhere in the range can fix it, because everything left of hi is smaller still. So lo is eliminated entirely, and you advance it. Each step discards one index permanently, which is why the scan is linear.\n\nThe second variant is fast/slow, which is really a reader and a writer. The fast pointer reads every element; the slow pointer marks where the next kept element belongs. This gives in-place filtering with no extra array.\n\nIf you sort, confirm the problem does not need original indices. Two Sum returns indices, so it is a HashMap problem, not a two-pointer problem. That distinction gets tested.",
      walkthrough: {
        title: "Container With Most Water on height = [1, 8, 6, 2, 5, 4, 8, 3, 7]",
        steps: [
          "lo = 0 (height 1), hi = 8 (height 7). Area = min(1,7) * 8 = 8. The left line is shorter, so move lo.",
          "lo = 1 (height 8), hi = 8 (height 7). Area = min(8,7) * 7 = 49. Best so far. The right line is shorter, so move hi.",
          "lo = 1 (height 8), hi = 7 (height 3). Area = min(8,3) * 6 = 18. Move hi again.",
          "Continue converging. Nothing beats 49, so the answer is 49."
        ],
        result: "Every step moved the shorter line. That is the only move that can possibly help, which is what makes one linear pass sufficient."
      },
      pitfalls: [
        "Moving the taller line in container problems, which can never improve the area and loses the correct answer.",
        "Forgetting to skip duplicates in 3Sum, which emits duplicate triplets.",
        "Confusing while (lo < hi) with while (lo <= hi). If the two pointers must be distinct elements, you need the strict version.",
        "Sorting when the problem requires the original indices."
      ],
      complexity: "O(n) for the scan itself, O(1) extra space. If you had to sort first, the total becomes O(n log n), dominated by the sort."
    },
    checks: [
      {
        q: "Container With Most Water: why is it always safe to move the shorter line?",
        a: "Area is bounded by the shorter line times the width. Moving the taller line keeps the same bottleneck height while shrinking the width, so the area can only stay equal or shrink. Moving the shorter one is the only move with any upside."
      },
      {
        q: "In 3Sum, exactly where do you skip duplicates?",
        a: "Three places: on the outer index i when nums[i] equals nums[i-1], and on both lo and hi immediately after recording a valid triplet. Missing any of the three produces duplicate output."
      },
      {
        q: "Why can't two pointers solve pair-sum on an unsorted array?",
        a: "The move decision relies on knowing everything right of hi is larger and everything left of lo is smaller. Without sortedness the comparison tells you nothing about which side to discard, so you cannot eliminate anything."
      }
    ],
    snippet: `// Converging from both ends on a SORTED array
int lo = 0, hi = nums.length - 1;
while (lo < hi) {
    int sum = nums[lo] + nums[hi];
    if (sum == target) return new int[]{lo, hi};
    else if (sum < target) lo++;   // need bigger
    else hi--;                     // need smaller
}

// Fast/slow: reader and writer, overwrite in place
int slow = 0;
for (int fast = 0; fast < nums.length; fast++) {
    if (nums[fast] != val) nums[slow++] = nums[fast];
}
return slow;                       // new logical length

// Skipping duplicates (critical in 3Sum)
while (lo < hi && nums[lo] == nums[lo + 1]) lo++;
while (lo < hi && nums[hi] == nums[hi - 1]) hi--;`
  },

  {
    id: "slidingwindow",
    name: "Sliding window",
    summary:
      "The go-to for \"longest / shortest / count of contiguous subarray or substring satisfying X.\" You expand the right edge one step at a time, then shrink from the left with a while loop for exactly as long as the window is invalid.",
    lesson: {
      recognize: [
        "The word contiguous appears, paired with longest, shortest, or count.",
        "Constraints phrased as \"at most K distinct\" or \"at most K replacements\".",
        "A fixed window of exactly size k.",
        "You are about to enumerate every substring, which would be O(n^2)."
      ],
      mechanics:
        "The window is a range [left, right] that only ever grows on the right and shrinks on the left. Because neither pointer ever moves backwards, each index enters the window once and leaves at most once. That is why the algorithm is O(n) even though a while loop sits inside a for loop.\n\nThe part people get wrong is where the answer gets recorded, and it flips depending on the question.\n\nFor a MAXIMIZING problem (longest valid window), you shrink while the window is INVALID, then record after the while loop, at which point the window is guaranteed valid again.\n\nFor a MINIMIZING problem (shortest valid window), you shrink while the window is still VALID, recording the length inside the loop just before each shrink, because you want the smallest valid window before it breaks.\n\nThe shrink must be a while, not an if. One removal is not always enough to restore validity.",
      walkthrough: {
        title: "Longest Substring Without Repeating Characters on \"pwwkew\"",
        steps: [
          "right = 0, add 'p'. Window \"p\", valid. Best = 1.",
          "right = 1, add 'w'. Window \"pw\", valid. Best = 2.",
          "right = 2, add 'w'. Duplicate, so shrink: drop 'p' (left = 1), still duplicate, drop 'w' (left = 2). Window \"w\". Best stays 2.",
          "right = 3, add 'k'. Window \"wk\". Best stays 2.",
          "right = 4, add 'e'. Window \"wke\", valid, length 3. Best = 3.",
          "right = 5, add 'w'. Duplicate, so shrink: drop 'w' (left = 3). Window \"kew\", length 3. Best stays 3."
        ],
        result: "Answer is 3. Note step three needed TWO removals, which is exactly why the shrink is a while loop and not an if."
      },
      pitfalls: [
        "Using if instead of while for the shrink, which leaves the window invalid.",
        "Recording the answer in the wrong place for a min problem versus a max problem.",
        "Forgetting to remove a key when its count hits zero, which breaks any logic based on map.size() as a distinct count.",
        "For fixed-size windows, starting to record before the window is actually full (guard with i >= k - 1)."
      ],
      complexity: "O(n) time, since left and right each traverse the array at most once. Space is O(k), bounded by the alphabet or the window contents."
    },
    checks: [
      {
        q: "Maximizing versus minimizing window: where does the answer get recorded in each?",
        a: "Maximizing (longest valid): shrink while INVALID, then record after the while loop when the window is valid again. Minimizing (shortest valid): shrink while VALID, recording the length inside the loop before each shrink."
      },
      {
        q: "Why is this O(n) when there is a while loop nested inside a for loop?",
        a: "left only ever moves forward and never passes right, so across the entire run it advances at most n times total. Total work is bounded by about 2n pointer moves, not n squared."
      },
      {
        q: "In Longest Repeating Character Replacement, what exactly makes a window valid?",
        a: "windowLength minus the count of the most frequent character in the window must be at most k, because that difference is precisely how many characters you would need to replace."
      }
    ],
    snippet: `// MAXIMIZING template: expand right, shrink while INVALID, record after
Map<Character, Integer> window = new HashMap<>();
int left = 0, best = 0;

for (int right = 0; right < s.length(); right++) {
    char c = s.charAt(right);
    window.put(c, window.getOrDefault(c, 0) + 1);

    while (window.get(c) > 1) {          // while INVALID
        char d = s.charAt(left++);
        window.put(d, window.get(d) - 1);
        if (window.get(d) == 0) window.remove(d);
    }
    best = Math.max(best, right - left + 1);   // record when valid
}
return best;

// MINIMIZING template: record INSIDE the shrink loop
int left = 0, sum = 0, best = Integer.MAX_VALUE;
for (int right = 0; right < n; right++) {
    sum += nums[right];
    while (sum >= target) {              // while VALID
        best = Math.min(best, right - left + 1);
        sum -= nums[left++];
    }
}
return best == Integer.MAX_VALUE ? 0 : best;

// FIXED-size window of k
long sum = 0;
for (int i = 0; i < n; i++) {
    sum += nums[i];
    if (i >= k) sum -= nums[i - k];
    if (i >= k - 1) best = Math.max(best, sum);
}`
  },

  {
    id: "grid",
    name: "BFS / DFS on grids",
    summary:
      "Any 2D matrix question about connected regions, flood fill, or shortest path in an unweighted grid. DFS counts or sizes components; BFS finds minimum steps or models simultaneous spread over time.",
    lesson: {
      recognize: [
        "A 2D matrix plus the words island, region, connected, or flood fill.",
        "Shortest path or minimum steps in a grid where every move costs the same.",
        "Something spreading outward over discrete time steps.",
        "Counting how many separate groups exist."
      ],
      mechanics:
        "Treat the grid as a graph where each cell has up to four neighbours. The only real decision is DFS or BFS.\n\nUse DFS when you need to identify or measure a connected component: count islands, compute an area, fill a region. Recursion is the shortest code, and returning a value from the recursive call lets the area sum itself.\n\nUse BFS when the answer is a number of steps, minutes, or levels. Freeze the queue size at the top of each iteration and process exactly that many cells, so one outer iteration equals one unit of distance. If several sources spread at once, seed the queue with all of them before starting; that is multi-source BFS and it costs nothing extra.\n\nMark a cell visited the moment you enqueue it, never when you dequeue it. If you wait, several neighbours can enqueue the same cell before it is processed, and it sits in the queue multiple times.",
      walkthrough: {
        title: "Number of Islands on [[1,1,0],[0,1,0],[0,0,1]]",
        steps: [
          "Scan row-major. Cell (0,0) is land, so count = 1 and start a DFS.",
          "DFS sinks (0,0), then (0,1), then (1,1), setting each to water so they are never revisited.",
          "Scanning resumes. (0,1) and (1,1) are now water, so they are skipped.",
          "Cell (2,2) is land and untouched, so count = 2 and a second DFS sinks just that cell.",
          "Scan finishes with count = 2."
        ],
        result: "Mutating the grid to '0' doubles as the visited set, which is why no separate boolean[][] is needed here."
      },
      pitfalls: [
        "Marking visited on dequeue instead of enqueue, which lets duplicates pile up in the queue.",
        "Assuming a square grid. Use grid.length for rows and grid[0].length for columns.",
        "Using DFS for a shortest-path question. DFS finds a path, not the shortest one.",
        "Missing the 8-directional move set when the problem allows diagonal moves.",
        "Forgetting the trivial blocked-start case, where the very first cell is impassable."
      ],
      complexity: "O(m * n) time and space. Every cell is enqueued or visited at most once, and each has a constant number of neighbours."
    },
    checks: [
      {
        q: "Why mark cells visited when you ENQUEUE rather than when you dequeue?",
        a: "If you wait until dequeue, the same cell can be pushed by several different neighbours before it is ever processed, so it occupies the queue multiple times. That inflates memory and redoes work."
      },
      {
        q: "When do you need the 'int size = q.size()' level loop?",
        a: "Whenever the answer is a count of steps, minutes, or levels. Freezing the size processes exactly one level per outer iteration, so your counter corresponds to distance from the source."
      },
      {
        q: "The problem asks for the shortest path in an unweighted grid. Why is DFS wrong?",
        a: "DFS finds some path, not the shortest; its first arrival at the target may be via a long detour. BFS explores in increasing order of distance, so its first arrival is guaranteed minimal."
      }
    ],
    snippet: `static final int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};

// DFS flood fill, returning the area it consumed
int dfs(int[][] g, int r, int c) {
    if (r < 0 || r >= g.length || c < 0 || c >= g[0].length || g[r][c] != 1) return 0;
    g[r][c] = 0;                       // mutate as the visited set
    int area = 1;
    for (int[] d : DIRS) area += dfs(g, r + d[0], c + d[1]);
    return area;
}

// BFS by LEVELS, when the answer is a number of steps
Deque<int[]> q = new ArrayDeque<>();
boolean[][] seen = new boolean[m][n];
q.offer(new int[]{sr, sc});
seen[sr][sc] = true;
int steps = 0;

while (!q.isEmpty()) {
    int size = q.size();               // freeze this level
    for (int i = 0; i < size; i++) {
        int[] cur = q.poll();
        for (int[] d : DIRS) {
            int nr = cur[0] + d[0], nc = cur[1] + d[1];
            if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
            if (seen[nr][nc] || grid[nr][nc] == 0) continue;
            seen[nr][nc] = true;       // mark on ENQUEUE
            q.offer(new int[]{nr, nc});
        }
    }
    steps++;
}`
  },

  {
    id: "binarysearch",
    name: "Binary search (incl. search on answer)",
    summary:
      "Beyond finding a value in a sorted array, the money version is binary searching the answer space: when the question asks for a minimum speed or capacity and you can write a monotonic boolean feasible(x), binary search that predicate.",
    lesson: {
      recognize: [
        "The array is sorted, or sorted then rotated.",
        "The required complexity is O(log n) and the input is large.",
        "The prompt asks for the minimum or maximum X such that something holds.",
        "The answer is a number in a known range, and you could easily test whether a given candidate works."
      ],
      mechanics:
        "Plain binary search finds a value. The version that actually shows up in OAs searches the ANSWER, not the array.\n\nThe setup: if you can write feasible(x) that returns whether candidate answer x works, and that predicate is monotonic (false for every x below some boundary, true for every x at or above it), then finding the boundary is exactly binary search. You never search the input at all; you search the range of possible answers.\n\nUse the lo < hi form, which never computes a mid it cannot use. When feasible(mid) is true, set hi = mid, keeping mid as a live candidate. When false, set lo = mid + 1, discarding it. One branch strictly advances and the other strictly shrinks, so the loop always terminates with lo == hi sitting on the boundary. No post-loop adjustment, and no classic off-by-one.\n\nAlways write mid = lo + (hi - lo) / 2. The form (lo + hi) / 2 overflows int when both are large.",
      walkthrough: {
        title: "Koko Eating Bananas on piles = [3, 6, 7, 11], h = 8",
        steps: [
          "Answer range is [1, 11], since eating 11 per hour finishes any pile in one hour.",
          "mid = 6: hours = 1 + 1 + 2 + 2 = 6, which is <= 8. Feasible, so hi = 6.",
          "Range [1, 6], mid = 3: hours = 1 + 2 + 3 + 4 = 10, which is > 8. Not feasible, so lo = 4.",
          "Range [4, 6], mid = 5: hours = 1 + 2 + 2 + 3 = 8, which is <= 8. Feasible, so hi = 5.",
          "Range [4, 5], mid = 4: hours = 1 + 2 + 2 + 3 = 8, feasible, so hi = 4. Now lo == hi == 4."
        ],
        result: "Answer is 4. Notice the array was never searched; the search ran over candidate speeds."
      },
      pitfalls: [
        "Writing (lo + hi) / 2, which overflows for large bounds.",
        "Setting lo = mid instead of mid + 1 in the discarding branch, which loops forever.",
        "Choosing wrong initial bounds. For ship capacity the lower bound is max(weights), not 1, since no capacity below the heaviest package can ever work.",
        "Overflowing the accumulator inside feasible(). Use a long for running sums or hour counts.",
        "Writing floor division where the problem needs a ceiling. Use (a + b - 1) / b."
      ],
      complexity: "O(log(range)) iterations, each costing one feasibility scan of O(n), so O(n log(maxAnswer)) overall."
    },
    checks: [
      {
        q: "What property must feasible(x) have for search-on-answer to be valid?",
        a: "Monotonicity: once it turns true it must stay true as x grows, giving a false...false,true...true shape. Binary search is then just locating that single boundary."
      },
      {
        q: "Why does the lo < hi form with hi = mid avoid infinite loops?",
        a: "The other branch is lo = mid + 1, which strictly advances. And whenever lo < hi, mid is strictly less than hi, so hi = mid strictly shrinks the range too. Both branches make progress, and the loop exits with lo == hi."
      },
      {
        q: "Capacity To Ship Packages: what are the correct initial lo and hi?",
        a: "lo = max(weights), because any capacity below the heaviest single package can never ship it at all. hi = sum(weights), which ships everything in a single day."
      }
    ],
    snippet: `// Classic: find target, or -1
int lo = 0, hi = nums.length - 1;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;   // never (lo + hi) / 2
    if (nums[mid] == target) return mid;
    else if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
}
return -1;

// SEARCH ON ANSWER: smallest x where feasible(x) is true
int lo = 1, hi = maxPossible;
while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    if (feasible(mid)) hi = mid;    // mid may be the answer, keep it
    else lo = mid + 1;              // mid too small, discard it
}
return lo;                          // lo == hi == boundary

// A typical predicate: can we finish within h hours at speed k?
boolean feasible(int[] piles, int h, int k) {
    long hours = 0;                       // long, not int
    for (int p : piles) hours += (p + k - 1) / k;   // ceiling division
    return hours <= h;
}`
  },

  {
    id: "stack",
    name: "Stack-based",
    summary:
      "Two distinct uses. First, matching nested structure: push openers, pop and verify on each closer. Second, the monotonic stack, which answers \"next greater element\" for every index in one O(n) pass.",
    lesson: {
      recognize: [
        "Brackets, parentheses, or any nested structure to validate.",
        "The phrase next greater, next smaller, or \"how far until something larger\".",
        "Expression evaluation, especially postfix or prefix notation.",
        "You need the most recent unresolved item, which is exactly LIFO."
      ],
      mechanics:
        "A stack gives you the most recently seen unresolved thing in O(1), which is what nested structure requires: a closer must match the nearest unmatched opener.\n\nThe monotonic stack is the version worth drilling. You keep a stack of INDICES whose answers are still pending, ordered so their values decrease from bottom to top. When a new element arrives that is larger than the value at the top, it is the answer for that pending index, so you pop and record. You keep popping while the new element beats the top, then push the new index as itself pending.\n\nThe runtime looks quadratic because of the while inside the for, but each index is pushed exactly once and popped at most once. Total pops across the whole run are bounded by n, so the amortized cost is O(n).\n\nStore indices rather than values whenever the answer involves a distance, since you cannot recover position from a value alone.\n\nIn Java, use ArrayDeque rather than the legacy java.util.Stack, which is synchronized and slower.",
      walkthrough: {
        title: "Daily Temperatures on [73, 74, 75, 71, 69, 72, 76]",
        steps: [
          "i = 0 (73): stack empty, push 0. Stack: [0]",
          "i = 1 (74): 74 > 73, pop 0 and set res[0] = 1 - 0 = 1. Push 1. Stack: [1]",
          "i = 2 (75): 75 > 74, pop 1 and set res[1] = 1. Push 2. Stack: [2]",
          "i = 3 (71): 71 < 75, nothing resolves. Push 3. Stack: [2,3]",
          "i = 4 (69): 69 < 71. Push 4. Stack: [2,3,4]",
          "i = 5 (72): 72 > 69, pop 4, res[4] = 1. 72 > 71, pop 3, res[3] = 2. 72 < 75, stop. Push 5. Stack: [2,5]",
          "i = 6 (76): 76 > 72, pop 5, res[5] = 1. 76 > 75, pop 2, res[2] = 4. Push 6. Stack: [6]"
        ],
        result: "res = [1,1,4,2,1,1,0]. Index 6 never resolved, so it keeps its default 0."
      },
      pitfalls: [
        "Popping without first checking that the stack is non-empty.",
        "Returning true at the end while unclosed openers remain on the stack.",
        "Storing values instead of indices, then being unable to compute the distance.",
        "Using java.util.Stack instead of ArrayDeque.",
        "Reversing operand order in RPN. The FIRST value popped is the right operand."
      ],
      complexity: "O(n) time and O(n) space. Each element is pushed once and popped at most once, so the inner while loop is amortized constant."
    },
    checks: [
      {
        q: "Daily Temperatures has a while loop inside a for loop. Why is it O(n) and not O(n^2)?",
        a: "Each index is pushed exactly once and popped at most once, so total pops across the entire run are at most n. The inner loop's work is amortized, averaging out to constant per iteration."
      },
      {
        q: "Why store indices rather than temperatures in the monotonic stack?",
        a: "The answer is a distance in days, i - j. With only values you could not recover j, so you could neither compute the gap nor know which slot of the result array to write."
      },
      {
        q: "In Evaluate RPN you pop two values for '-'. Which one is the left operand?",
        a: "The SECOND value popped. The first pop is the right operand, so the result is secondPop - firstPop. Reversing this silently breaks subtraction and division while addition and multiplication still look fine."
      }
    ],
    snippet: `// Matching pairs
Deque<Character> st = new ArrayDeque<>();
for (char c : s.toCharArray()) {
    if (c == '(' || c == '[' || c == '{') st.push(c);
    else {
        if (st.isEmpty()) return false;       // closer with no opener
        char open = st.pop();
        if (c == ')' && open != '(') return false;
        if (c == ']' && open != '[') return false;
        if (c == '}' && open != '{') return false;
    }
}
return st.isEmpty();       // leftovers mean unclosed openers

// MONOTONIC stack: next greater element for every index
int[] res = new int[n];                       // 0 means none found
Deque<Integer> stack = new ArrayDeque<>();    // INDICES, values decreasing
for (int i = 0; i < n; i++) {
    while (!stack.isEmpty() && nums[i] > nums[stack.peek()]) {
        int j = stack.pop();
        res[j] = i - j;                       // or nums[i] for the value
    }
    stack.push(i);
}`
  },

  {
    id: "dp",
    name: "Basic 1D DP",
    summary:
      "Define dp[i] as the answer considering the first i elements, find the recurrence relating dp[i] to a couple of earlier entries, set the base cases. Most 1D DP collapses to two rolling variables once the recurrence is confirmed.",
    lesson: {
      recognize: [
        "Count the number of distinct ways to do something.",
        "Maximize or minimize over a sequence of choices with a constraint linking them.",
        "A restriction like \"you cannot take two adjacent elements\".",
        "Reach a target amount, step, or index using given pieces."
      ],
      mechanics:
        "Do these three things in order, and write them down before you write code.\n\nFirst, state what dp[i] MEANS in one sentence, as a comment. Almost every DP bug is index confusion between \"the first i elements\" and \"the element at index i\", and naming the meaning kills that class of bug outright.\n\nSecond, write the recurrence: how does dp[i] follow from earlier entries? For House Robber the choice at house i is skip it and keep dp[i-1], or take it and add dp[i-2]. So dp[i] = max(dp[i-1], dp[i-2] + value).\n\nThird, set base cases, which is where off-by-ones hide. If dp[i] means \"first i elements\", then dp[0] describes the empty prefix, and nums[i-1] is the element that dp[i] just considered.\n\nOnly after the table version is correct should you collapse it. If the recurrence looks back a constant number of steps, two rolling variables replace the whole array and drop space to O(1).",
      walkthrough: {
        title: "House Robber on nums = [2, 7, 9, 3, 1], where dp[i] = best over the first i houses",
        steps: [
          "dp[0] = 0, the empty prefix. dp[1] = 2, only house 0 available.",
          "dp[2] = max(dp[1], dp[0] + 7) = max(2, 7) = 7. Taking house 1 beats keeping house 0.",
          "dp[3] = max(dp[2], dp[1] + 9) = max(7, 11) = 11. Houses 0 and 2.",
          "dp[4] = max(dp[3], dp[2] + 3) = max(11, 10) = 11. Skipping house 3 is better.",
          "dp[5] = max(dp[4], dp[3] + 1) = max(11, 12) = 12. Houses 0, 2, and 4."
        ],
        result: "Answer is 12. Each entry only ever read dp[i-1] and dp[i-2], which is the signal that two variables suffice."
      },
      pitfalls: [
        "Not writing down what dp[i] means, then losing track of the offset between dp indices and array indices.",
        "Wrong base cases, particularly dp[0] for the empty prefix versus the first element.",
        "Initializing the Maximum Subarray answer to 0, which returns 0 on all-negative input when the subarray must be non-empty.",
        "In Coin Change, filling with Integer.MAX_VALUE then adding 1, which overflows to a negative and silently wins the min. Use amount + 1 as the sentinel.",
        "Nesting the coin and amount loops in the order that counts permutations when the question wants combinations."
      ],
      complexity: "O(n) time and O(1) space for the rolling-variable form. Coin Change is O(n * amount) time and O(amount) space."
    },
    checks: [
      {
        q: "What single habit prevents most 1D DP bugs?",
        a: "Writing the meaning of dp[i] as a comment before writing the recurrence. Most bugs are index confusion between \"the first i elements\" and \"the element at index i\", and naming it resolves that immediately."
      },
      {
        q: "Maximum Subarray on all-negative input like [-3,-1,-2]. What breaks in a naive implementation?",
        a: "Initializing best = 0 returns 0, but the subarray must be non-empty so the correct answer is -1. Initialize both best and cur to nums[0] and start the loop at index 1."
      },
      {
        q: "Coin Change: why fill dp with amount + 1 rather than Integer.MAX_VALUE?",
        a: "You compute dp[i - coin] + 1. If that entry is Integer.MAX_VALUE the addition overflows to a negative number, which then wins the min and corrupts the table. amount + 1 exceeds any real answer but stays safe to add to."
      }
    ],
    snippet: `// Full table: state the MEANING of dp[i] before anything else
// dp[i] = max amount robbable from the first i houses
int[] dp = new int[n + 1];
dp[0] = 0;
dp[1] = nums[0];
for (int i = 2; i <= n; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i - 1]);
}
return dp[n];

// Same recurrence, O(1) space with rolling variables
int prev2 = 0, prev1 = 0;
for (int x : nums) {
    int cur = Math.max(prev1, prev2 + x);
    prev2 = prev1;
    prev1 = cur;
}
return prev1;

// Kadane: extend the current subarray, or start fresh here
int best = nums[0], cur = nums[0];     // NOT 0, for all-negative input
for (int i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
}
return best;`
  },

  {
    id: "heap",
    name: "Heap / k-way merge",
    summary:
      "When you need the k best of something, or to merge many sorted sequences at once, a PriorityQueue hands you the current extreme in O(log n). Merge k Sorted Lists is the flagship problem, and you should know both the heap and the divide-and-conquer solution.",
    lesson: {
      recognize: [
        "The words k largest, k smallest, kth largest, or top k.",
        "Merge k sorted lists or k sorted arrays into one.",
        "Top k by frequency, distance, or score.",
        "You need a running minimum or maximum as data arrives in a stream."
      ],
      mechanics:
        "A heap answers exactly one question quickly: what is the smallest thing I currently hold? Java's PriorityQueue is a MIN-heap by default, so pass Comparator.reverseOrder() when you want the largest.\n\nFor \"k largest\", the counter-intuitive move is a MIN-heap of size k, not a max-heap. Push every element, and whenever the size exceeds k, poll. The weakest of your k survivors always sits on top, ready to be evicted, so the heap ends holding exactly the k largest. That is O(n log k) time and O(k) space, instead of O(n log n) and O(n) for sorting everything.\n\nMerging k sorted lists has two standard solutions and interviewers ask for both. The heap solution seeds a min-heap with the head of every list, then repeatedly polls the smallest node, appends it, and pushes that node's successor. The heap never exceeds size k, giving O(N log k) where N is the total node count.\n\nThe divide-and-conquer solution is what people mean by \"can you do it without a heap\". Merge the lists pairwise, halving how many remain each round. After log k rounds one list is left. Every node is touched once per round, so it is also O(N log k), but with no auxiliary structure and a simpler inner loop.",
      walkthrough: {
        title: "Merge k Sorted Lists by divide and conquer on [[1,4,5], [1,3,4], [2,6]]",
        steps: [
          "Round 1, pair them up: merge [1,4,5] with [1,3,4], giving [1,1,3,4,4,5]. The odd list [2,6] carries forward untouched.",
          "Two lists now remain: [1,1,3,4,4,5] and [2,6].",
          "Round 2: merge those two, giving [1,1,2,3,4,4,5,6].",
          "One list remains, so return it."
        ],
        result: "Two rounds for three lists, which is ceil(log2 3). Each round touches all N nodes exactly once, so the total is O(N log k)."
      },
      pitfalls: [
        "Forgetting PriorityQueue is a MIN-heap and getting the k largest backwards.",
        "Heaping all n elements when a size-k heap does the job, turning O(n log k) into O(n log n).",
        "Failing to push node.next after polling in a k-way merge, which silently drops the rest of that list.",
        "Not skipping null lists in the input array, which throws immediately on the first offer.",
        "Iterating a PriorityQueue and expecting sorted order. Only repeated poll() gives sorted order; the iterator does not."
      ],
      complexity: "Each heap operation is O(log k). Merge k Sorted Lists is O(N log k) by either method. Kth largest with a size-k min-heap is O(n log k) time and O(k) space."
    },
    checks: [
      {
        q: "You need the k largest elements of a huge array. Why use a MIN-heap of size k rather than a max-heap of everything?",
        a: "A size-k min-heap holds only the k best candidates so far, with the weakest on top for O(1) identification and O(log k) eviction. That is O(n log k) time and O(k) space, versus O(n log n) and O(n) for sorting or heapifying the whole array. When k is small and n is huge, the win is large."
      },
      {
        q: "Merge k Sorted Lists without a heap: what is the approach and its complexity?",
        a: "Divide and conquer. Merge the lists pairwise so the count halves each round, for log k rounds. Every node is touched once per round, giving O(N log k) total with no auxiliary data structure."
      },
      {
        q: "In the heap solution to k-way merge, what must you do immediately after polling a node?",
        a: "Push its successor node.next if it is non-null. Skipping that drops the remainder of that list from the output, and it is the single most common bug in this problem."
      }
    ],
    snippet: `// Java's PriorityQueue is a MIN-heap by default
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());

// K LARGEST with a size-k MIN-heap: O(n log k)
PriorityQueue<Integer> pq = new PriorityQueue<>();
for (int x : nums) {
    pq.offer(x);
    if (pq.size() > k) pq.poll();      // evict the weakest survivor
}
return pq.peek();                      // the kth largest

// K-WAY MERGE with a heap: O(N log k)
PriorityQueue<ListNode> heap = new PriorityQueue<>((a, b) -> a.val - b.val);
for (ListNode l : lists) if (l != null) heap.offer(l);   // skip nulls
ListNode dummy = new ListNode(0), tail = dummy;
while (!heap.isEmpty()) {
    ListNode node = heap.poll();
    tail.next = node;
    tail = node;
    if (node.next != null) heap.offer(node.next);   // ADVANCE, or you drop the list
}
return dummy.next;

// K-WAY MERGE by DIVIDE AND CONQUER: same O(N log k), no heap
ListNode mergeRange(ListNode[] lists, int lo, int hi) {
    if (lo == hi) return lists[lo];
    int mid = lo + (hi - lo) / 2;
    return mergeTwo(mergeRange(lists, lo, mid), mergeRange(lists, mid + 1, hi));
}`
  },

  {
    id: "matrix",
    name: "Matrix simulation (spiral & rings)",
    summary:
      "CodeSignal loves problems that are pure careful implementation on a 2D grid: walk it in a spiral, rotate it, or process it ring by ring. There is no clever algorithm to find. The entire difficulty is boundary discipline.",
    lesson: {
      recognize: [
        "The words spiral, clockwise, ring, layer, border, or rotate.",
        "The prompt reads like \"just do exactly this\" with no hidden optimization to discover.",
        "The output is a transformed matrix rather than a single number.",
        "You are near the start of a CodeSignal assessment, where questions 1 and 2 are usually simulation."
      ],
      mechanics:
        "These problems have no algorithmic trick, which is exactly why people lose points on them. You lose to your own off-by-ones, under time pressure, on a problem you understand completely.\n\nUse four moving walls: top, bottom, left, and right. Walk the top row left to right, then increment top. Walk the right column top to bottom, then decrement right. Walk the bottom row right to left, then decrement bottom. Walk the left column bottom to top, then increment left. Repeat while top <= bottom and left <= right.\n\nThe third and fourth legs need a guard that the first two do not. By the time you reach them you have already moved top and right inward, so if only a single row or column remains, you would walk cells you just consumed. Check top <= bottom before the bottom row, and left <= right before the left column.\n\nA ring, or layer, is one full loop of that walk. Ring r spans rows r through m-1-r and columns r through n-1-r, and there are ceil(min(m, n) / 2) of them.\n\nTo sort a matrix by rings: read ring r into a list in clockwise order, sort the list, then write it back walking that identical clockwise order from the identical starting cell. If the read and write orders differ at all, the values land rotated or mirrored, and the bug is very hard to see by eye.",
      walkthrough: {
        title: "Spiral traversal of [[1,2,3],[4,5,6],[7,8,9]]",
        steps: [
          "top=0, bottom=2, left=0, right=2. Walk the top row: 1, 2, 3. Now top=1.",
          "Walk the right column, rows 1 to 2: 6, 9. Now right=1.",
          "Guard passes since top(1) <= bottom(2). Walk the bottom row right to left, columns 1 to 0: 8, 7. Now bottom=1.",
          "Guard passes since left(0) <= right(1). Walk the left column, rows 1 to 1: 4. Now left=1.",
          "Loop again with top=bottom=left=right=1. Walk the top row: 5. Now top=2, so the loop ends."
        ],
        result: "Output is 1,2,3,6,9,8,7,4,5. That is the outer ring in clockwise order followed by the single center cell, which is ring 1."
      },
      pitfalls: [
        "Omitting the top <= bottom and left <= right guards, which double-visits a leftover single row or column.",
        "Assuming the matrix is square. Rows and columns need independent bounds, m and n.",
        "Using a different traversal order for reading a ring than for writing it back.",
        "Off-by-one in the ring count on odd dimensions, leaving the center cell unprocessed.",
        "Rotating in place with the wrong mapping. For 90 degrees clockwise, transpose the matrix, then reverse each row."
      ],
      complexity: "O(m * n) time, since each cell is visited a constant number of times. O(1) extra space for a plain traversal, or O(ring length) when a ring must be held and sorted."
    },
    checks: [
      {
        q: "Why do the third and fourth legs of a spiral walk need a guard that the first two do not?",
        a: "By then you have already incremented top and decremented right. If only one row or one column is left, walking the bottom row or the left column would revisit cells the first two legs just consumed. Checking top <= bottom and left <= right prevents that double visit."
      },
      {
        q: "How many rings does an m x n matrix have, and what does ring r span?",
        a: "There are ceil(min(m, n) / 2) rings. Ring r covers rows r through m-1-r and columns r through n-1-r."
      },
      {
        q: "When sorting each ring of a matrix, what single thing must match between reading and writing?",
        a: "The traversal order, including the starting cell. If you read clockwise from the top-left you must write clockwise from the top-left, or the sorted values land rotated relative to where they belong."
      }
    ],
    snippet: `// FOUR WALLS: the reliable spiral walk
int top = 0, bottom = m - 1, left = 0, right = n - 1;
while (top <= bottom && left <= right) {
    for (int c = left; c <= right; c++) out.add(grid[top][c]);
    top++;
    for (int r = top; r <= bottom; r++) out.add(grid[r][right]);
    right--;
    if (top <= bottom) {                  // GUARD: row may already be consumed
        for (int c = right; c >= left; c--) out.add(grid[bottom][c]);
        bottom--;
    }
    if (left <= right) {                  // GUARD: column may already be consumed
        for (int r = bottom; r >= top; r--) out.add(grid[r][left]);
        left++;
    }
}

// ONE RING at a time: ring r spans rows r..m-1-r, cols r..n-1-r
int rings = (Math.min(m, n) + 1) / 2;
for (int r = 0; r < rings; r++) {
    List<Integer> ring = readRingClockwise(grid, r);
    Collections.sort(ring);
    writeRingClockwise(grid, r, ring);    // SAME order, SAME start cell
}

// Rotate 90 degrees clockwise in place: transpose, then reverse each row
for (int i = 0; i < n; i++)
    for (int j = i + 1; j < n; j++) {
        int t = a[i][j]; a[i][j] = a[j][i]; a[j][i] = t;
    }
for (int[] row : a) {
    for (int i = 0, j = n - 1; i < j; i++, j--) {
        int t = row[i]; row[i] = row[j]; row[j] = t;
    }
}`
  },

  {
    id: "greedy",
    name: "Greedy construction from counters",
    summary:
      "Build an output string or schedule from counts of each item, always spending the most plentiful legal item first. This is the backbone of the constructive problems that CodeSignal and TikTok OAs lean on.",
    lesson: {
      recognize: [
        "You are given counts, or you compute them, and asked to CONSTRUCT a valid arrangement.",
        "Constraints like \"no two adjacent may be equal\" or \"identical items must be k apart\".",
        "The answer might legitimately be \"impossible\", so feasibility is part of the problem.",
        "Words like rearrange, reorganize, schedule, or distribute."
      ],
      mechanics:
        "The template is short: count everything, then repeatedly place the item with the largest remaining count that is currently legal.\n\nA max-heap keyed on remaining count gives you \"largest remaining\" directly. Place that item, decrement its count, and hold it aside. Push it back only AFTER placing the next item. That one-turn holding pen is the entire mechanism enforcing \"no two adjacent\", and pushing it back too early quietly breaks everything.\n\nCheck feasibility up front rather than discovering failure halfway through. For \"no two adjacent equal\" over n items, a valid arrangement exists exactly when the largest count is at most (n + 1) / 2. That item must occupy alternating slots, and there are only that many alternating slots available.\n\nThere is also a no-heap version worth knowing, because it is shorter to write under time pressure. Sort the items by count descending, then write them into indices 0, 2, 4, and so on, wrapping to 1, 3, 5 once you run past the end. The most frequent item claims the even slots first, which is precisely the arrangement that maximizes separation.\n\nGreedy is provably correct here by an exchange argument: if a valid arrangement ever places a less plentiful legal item where a more plentiful legal one could have gone, you can swap the two without breaking validity. So always taking the most plentiful legal item never discards a solution.",
      walkthrough: {
        title: "Reorganize \"aaabbc\", counts a:3 b:2 c:1, total n = 6",
        steps: [
          "Feasibility: the largest count is 3, and (6 + 1) / 2 = 3. Since 3 <= 3, an arrangement exists.",
          "Place 'a' (2 left) and hold it. Output: \"a\"",
          "Largest legal is 'b' (2). Place it (1 left), hold 'b', release 'a'. Output: \"ab\"",
          "Largest legal is 'a' (2). Place it (1 left), hold 'a', release 'b'. Output: \"aba\"",
          "Largest legal is 'b' (1). Place it (0 left), hold 'b', release 'a'. Output: \"abab\"",
          "Largest legal is 'a' (1). Place it (0 left), hold 'a', release nothing since 'b' is exhausted. Output: \"ababa\"",
          "Only 'c' remains. Place it. Output: \"ababac\""
        ],
        result: "Spending the most plentiful legal item every turn is what keeps you from being cornered at the end holding two identical items that must go adjacent."
      },
      pitfalls: [
        "Skipping the feasibility check and returning a broken arrangement instead of \"\".",
        "Pushing the held item back onto the heap BEFORE placing the next one, which allows adjacent duplicates.",
        "Releasing an exhausted item back onto the heap, so a zero-count entry gets placed.",
        "Off-by-one in the (n + 1) / 2 bound. Integer division makes it correct for both odd and even n; simplifying it to n / 2 does not.",
        "Assuming a cooldown of k means holding for one turn. It means holding for k turns, which needs a queue rather than a single slot."
      ],
      complexity: "O(n log m) with a heap, where m is the number of distinct items and n is the output length. The sorted-fill variant is O(n + m log m)."
    },
    checks: [
      {
        q: "For \"no two adjacent characters may be equal\", what is the exact feasibility condition?",
        a: "The highest single count must be at most (n + 1) / 2 with integer division, where n is the total length. That item is forced onto alternating slots, and only that many exist."
      },
      {
        q: "In the heap approach, when exactly do you push the previously placed item back onto the heap?",
        a: "After placing the NEXT item, and only if its remaining count is still above zero. Holding it aside for exactly one turn is what makes an adjacent repeat impossible; releasing it earlier defeats the mechanism entirely."
      },
      {
        q: "Why is greedy correct here instead of needing DP or backtracking?",
        a: "An exchange argument. If some valid arrangement places a less plentiful legal item where a more plentiful legal one could have gone, swapping them keeps it valid. So the greedy choice never eliminates a reachable solution."
      }
    ],
    snippet: `// 1. Count everything
int[] count = new int[26];
for (char c : s.toCharArray()) count[c - 'a']++;

// 2. Check feasibility BEFORE building anything
int maxCount = 0;
for (int x : count) maxCount = Math.max(maxCount, x);
if (maxCount > (s.length() + 1) / 2) return "";

// 3. Max-heap on remaining count, holding the last placed item for ONE turn
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> b[1] - a[1]);  // {letter, count}
for (int i = 0; i < 26; i++) if (count[i] > 0) pq.offer(new int[]{i, count[i]});

StringBuilder sb = new StringBuilder();
int[] held = null;
while (!pq.isEmpty()) {
    int[] cur = pq.poll();
    sb.append((char) ('a' + cur[0]));
    cur[1]--;
    if (held != null && held[1] > 0) pq.offer(held);   // release AFTER placing
    held = cur;
}
return sb.toString();

// NO-HEAP alternative: fill even indices first, then wrap to the odd ones
char[] res = new char[n];
int idx = 0;
// iterate letters in DESCENDING count order, writing each 'count' times:
//     res[idx] = letter;  idx += 2;  if (idx >= n) idx = 1;`
  }
];

const PRACTICE_QUESTIONS = [
  /* ------------------------------ hashmap ------------------------------ */
  {
    id: "hm1", patternId: "hashmap", stage: "practice", title: "Two Sum",
    prompt: `Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.

You may assume that each input has exactly one solution, and you may not use the same element twice. You can return the answer in any order.

Example 1:
  Input:  nums = [2,7,11,15], target = 9
  Output: [0,1]          (because nums[0] + nums[1] == 9)

Example 2:
  Input:  nums = [3,2,4], target = 6
  Output: [1,2]

Example 3:
  Input:  nums = [3,3], target = 6
  Output: [0,1]

Constraints:
  2 <= nums.length <= 10^4
  -10^9 <= nums[i] <= 10^9
  -10^9 <= target <= 10^9`,
    hint: "Store value -> index as you scan. For each element compute target - nums[i] and look it up BEFORE inserting the current element, so nothing pairs with itself. One pass, O(n).",
    starter: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        
    }
}`
  },
  {
    id: "hm2", patternId: "hashmap", stage: "practice", title: "Group Anagrams",
    prompt: `Given an array of strings strs, group the anagrams together. You can return the answer in any order.

An anagram is a word formed by rearranging the letters of another, using all the original letters exactly once.

Example 1:
  Input:  strs = ["eat","tea","tan","ate","nat","bat"]
  Output: [["bat"],["nat","tan"],["ate","eat","tea"]]

Example 2:
  Input:  strs = [""]
  Output: [[""]]

Example 3:
  Input:  strs = ["a"]
  Output: [["a"]]

Constraints:
  1 <= strs.length <= 10^4
  0 <= strs[i].length <= 100
  strs[i] consists of lowercase English letters only.`,
    hint: "You need a key that is identical for all anagrams of a word. Sorting the characters works at O(k log k) per word. For O(k), build a 26-slot count array and serialize it into a string key.",
    starter: `class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        
    }
}`
  },
  {
    id: "hm3", patternId: "hashmap", stage: "interview", title: "Top K Frequent Elements",
    prompt: `Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.

Example 1:
  Input:  nums = [1,1,1,2,2,3], k = 2
  Output: [1,2]

Example 2:
  Input:  nums = [1], k = 1
  Output: [1]

Constraints:
  1 <= nums.length <= 10^5
  -10^4 <= nums[i] <= 10^4
  k is in the range [1, number of distinct elements in nums]
  The answer is guaranteed to be unique.

Follow-up: your algorithm's complexity must be better than O(n log n).`,
    hint: "Count first, then avoid sorting. A frequency can never exceed n, so make buckets[freq] a list of values with that frequency and walk the buckets downward from n. That is O(n) overall.",
    starter: `class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        
    }
}`
  },
  {
    id: "hm4", patternId: "hashmap", stage: "interview", title: "Longest Consecutive Sequence",
    prompt: `Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.

You must write an algorithm that runs in O(n) time.

Example 1:
  Input:  nums = [100,4,200,1,3,2]
  Output: 4
  Explanation: the longest consecutive sequence is [1,2,3,4].

Example 2:
  Input:  nums = [0,3,7,2,5,8,4,6,0,1]
  Output: 9

Constraints:
  0 <= nums.length <= 10^5
  -10^9 <= nums[i] <= 10^9`,
    hint: "Put everything in a HashSet. Only begin counting upward from a value x when x - 1 is NOT in the set, which means x starts its run. That guarantees each sequence is walked exactly once, keeping it O(n) despite the inner loop.",
    starter: `class Solution {
    public int longestConsecutive(int[] nums) {
        
    }
}`
  },

  /* --------------------------- two pointers --------------------------- */
  {
    id: "tp1", patternId: "twopointers", stage: "practice", title: "Valid Palindrome",
    prompt: `A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string s, return true if it is a palindrome, false otherwise.

Example 1:
  Input:  s = "A man, a plan, a canal: Panama"
  Output: true
  Explanation: "amanaplanacanalpanama" is a palindrome.

Example 2:
  Input:  s = "race a car"
  Output: false

Example 3:
  Input:  s = " "
  Output: true
  Explanation: after removing non-alphanumerics, s is empty, which is a palindrome.

Constraints:
  1 <= s.length <= 2 * 10^5
  s consists only of printable ASCII characters.

Solve it in O(1) extra space, without building a cleaned copy of the string.`,
    hint: "One pointer from each end. Advance each past non-alphanumeric characters with inner while loops before comparing, and lowercase both sides at comparison time. Character.isLetterOrDigit does the classification for you.",
    starter: `class Solution {
    public boolean isPalindrome(String s) {
        
    }
}`
  },
  {
    id: "tp2", patternId: "twopointers", stage: "practice", title: "Move Zeroes",
    prompt: `Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements.

You must do this in place, without making a copy of the array.

Example 1:
  Input:  nums = [0,1,0,3,12]
  Output: [1,3,12,0,0]

Example 2:
  Input:  nums = [0]
  Output: [0]

Constraints:
  1 <= nums.length <= 10^4
  -2^31 <= nums[i] <= 2^31 - 1`,
    hint: "This is the reader/writer variant. Let fast read every element and slow mark where the next non-zero belongs. After the first pass, fill from slow to the end with zeroes.",
    starter: `class Solution {
    public void moveZeroes(int[] nums) {
        
    }
}`
  },
  {
    id: "tp3", patternId: "twopointers", stage: "interview", title: "Container With Most Water",
    prompt: `You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the i-th line are (i, 0) and (i, height[i]).

Find two lines that, together with the x-axis, form a container holding the most water. Return the maximum amount of water a container can store.

Note that you may not slant the container.

Example 1:
  Input:  height = [1,8,6,2,5,4,8,3,7]
  Output: 49
  Explanation: the lines at index 1 (height 8) and index 8 (height 7) hold
               min(8,7) * (8-1) = 7 * 7 = 49.

Example 2:
  Input:  height = [1,1]
  Output: 1

Constraints:
  n == height.length
  2 <= n <= 10^5
  0 <= height[i] <= 10^4`,
    hint: "Start at both ends and always move the SHORTER line inward. Moving the taller one keeps the same bottleneck height but reduces width, so it can never increase the area. Be ready to state that argument out loud.",
    starter: `class Solution {
    public int maxArea(int[] height) {
        
    }
}`
  },
  {
    id: "tp4", patternId: "twopointers", stage: "interview", title: "3Sum",
    prompt: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, j != k, and nums[i] + nums[j] + nums[k] == 0.

The solution set must not contain duplicate triplets.

Example 1:
  Input:  nums = [-1,0,1,2,-1,-4]
  Output: [[-1,-1,2],[-1,0,1]]

Example 2:
  Input:  nums = [0,1,1]
  Output: []

Example 3:
  Input:  nums = [0,0,0]
  Output: [[0,0,0]]

Constraints:
  3 <= nums.length <= 3000
  -10^5 <= nums[i] <= 10^5`,
    hint: "Sort, fix index i, then run a converging two-pointer scan over the remainder looking for -nums[i]. The entire difficulty is deduplication: skip i when it repeats the previous value, and skip lo and hi after recording a hit.",
    starter: `class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        
    }
}`
  },

  /* -------------------------- sliding window -------------------------- */
  {
    id: "sw1", patternId: "slidingwindow", stage: "practice", title: "Longest Substring Without Repeating Characters",
    prompt: `Given a string s, find the length of the longest substring without repeating characters.

Example 1:
  Input:  s = "abcabcbb"
  Output: 3
  Explanation: the answer is "abc", with length 3.

Example 2:
  Input:  s = "bbbbb"
  Output: 1
  Explanation: the answer is "b".

Example 3:
  Input:  s = "pwwkew"
  Output: 3
  Explanation: the answer is "wke". Note that "pwke" is a subsequence, not a substring.

Constraints:
  0 <= s.length <= 5 * 10^4
  s consists of English letters, digits, symbols and spaces.`,
    hint: "Maximizing window: expand right, then shrink from the left WHILE the newly added character appears more than once. Record the length after the shrink loop. The shrink must be a while, since one removal may not be enough.",
    starter: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        
    }
}`
  },
  {
    id: "sw2", patternId: "slidingwindow", stage: "practice", title: "Minimum Size Subarray Sum",
    prompt: `Given an array of positive integers nums and a positive integer target, return the minimal length of a subarray whose sum is greater than or equal to target. If there is no such subarray, return 0 instead.

Example 1:
  Input:  target = 7, nums = [2,3,1,2,4,3]
  Output: 2
  Explanation: the subarray [4,3] has the minimal length under the problem constraint.

Example 2:
  Input:  target = 4, nums = [1,4,4]
  Output: 1

Example 3:
  Input:  target = 11, nums = [1,1,1,1,1,1,1,1]
  Output: 0

Constraints:
  1 <= target <= 10^9
  1 <= nums.length <= 10^5
  1 <= nums[i] <= 10^4`,
    hint: "This is a MINIMIZING window, the mirror image of the usual template. Shrink while the window is still VALID (sum >= target), recording the length inside that loop before each shrink. Remember to map \"never found\" back to 0.",
    starter: `class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        
    }
}`
  },
  {
    id: "sw3", patternId: "slidingwindow", stage: "interview", title: "Longest Repeating Character Replacement",
    prompt: `You are given a string s and an integer k. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most k times.

Return the length of the longest substring containing the same letter you can get after performing the above operations.

Example 1:
  Input:  s = "ABAB", k = 2
  Output: 4
  Explanation: replace the two 'A's with two 'B's, or vice versa.

Example 2:
  Input:  s = "AABABBA", k = 1
  Output: 4
  Explanation: replace the one 'A' in the middle with 'B' to form "AABBBBA",
               whose longest repeating substring is "BBBB".

Constraints:
  1 <= s.length <= 10^5
  s consists of only uppercase English letters.
  0 <= k <= s.length`,
    hint: "The window is valid when windowLength minus the count of the most frequent character is at most k, since that difference is how many replacements you would need. Track counts in an int[26] and keep a running max count.",
    starter: `class Solution {
    public int characterReplacement(String s, int k) {
        
    }
}`
  },
  {
    id: "sw4", patternId: "slidingwindow", stage: "interview", title: "Minimum Window Substring",
    prompt: `Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string "".

The test cases are generated such that the answer is unique.

Example 1:
  Input:  s = "ADOBECODEBANC", t = "ABC"
  Output: "BANC"
  Explanation: the minimum window "BANC" includes 'A', 'B', and 'C' from t.

Example 2:
  Input:  s = "a", t = "a"
  Output: "a"

Example 3:
  Input:  s = "a", t = "aa"
  Output: ""
  Explanation: both 'a's from t must be included in the window, but s has only one.

Constraints:
  m == s.length, n == t.length
  1 <= m, n <= 10^5
  s and t consist of uppercase and lowercase English letters.`,
    hint: "The hardest window problem. Keep a required-count map from t and a window map, plus a 'formed' counter of how many DISTINCT required characters currently hit their exact required count. Validity is then formed == required.size(), an O(1) check. Shrink while valid, recording the best start and length.",
    starter: `class Solution {
    public String minWindow(String s, String t) {
        
    }
}`
  },

  /* ------------------------------- grid ------------------------------- */
  {
    id: "g1", patternId: "grid", stage: "practice", title: "Number of Islands",
    prompt: `Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are surrounded by water.

Example 1:
  Input:  grid = [
    ["1","1","1","1","0"],
    ["1","1","0","1","0"],
    ["1","1","0","0","0"],
    ["0","0","0","0","0"]
  ]
  Output: 1

Example 2:
  Input:  grid = [
    ["1","1","0","0","0"],
    ["1","1","0","0","0"],
    ["0","0","1","0","0"],
    ["0","0","0","1","1"]
  ]
  Output: 3

Constraints:
  m == grid.length, n == grid[i].length
  1 <= m, n <= 300
  grid[i][j] is '0' or '1'.`,
    hint: "Scan every cell. When you find unvisited land, increment the counter and run a DFS that sinks the whole connected region to '0'. Mutating the grid acts as your visited set, so no extra boolean[][] is needed.",
    starter: `class Solution {
    public int numIslands(char[][] grid) {
        
    }
}`
  },
  {
    id: "g2", patternId: "grid", stage: "practice", title: "Max Area of Island",
    prompt: `You are given an m x n binary matrix grid. An island is a group of 1's (representing land) connected 4-directionally. You may assume all four edges of the grid are surrounded by water.

The area of an island is the number of cells with the value 1 in the island.

Return the maximum area of an island in grid. If there is no island, return 0.

Example 1:
  Input:  grid = [
    [0,0,1,0,0,0,0,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,1,1,1,0,0,0],
    [0,1,1,0,1,0,0,0,0,0,0,0,0],
    [0,1,0,0,1,1,0,0,1,0,1,0,0],
    [0,1,0,0,1,1,0,0,1,1,1,0,0],
    [0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,1,1,0,0,0,0]
  ]
  Output: 6

Example 2:
  Input:  grid = [[0,0,0,0,0,0,0,0]]
  Output: 0

Constraints:
  m == grid.length, n == grid[i].length
  1 <= m, n <= 50
  grid[i][j] is either 0 or 1.`,
    hint: "Same traversal as Number of Islands, but make dfs RETURN the area it consumed: 1 plus the sum of the four recursive calls. Out-of-bounds or water returns 0, so the recursion sums itself with no extra counter.",
    starter: `class Solution {
    public int maxAreaOfIsland(int[][] grid) {
        
    }
}`
  },
  {
    id: "g3", patternId: "grid", stage: "interview", title: "Rotting Oranges",
    prompt: `You are given an m x n grid where each cell can have one of three values:
  0 representing an empty cell,
  1 representing a fresh orange,
  2 representing a rotten orange.

Every minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten.

Return the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return -1.

Example 1:
  Input:  grid = [[2,1,1],[1,1,0],[0,1,1]]
  Output: 4

Example 2:
  Input:  grid = [[2,1,1],[0,1,1],[1,0,1]]
  Output: -1
  Explanation: the orange in the bottom left corner is never reached,
               because rotting only spreads 4-directionally.

Example 3:
  Input:  grid = [[0,2]]
  Output: 0
  Explanation: there are no fresh oranges at minute 0, so the answer is 0.

Constraints:
  m == grid.length, n == grid[i].length
  1 <= m, n <= 10
  grid[i][j] is 0, 1, or 2.`,
    hint: "Multi-source BFS. Seed the queue with EVERY rotten orange before starting, and count fresh oranges up front. Process level by level with the frozen-size loop, decrementing the fresh count as you rot. At the end, return -1 if any fresh remain.",
    starter: `class Solution {
    public int orangesRotting(int[][] grid) {
        
    }
}`
  },
  {
    id: "g4", patternId: "grid", stage: "interview", title: "Shortest Path in Binary Matrix",
    prompt: `Given an n x n binary matrix grid, return the length of the shortest clear path in the matrix. If there is no clear path, return -1.

A clear path is a path from the top-left cell (0, 0) to the bottom-right cell (n-1, n-1) such that:
  - All visited cells are 0.
  - All adjacent cells in the path are connected 8-directionally (they share an edge OR a corner).

The length of a clear path is the number of visited cells in the path.

Example 1:
  Input:  grid = [[0,1],[1,0]]
  Output: 2

Example 2:
  Input:  grid = [[0,0,0],[1,1,0],[1,1,0]]
  Output: 4

Example 3:
  Input:  grid = [[1,0,0],[1,1,0],[1,1,0]]
  Output: -1
  Explanation: the start cell itself is blocked.

Constraints:
  n == grid.length == grid[i].length
  1 <= n <= 100
  grid[i][j] is 0 or 1.`,
    hint: "BFS with an EIGHT-direction move set, not four. Two traps: check up front whether the start or end cell is blocked, and remember the path length counts cells visited, so a one-cell path has length 1.",
    starter: `class Solution {
    public int shortestPathBinaryMatrix(int[][] grid) {
        
    }
}`
  },

  /* --------------------------- binary search --------------------------- */
  {
    id: "bs1", patternId: "binarysearch", stage: "practice", title: "Binary Search",
    prompt: `Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, return its index. Otherwise, return -1.

You must write an algorithm with O(log n) runtime complexity.

Example 1:
  Input:  nums = [-1,0,3,5,9,12], target = 9
  Output: 4

Example 2:
  Input:  nums = [-1,0,3,5,9,12], target = 2
  Output: -1

Constraints:
  1 <= nums.length <= 10^4
  -10^4 < nums[i], target < 10^4
  All integers in nums are unique and sorted in ascending order.`,
    hint: "Get the invariant exactly right here, because every harder variant builds on it. Use while (lo <= hi) with hi = nums.length - 1, and always compute mid as lo + (hi - lo) / 2 rather than (lo + hi) / 2.",
    starter: `class Solution {
    public int search(int[] nums, int target) {
        
    }
}`
  },
  {
    id: "bs2", patternId: "binarysearch", stage: "practice", title: "Find Minimum in Rotated Sorted Array",
    prompt: `Suppose an array of length n sorted in ascending order is rotated between 1 and n times. For example, [0,1,2,4,5,6,7] might become [4,5,6,7,0,1,2].

Given the sorted rotated array nums of unique elements, return the minimum element of this array.

You must write an algorithm that runs in O(log n) time.

Example 1:
  Input:  nums = [3,4,5,1,2]
  Output: 1

Example 2:
  Input:  nums = [4,5,6,7,0,1,2]
  Output: 0

Example 3:
  Input:  nums = [11,13,15,17]
  Output: 11
  Explanation: the array was rotated 4 times, so it looks unrotated.

Constraints:
  n == nums.length
  1 <= n <= 5000
  -5000 <= nums[i] <= 5000
  All integers of nums are unique, and nums is sorted and rotated.`,
    hint: "Use the lo < hi form and compare nums[mid] against nums[hi], not nums[lo]. If nums[mid] > nums[hi] the minimum is strictly right, so lo = mid + 1; otherwise hi = mid. Comparing against nums[lo] leaves an ambiguous case.",
    starter: `class Solution {
    public int findMin(int[] nums) {
        
    }
}`
  },
  {
    id: "bs3", patternId: "binarysearch", stage: "interview", title: "Koko Eating Bananas",
    prompt: `Koko loves to eat bananas. There are n piles of bananas, the i-th pile has piles[i] bananas. The guards have gone and will come back in h hours.

Koko decides her bananas-per-hour eating speed k. Each hour, she chooses some pile and eats k bananas from it. If the pile has fewer than k bananas, she eats all of them and will not eat any more bananas during that hour.

Return the minimum integer k such that she can eat all the bananas within h hours.

Example 1:
  Input:  piles = [3,6,7,11], h = 8
  Output: 4

Example 2:
  Input:  piles = [30,11,23,4,20], h = 5
  Output: 30

Example 3:
  Input:  piles = [30,11,23,4,20], h = 6
  Output: 23

Constraints:
  1 <= piles.length <= 10^4
  piles.length <= h <= 10^9
  1 <= piles[i] <= 10^9`,
    hint: "The canonical search-on-answer problem. Binary search k over [1, max(piles)] with feasible(k) = total hours <= h. Hours for one pile is the CEILING (p + k - 1) / k, and the accumulator must be a long.",
    starter: `class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        
    }
}`
  },
  {
    id: "bs4", patternId: "binarysearch", stage: "interview", title: "Capacity To Ship Packages Within D Days",
    prompt: `A conveyor belt has packages that must be shipped from one port to another within days days.

The i-th package on the belt has a weight of weights[i]. Each day, we load the ship with packages on the belt in the order given by weights. We may not load more weight than the maximum weight capacity of the ship.

Return the least weight capacity of the ship that will result in all the packages being shipped within days days.

Example 1:
  Input:  weights = [1,2,3,4,5,6,7,8,9,10], days = 5
  Output: 15
  Explanation: a ship capacity of 15 gives the shipments:
    day 1: 1,2,3,4,5
    day 2: 6,7
    day 3: 8
    day 4: 9
    day 5: 10
  Note that splitting packages into (2,3,4,5), (1,6,7) is not allowed,
  because the packages must be shipped in the given order.

Example 2:
  Input:  weights = [3,2,2,4,1,4], days = 3
  Output: 6

Example 3:
  Input:  weights = [1,2,3,1,1], days = 4
  Output: 3

Constraints:
  1 <= days <= weights.length <= 5 * 10^4
  1 <= weights[i] <= 500`,
    hint: "Same shape as Koko, but the bounds matter. lo = max(weights), because no capacity below the heaviest single package can ever ship it. hi = sum(weights). feasible(cap) greedily fills days in order and checks daysUsed <= days.",
    starter: `class Solution {
    public int shipWithinDays(int[] weights, int days) {
        
    }
}`
  },

  /* ------------------------------- stack ------------------------------- */
  {
    id: "st1", patternId: "stack", stage: "practice", title: "Valid Parentheses",
    prompt: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
  1. Open brackets are closed by the same type of brackets.
  2. Open brackets are closed in the correct order.
  3. Every close bracket has a corresponding open bracket of the same type.

Example 1:
  Input:  s = "()"
  Output: true

Example 2:
  Input:  s = "()[]{}"
  Output: true

Example 3:
  Input:  s = "(]"
  Output: false

Example 4:
  Input:  s = "([)]"
  Output: false

Example 5:
  Input:  s = "{[]}"
  Output: true

Constraints:
  1 <= s.length <= 10^4
  s consists of parentheses only: ()[]{}`,
    hint: "Push openers, and on each closer pop and verify the type matches. The two classic misses are popping from an empty stack (a closer with no opener) and returning true at the end while openers are still on the stack.",
    starter: `class Solution {
    public boolean isValid(String s) {
        
    }
}`
  },
  {
    id: "st2", patternId: "stack", stage: "practice", title: "Min Stack",
    prompt: `Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.

Implement the MinStack class:
  MinStack()      initializes the stack object.
  void push(int val)  pushes val onto the stack.
  void pop()      removes the element on the top of the stack.
  int top()       gets the top element of the stack.
  int getMin()    retrieves the minimum element in the stack.

You must implement a solution with O(1) time complexity for each function.

Example:
  Input:
    ["MinStack","push","push","push","getMin","pop","top","getMin"]
    [[],[-2],[0],[-3],[],[],[],[]]
  Output:
    [null,null,null,null,-3,null,0,-2]

  Explanation:
    MinStack minStack = new MinStack();
    minStack.push(-2);
    minStack.push(0);
    minStack.push(-3);
    minStack.getMin();  // return -3
    minStack.pop();
    minStack.top();     // return 0
    minStack.getMin();  // return -2

Constraints:
  -2^31 <= val <= 2^31 - 1
  Methods pop, top and getMin will always be called on non-empty stacks.
  At most 3 * 10^4 calls will be made to push, pop, top, and getMin.`,
    hint: "Each entry must remember the minimum of everything at or below it. Keep a second stack of running minima, pushing Math.min(val, currentMin) on every push and popping both together. Pushing on every operation also handles duplicate minima correctly.",
    starter: `class MinStack {

    public MinStack() {
        
    }
    
    public void push(int val) {
        
    }
    
    public void pop() {
        
    }
    
    public int top() {
        
    }
    
    public int getMin() {
        
    }
}`
  },
  {
    id: "st3", patternId: "stack", stage: "interview", title: "Daily Temperatures",
    prompt: `Given an array of integers temperatures representing the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the i-th day to get a warmer temperature. If there is no future day for which this is possible, keep answer[i] == 0 instead.

Example 1:
  Input:  temperatures = [73,74,75,71,69,72,76,73]
  Output: [1,1,4,2,1,1,0,0]

Example 2:
  Input:  temperatures = [30,40,50,60]
  Output: [1,1,1,0]

Example 3:
  Input:  temperatures = [30,60,90]
  Output: [1,1,0]

Constraints:
  1 <= temperatures.length <= 10^5
  30 <= temperatures[i] <= 100`,
    hint: "Monotonic stack holding INDICES whose answers are still pending, with decreasing temperatures. When today beats the top, pop and set res[j] = i - j. Be ready to argue it is O(n): each index is pushed once and popped at most once.",
    starter: `class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        
    }
}`
  },
  {
    id: "st4", patternId: "stack", stage: "interview", title: "Evaluate Reverse Polish Notation",
    prompt: `You are given an array of strings tokens that represents an arithmetic expression in Reverse Polish Notation. Evaluate the expression and return an integer representing its value.

Note:
  - The valid operators are '+', '-', '*', and '/'.
  - Each operand may be an integer or another expression.
  - The division between two integers always truncates toward zero.
  - There will not be any division by zero.
  - The input represents a valid arithmetic expression in RPN.
  - The answer and all intermediate calculations fit in a 32-bit integer.

Example 1:
  Input:  tokens = ["2","1","+","3","*"]
  Output: 9
  Explanation: ((2 + 1) * 3) = 9

Example 2:
  Input:  tokens = ["4","13","5","/","+"]
  Output: 6
  Explanation: (4 + (13 / 5)) = 6

Example 3:
  Input:  tokens = ["10","6","9","3","+","-11","*","/","*","17","+","5","+"]
  Output: 22

Constraints:
  1 <= tokens.length <= 10^4
  tokens[i] is either an operator, or an integer in the range [-200, 200].`,
    hint: "Push numbers, and on an operator pop two. Order matters: the FIRST value popped is the RIGHT operand, so subtraction is secondPop - firstPop. Also note a token like \"-11\" is a negative number, not the minus operator, so do not classify by first character alone.",
    starter: `class Solution {
    public int evalRPN(String[] tokens) {
        
    }
}`
  },

  /* -------------------------------- dp -------------------------------- */
  {
    id: "dp1", patternId: "dp", stage: "practice", title: "Climbing Stairs",
    prompt: `You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

Example 1:
  Input:  n = 2
  Output: 2
  Explanation: there are two ways: (1 step + 1 step) and (2 steps).

Example 2:
  Input:  n = 3
  Output: 3
  Explanation: (1+1+1), (1+2), (2+1)

Constraints:
  1 <= n <= 45`,
    hint: "The last move was either a 1-step or a 2-step, so dp[i] = dp[i-1] + dp[i-2], which is Fibonacci. Write the table version first, then rewrite it with two rolling variables so the O(1)-space form becomes reflex.",
    starter: `class Solution {
    public int climbStairs(int n) {
        
    }
}`
  },
  {
    id: "dp2", patternId: "dp", stage: "practice", title: "Maximum Subarray",
    prompt: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.

Example 1:
  Input:  nums = [-2,1,-3,4,-1,2,1,-5,4]
  Output: 6
  Explanation: the subarray [4,-1,2,1] has the largest sum, 6.

Example 2:
  Input:  nums = [1]
  Output: 1

Example 3:
  Input:  nums = [5,4,-1,7,8]
  Output: 23

Constraints:
  1 <= nums.length <= 10^5
  -10^4 <= nums[i] <= 10^4`,
    hint: "Kadane's algorithm: at each element, either extend the running subarray or start fresh from this element, so cur = max(nums[i], cur + nums[i]). Initialize both cur and best to nums[0], never 0, or all-negative input returns the wrong answer.",
    starter: `class Solution {
    public int maxSubArray(int[] nums) {
        
    }
}`
  },
  {
    id: "dp3", patternId: "dp", stage: "interview", title: "House Robber",
    prompt: `You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. The only constraint stopping you is that adjacent houses have security systems connected, and it will automatically contact the police if two adjacent houses were broken into on the same night.

Given an integer array nums representing the amount of money in each house, return the maximum amount of money you can rob tonight without alerting the police.

Example 1:
  Input:  nums = [1,2,3,1]
  Output: 4
  Explanation: rob house 0 (money = 1) and house 2 (money = 3). Total = 4.

Example 2:
  Input:  nums = [2,7,9,3,1]
  Output: 12
  Explanation: rob house 0 (2), house 2 (9), and house 4 (1). Total = 12.

Constraints:
  1 <= nums.length <= 100
  0 <= nums[i] <= 400`,
    hint: "At each house you either skip it and keep dp[i-1], or take it and add dp[i-2]. State the meaning of dp[i] in a comment before writing the recurrence, since the offset between dp indices and array indices is where the bugs live.",
    starter: `class Solution {
    public int rob(int[] nums) {
        
    }
}`
  },
  {
    id: "dp4", patternId: "dp", stage: "interview", title: "Coin Change",
    prompt: `You are given an integer array coins representing coins of different denominations, and an integer amount representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.

You may assume that you have an infinite number of each kind of coin.

Example 1:
  Input:  coins = [1,2,5], amount = 11
  Output: 3
  Explanation: 11 = 5 + 5 + 1

Example 2:
  Input:  coins = [2], amount = 3
  Output: -1

Example 3:
  Input:  coins = [1], amount = 0
  Output: 0

Constraints:
  1 <= coins.length <= 12
  1 <= coins[i] <= 2^31 - 1
  0 <= amount <= 10^4`,
    hint: "Unbounded knapsack: dp[x] = 1 + min over coins of dp[x - coin]. Fill dp with the sentinel amount + 1 rather than Integer.MAX_VALUE, since adding 1 to MAX_VALUE overflows negative and silently wins the min. dp[0] = 0, and map any leftover sentinel to -1.",
    starter: `class Solution {
    public int coinChange(int[] coins, int amount) {
        
    }
}`
  },

  /* --------------------------- heap / k-way --------------------------- */
  {
    id: "hp1", patternId: "heap", stage: "practice", title: "Merge Two Sorted Lists",
    prompt: `You are given the heads of two sorted linked lists list1 and list2.

Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.

Example 1:
  Input:  list1 = [1,2,4], list2 = [1,3,4]
  Output: [1,1,2,3,4,4]

Example 2:
  Input:  list1 = [], list2 = []
  Output: []

Example 3:
  Input:  list1 = [], list2 = [0]
  Output: [0]

Constraints:
  The number of nodes in both lists is in the range [0, 50].
  -100 <= Node.val <= 100
  Both list1 and list2 are sorted in non-decreasing order.

This is the merge helper that Merge k Sorted Lists is built out of, so get it clean and reflexive.`,
    hint: "Use a dummy head node so you never special-case the first append. Walk both lists, attaching the smaller node and advancing that pointer. When one list runs out, attach the remainder of the other wholesale rather than looping.",
    starter: `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        
    }
}`
  },
  {
    id: "hp2", patternId: "heap", stage: "practice", title: "Kth Largest Element in an Array",
    prompt: `Given an integer array nums and an integer k, return the kth largest element in the array.

Note that it is the kth largest element in sorted order, not the kth distinct element.

Example 1:
  Input:  nums = [3,2,1,5,6,4], k = 2
  Output: 5

Example 2:
  Input:  nums = [3,2,3,1,2,4,5,5,6], k = 4
  Output: 4

Constraints:
  1 <= k <= nums.length <= 10^5
  -10^4 <= nums[i] <= 10^4

Can you solve it without sorting the entire array?`,
    hint: "Keep a MIN-heap of size k. Offer every element, and poll whenever the size exceeds k, so the heap always holds the k largest seen so far. The answer is then peek(). O(n log k) time, O(k) space.",
    starter: `class Solution {
    public int findKthLargest(int[] nums, int k) {
        
    }
}`
  },
  {
    id: "hp3", patternId: "heap", stage: "interview", title: "Merge k Sorted Lists",
    prompt: `You are given an array of k linked lists, each linked list is sorted in ascending order.

Merge all the linked lists into one sorted linked list and return it.

Example 1:
  Input:  lists = [[1,4,5],[1,3,4],[2,6]]
  Output: [1,1,2,3,4,4,5,6]
  Explanation: the linked lists are
    [
      1->4->5,
      1->3->4,
      2->6
    ]
  merging them into one sorted list gives 1->1->2->3->4->4->5->6.

Example 2:
  Input:  lists = []
  Output: []

Example 3:
  Input:  lists = [[]]
  Output: []

Constraints:
  k == lists.length
  0 <= k <= 10^4
  0 <= lists[i].length <= 500
  -10^4 <= lists[i][j] <= 10^4
  lists[i] is sorted in ascending order.
  The sum of lists[i].length will not exceed 10^4.

Solve it BOTH ways: once with a heap, once with divide and conquer. Be ready to say why both are O(N log k).`,
    hint: "Heap version: seed a min-heap with every non-null head, then repeatedly poll the smallest, append it, and push its next. Divide-and-conquer version: recursively merge lists[lo..mid] with lists[mid+1..hi] using your two-list merge. Watch the empty-input and all-empty-lists cases.",
    starter: `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        
    }
}`
  },
  {
    id: "hp4", patternId: "heap", stage: "interview", title: "K Closest Points to Origin",
    prompt: `Given an array of points where points[i] = [xi, yi] represents a point on the X-Y plane, and an integer k, return the k closest points to the origin (0, 0).

The distance between two points is the Euclidean distance.

You may return the answer in any order. The answer is guaranteed to be unique (except for the order).

Example 1:
  Input:  points = [[1,3],[-2,2]], k = 1
  Output: [[-2,2]]
  Explanation: the distance from (1,3) to the origin is sqrt(10),
               the distance from (-2,2) is sqrt(8), which is closer.

Example 2:
  Input:  points = [[3,3],[5,-1],[-2,4]], k = 2
  Output: [[3,3],[-2,4]]

Constraints:
  1 <= k <= points.length <= 10^4
  -10^4 <= xi, yi <= 10^4`,
    hint: "You want the k SMALLEST distances, so use a MAX-heap of size k and evict the farthest whenever the size exceeds k. Never call Math.sqrt: comparing x*x + y*y gives the identical ordering and avoids floating point entirely.",
    starter: `class Solution {
    public int[][] kClosest(int[][] points, int k) {
        
    }
}`
  },

  /* ---------------------------- matrix sim ---------------------------- */
  {
    id: "mx1", patternId: "matrix", stage: "practice", title: "Spiral Matrix",
    prompt: `Given an m x n matrix, return all elements of the matrix in spiral order.

Example 1:
  Input:  matrix = [[1,2,3],[4,5,6],[7,8,9]]
  Output: [1,2,3,6,9,8,7,4,5]

Example 2:
  Input:  matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]
  Output: [1,2,3,4,8,12,11,10,9,5,6,7]

Constraints:
  m == matrix.length
  n == matrix[i].length
  1 <= m, n <= 10
  -100 <= matrix[i][j] <= 100`,
    hint: "Four walls: top, bottom, left, right. Walk the top row, then the right column, then the bottom row backwards, then the left column upward, shrinking the relevant wall after each leg. Guard the last two legs with top <= bottom and left <= right so a single leftover row or column is not walked twice.",
    starter: `class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        
    }
}`
  },
  {
    id: "mx2", patternId: "matrix", stage: "practice", title: "Spiral Matrix II",
    prompt: `Given a positive integer n, generate an n x n matrix filled with the elements from 1 to n^2 in spiral order.

Example 1:
  Input:  n = 3
  Output: [[1,2,3],[8,9,4],[7,6,5]]

Example 2:
  Input:  n = 1
  Output: [[1]]

Constraints:
  1 <= n <= 20`,
    hint: "Exactly the same four-wall walk as Spiral Matrix, but writing an incrementing counter instead of reading. Since the matrix is square and you fill precisely n^2 cells, you can also drive the loop with a running counter as the stopping condition.",
    starter: `class Solution {
    public int[][] generateMatrix(int n) {
        
    }
}`
  },
  {
    id: "mx3", patternId: "matrix", stage: "interview", title: "Rotate Image",
    prompt: `You are given an n x n 2D matrix representing an image. Rotate the image by 90 degrees clockwise.

You have to rotate the image in place, which means you have to modify the input 2D matrix directly. DO NOT allocate another 2D matrix and do the rotation.

Example 1:
  Input:  matrix = [[1,2,3],[4,5,6],[7,8,9]]
  Output: [[7,4,1],[8,5,2],[9,6,3]]

Example 2:
  Input:  matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]
  Output: [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]

Constraints:
  n == matrix.length == matrix[i].length
  1 <= n <= 20
  -1000 <= matrix[i][j] <= 1000`,
    hint: "Two clean passes beat any direct index formula. First transpose the matrix by swapping across the main diagonal, iterating j from i+1 so you do not swap each pair twice. Then reverse each row. For counter-clockwise, transpose and reverse each COLUMN instead.",
    starter: `class Solution {
    public void rotate(int[][] matrix) {
        
    }
}`
  },
  {
    id: "mx4", patternId: "matrix", stage: "interview", title: "Sort Matrix By Rings",
    prompt: `[Reconstructed from a description, not a canonical LeetCode problem. If you have the exact original wording, paste it into the TikTok OA Bank tab and work from that instead.]

A ring (or layer) of a matrix is the set of cells forming one concentric border. Ring 0 is the outermost border, ring 1 is the border just inside it, and so on.

Given an m x n matrix of integers, sort the values within each ring independently in ascending order. The sorted values must be written back into that ring in clockwise order, starting from the ring's top-left cell. Rings do not exchange values with each other.

Return the resulting matrix.

Example 1:
  Input:  matrix = [
    [9, 8, 7],
    [6, 5, 4],
    [3, 2, 1]
  ]
  Output: [
    [1, 2, 3],
    [9, 5, 4],
    [8, 7, 6]
  ]
  Explanation: ring 0 read clockwise from the top-left is
    [9,8,7,4,1,2,3,6], which sorted is [1,2,3,4,6,7,8,9].
    Writing that back clockwise from the top-left gives the border shown.
    Ring 1 is the single cell 5, which is already sorted.

Example 2:
  Input:  matrix = [[4,3],[2,1]]
  Output: [[1,2],[4,3]]
  Explanation: the only ring read clockwise is [4,3,1,2], sorted [1,2,3,4],
               written back clockwise from the top-left.

Constraints:
  1 <= m, n <= 100
  -10^9 <= matrix[i][j] <= 10^9

Note: the exact tie-breaking and starting corner can vary between versions of this problem. Confirm against the real statement if you have it.`,
    hint: "Write two helpers, readRingClockwise(r) and writeRingClockwise(r, values), and make them walk in EXACTLY the same order from the same starting cell. Ring r spans rows r..m-1-r and cols r..n-1-r, and there are ceil(min(m,n)/2) rings. Reuse the four-wall guards so a ring that is a single row, single column, or single cell is not written twice.",
    starter: `class Solution {
    public int[][] sortMatrixByRings(int[][] matrix) {
        
    }
}`
  },

  /* ------------------------ greedy construction ------------------------ */
  {
    id: "gr1", patternId: "greedy", stage: "practice", title: "Consecutive Word Pairs",
    prompt: `[Reconstructed from a description, not a canonical LeetCode problem. If you have the exact original wording, paste it into the TikTok OA Bank tab and work from that instead.]

You are given an array of lowercase words.

Count the number of adjacent pairs (words[i], words[i + 1]) such that the LAST character of words[i] equals the FIRST character of words[i + 1].

Example 1:
  Input:  words = ["cat","tiger","rat","tap"]
  Output: 3
  Explanation:
    "cat" ends with 't', "tiger" starts with 't'  -> counts
    "tiger" ends with 'r', "rat" starts with 'r'  -> counts
    "rat" ends with 't', "tap" starts with 't'    -> counts

Example 2:
  Input:  words = ["dog","cat","mouse"]
  Output: 0

Example 3:
  Input:  words = ["a"]
  Output: 0
  Explanation: a single word forms no adjacent pair.

Constraints:
  1 <= words.length <= 10^5
  1 <= words[i].length <= 100
  words[i] consists of lowercase English letters.

A warm-up. The value here is finishing it correctly in under three minutes, since the real OA cost of an easy question is the time you leak on it.`,
    hint: "One pass from i = 0 to words.length - 2. Compare words[i].charAt(words[i].length() - 1) with words[i+1].charAt(0). The only real trap is the single-word input, where the loop must not execute at all. O(n) time, O(1) space.",
    starter: `class Solution {
    public int countConsecutivePairs(String[] words) {
        
    }
}`
  },
  {
    id: "gr2", patternId: "greedy", stage: "practice", title: "Sort Characters By Frequency",
    prompt: `Given a string s, sort it in decreasing order based on the frequency of the characters. The frequency of a character is the number of times it appears in the string.

Return the sorted string. If there are multiple answers, return any of them.

Example 1:
  Input:  s = "tree"
  Output: "eert"
  Explanation: 'e' appears twice while 'r' and 't' both appear once.
               So 'e' must appear before both 'r' and 't'.
               "eetr" is also a valid answer.

Example 2:
  Input:  s = "cccaaa"
  Output: "aaaccc"
  Explanation: both 'a' and 'c' appear three times, so "cccaaa" is also valid.
               Note that "cacaca" is incorrect, as the same characters must be together.

Example 3:
  Input:  s = "Aabb"
  Output: "bbAa"
  Explanation: "bbaA" is also valid, but note that 'A' and 'a' are treated as two different characters.

Constraints:
  1 <= s.length <= 5 * 10^5
  s consists of uppercase and lowercase English letters and digits.`,
    hint: "Count into a map, then order the distinct characters by count descending and append each one count times. A max-heap works, but bucket sort by frequency is O(n) since no count can exceed s.length(). Remember the alphabet here is not just lowercase letters.",
    starter: `class Solution {
    public String frequencySort(String s) {
        
    }
}`
  },
  {
    id: "gr3", patternId: "greedy", stage: "interview", title: "Reorganize String",
    prompt: `Given a string s, rearrange the characters of s so that any two adjacent characters are not the same.

Return any possible rearrangement of s, or return "" if not possible.

Example 1:
  Input:  s = "aab"
  Output: "aba"

Example 2:
  Input:  s = "aaab"
  Output: ""
  Explanation: 'a' appears three times out of four characters, so at least two
               'a's must end up adjacent no matter how you arrange them.

Constraints:
  1 <= s.length <= 500
  s consists of lowercase English letters.`,
    hint: "Check feasibility first: if the largest count exceeds (n + 1) / 2, return \"\" immediately. Then use a max-heap on remaining count, holding the character you just placed aside and pushing it back only AFTER placing the next one. The no-heap alternative fills even indices in descending-count order, then wraps to the odd indices.",
    starter: `class Solution {
    public String reorganizeString(String s) {
        
    }
}`
  },
  {
    id: "gr4", patternId: "greedy", stage: "interview", title: "WDL Results String",
    prompt: `[Reconstructed from a description, not a canonical LeetCode problem. If you have the exact original wording, paste it into the TikTok OA Bank tab and work from that instead. The "round-robin from counters" shape below is the version commonly reported.]

A team's season is recorded as a string of results, where each character is one of:
  'W' for a win, 'D' for a draw, 'L' for a loss.

You are given three integers w, d, and l: the number of wins, draws, and losses the team recorded over the season. The season has n = w + d + l matches.

Build any results string of length n that uses exactly w 'W' characters, d 'D' characters, and l 'L' characters, such that no two adjacent characters are the same.

Return any valid string, or "" if no such arrangement exists.

Example 1:
  Input:  w = 3, d = 2, l = 1
  Output: "WDWDWL"
  Explanation: three W, two D, one L, and no two neighbours match.
               "WDWLWD" is also valid.

Example 2:
  Input:  w = 4, d = 1, l = 1
  Output: ""
  Explanation: n = 6, so the largest count may be at most (6 + 1) / 2 = 3,
               but w is 4. Two W's must end up adjacent.

Example 3:
  Input:  w = 1, d = 0, l = 0
  Output: "W"

Constraints:
  0 <= w, d, l <= 10^5
  1 <= w + d + l

Note: some versions of this problem add scoring rules (a win is 3 points, a draw is 1) or fix certain positions in advance. Confirm against the real statement if you have it.`,
    hint: "Identical machinery to Reorganize String with an alphabet of only three symbols. Reject up front when max(w, d, l) > (n + 1) / 2. Then run the max-heap loop over the three counters, holding the just-placed symbol for exactly one turn. With only three symbols you could also hand-roll it, but the heap version is harder to get wrong under time pressure.",
    starter: `class Solution {
    public String buildResults(int w, int d, int l) {
        
    }
}`
  }
];

/* Real LeetCode numbers and difficulties, so the UI can show them the way LeetCode does.
   Entries without an "lc" are reconstructed or CodeSignal-style problems. */
const QUESTION_META = {
  hm1: { lc: 1,    difficulty: "Easy" },
  hm2: { lc: 49,   difficulty: "Medium" },
  hm3: { lc: 347,  difficulty: "Medium" },
  hm4: { lc: 128,  difficulty: "Medium" },

  tp1: { lc: 125,  difficulty: "Easy" },
  tp2: { lc: 283,  difficulty: "Easy" },
  tp3: { lc: 11,   difficulty: "Medium" },
  tp4: { lc: 15,   difficulty: "Medium" },

  sw1: { lc: 3,    difficulty: "Medium" },
  sw2: { lc: 209,  difficulty: "Medium" },
  sw3: { lc: 424,  difficulty: "Medium" },
  sw4: { lc: 76,   difficulty: "Hard" },

  g1:  { lc: 200,  difficulty: "Medium" },
  g2:  { lc: 695,  difficulty: "Medium" },
  g3:  { lc: 994,  difficulty: "Medium" },
  g4:  { lc: 1091, difficulty: "Medium" },

  bs1: { lc: 704,  difficulty: "Easy" },
  bs2: { lc: 153,  difficulty: "Medium" },
  bs3: { lc: 875,  difficulty: "Medium" },
  bs4: { lc: 1011, difficulty: "Medium" },

  st1: { lc: 20,   difficulty: "Easy" },
  st2: { lc: 155,  difficulty: "Medium" },
  st3: { lc: 739,  difficulty: "Medium" },
  st4: { lc: 150,  difficulty: "Medium" },

  dp1: { lc: 70,   difficulty: "Easy" },
  dp2: { lc: 53,   difficulty: "Medium" },
  dp3: { lc: 198,  difficulty: "Medium" },
  dp4: { lc: 322,  difficulty: "Medium" },

  hp1: { lc: 21,   difficulty: "Easy" },
  hp2: { lc: 215,  difficulty: "Medium" },
  hp3: { lc: 23,   difficulty: "Hard" },
  hp4: { lc: 973,  difficulty: "Medium" },

  mx1: { lc: 54,   difficulty: "Medium" },
  mx2: { lc: 59,   difficulty: "Medium" },
  mx3: { lc: 48,   difficulty: "Medium" },
  mx4: { difficulty: "Medium", source: "CodeSignal-style" },

  gr1: { difficulty: "Easy",   source: "CodeSignal-style" },
  gr2: { lc: 451,  difficulty: "Medium" },
  gr3: { lc: 767,  difficulty: "Medium" },
  gr4: { difficulty: "Medium", source: "CodeSignal-style" }
};

PRACTICE_QUESTIONS.forEach((q) => {
  Object.assign(q, QUESTION_META[q.id] || { difficulty: "Medium" });
});
