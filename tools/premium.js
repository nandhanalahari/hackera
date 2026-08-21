/* LeetCode Premium problems return no content over the public API, but several
   are in NeetCode 150 / Blind 75. These are written out by hand in the same
   HTML shape the API returns so they render identically. */

const PREMIUM = {
  "meeting-rooms": {
    content: `<p>Given an array of meeting time intervals where <code>intervals[i] = [start<sub>i</sub>, end<sub>i</sub>]</code>, determine if a person could attend all meetings.</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> intervals = [[0,30],[5,10],[15,20]]
<strong>Output:</strong> false
<strong>Explanation:</strong> The meetings [0,30] and [5,10] overlap.
</pre>
<p><strong class="example">Example 2:</strong></p>
<pre><strong>Input:</strong> intervals = [[7,10],[2,4]]
<strong>Output:</strong> true
</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
<li><code>0 &lt;= intervals.length &lt;= 10<sup>4</sup></code></li>
<li><code>intervals[i].length == 2</code></li>
<li><code>0 &lt;= start<sub>i</sub> &lt; end<sub>i</sub> &lt;= 10<sup>6</sup></code></li>
</ul>`,
    java: `class Solution {\n    public boolean canAttendMeetings(int[][] intervals) {\n        \n    }\n}`
  },

  "meeting-rooms-ii": {
    content: `<p>Given an array of meeting time intervals <code>intervals</code> where <code>intervals[i] = [start<sub>i</sub>, end<sub>i</sub>]</code>, return <em>the minimum number of conference rooms required</em>.</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> intervals = [[0,30],[5,10],[15,20]]
<strong>Output:</strong> 2
<strong>Explanation:</strong> [0,30] overlaps both [5,10] and [15,20], so two rooms are needed.
</pre>
<p><strong class="example">Example 2:</strong></p>
<pre><strong>Input:</strong> intervals = [[7,10],[2,4]]
<strong>Output:</strong> 1
</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
<li><code>1 &lt;= intervals.length &lt;= 10<sup>4</sup></code></li>
<li><code>0 &lt;= start<sub>i</sub> &lt; end<sub>i</sub> &lt;= 10<sup>6</sup></code></li>
</ul>`,
    java: `class Solution {\n    public int minMeetingRooms(int[][] intervals) {\n        \n    }\n}`
  },

  "graph-valid-tree": {
    content: `<p>You have a graph of <code>n</code> nodes labeled from <code>0</code> to <code>n - 1</code>. You are given an integer <code>n</code> and a list of <code>edges</code> where <code>edges[i] = [a<sub>i</sub>, b<sub>i</sub>]</code> indicates that there is an undirected edge between nodes <code>a<sub>i</sub></code> and <code>b<sub>i</sub></code> in the graph.</p>
<p>Return <code>true</code> <em>if the edges of the given graph make up a valid tree, and</em> <code>false</code> <em>otherwise</em>.</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]
<strong>Output:</strong> true
</pre>
<p><strong class="example">Example 2:</strong></p>
<pre><strong>Input:</strong> n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]
<strong>Output:</strong> false
<strong>Explanation:</strong> Nodes 1, 2 and 3 form a cycle.
</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
<li><code>1 &lt;= n &lt;= 2000</code></li>
<li><code>0 &lt;= edges.length &lt;= 5000</code></li>
<li><code>edges[i].length == 2</code></li>
<li><code>0 &lt;= a<sub>i</sub>, b<sub>i</sub> &lt; n</code></li>
<li><code>a<sub>i</sub> != b<sub>i</sub></code></li>
<li>There are no self-loops or repeated edges.</li>
</ul>`,
    java: `class Solution {\n    public boolean validTree(int n, int[][] edges) {\n        \n    }\n}`
  },

  "alien-dictionary": {
    content: `<p>There is a new alien language that uses the English alphabet. However, the order of the letters is unknown to you.</p>
<p>You are given a list of strings <code>words</code> from the alien language's dictionary. Now it is claimed that the strings in <code>words</code> are sorted lexicographically by the rules of this new language.</p>
<p>If this claim is incorrect, and the given arrangement of string in <code>words</code> cannot correspond to any order of letters, return <code>""</code>.</p>
<p>Otherwise, return <em>a string of the unique letters in the new alien language sorted in <strong>lexicographically increasing order</strong> by the new language's rules</em>. If there are multiple solutions, return <em><strong>any of them</strong></em>.</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> words = ["wrt","wrf","er","ett","rftt"]
<strong>Output:</strong> "wertf"
</pre>
<p><strong class="example">Example 2:</strong></p>
<pre><strong>Input:</strong> words = ["z","x"]
<strong>Output:</strong> "zx"
</pre>
<p><strong class="example">Example 3:</strong></p>
<pre><strong>Input:</strong> words = ["z","x","z"]
<strong>Output:</strong> ""
<strong>Explanation:</strong> The order is invalid, so return "".
</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
<li><code>1 &lt;= words.length &lt;= 100</code></li>
<li><code>1 &lt;= words[i].length &lt;= 100</code></li>
<li><code>words[i]</code> consists of only lowercase English letters.</li>
</ul>`,
    java: `class Solution {\n    public String alienOrder(String[] words) {\n        \n    }\n}`
  },

  "encode-and-decode-strings": {
    content: `<p>Design an algorithm to encode <strong>a list of strings</strong> to <strong>a string</strong>. The encoded string is then sent over the network and is decoded back to the original list of strings.</p>
<p>Machine 1 (sender) has the function:</p>
<pre>string encode(vector&lt;string&gt; strs) {
  // ... your code
  return encoded_string;
}
</pre>
<p>Machine 2 (receiver) has the function:</p>
<pre>vector&lt;string&gt; decode(string s) {
  //... your code
  return strs;
}
</pre>
<p>So Machine 1 does: <code>string encoded_string = encode(strs);</code> and Machine 2 does: <code>vector&lt;string&gt; strs2 = decode(encoded_string);</code></p>
<p><code>strs2</code> in Machine 2 should be the same as <code>strs</code> in Machine 1.</p>
<p>Implement the <code>encode</code> and <code>decode</code> methods. You are not allowed to solve the problem using any serialize methods (such as <code>eval</code>).</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> dummy_input = ["Hello","World"]
<strong>Output:</strong> ["Hello","World"]
</pre>
<p><strong class="example">Example 2:</strong></p>
<pre><strong>Input:</strong> dummy_input = [""]
<strong>Output:</strong> [""]
</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
<li><code>1 &lt;= strs.length &lt;= 200</code></li>
<li><code>0 &lt;= strs[i].length &lt;= 200</code></li>
<li><code>strs[i]</code> contains any possible characters out of <code>256</code> valid ASCII characters.</li>
</ul>
<p>&nbsp;</p>
<p><strong>Follow up:</strong> Could you write a generalized algorithm to work on any possible set of characters?</p>`,
    java: `public class Codec {\n\n    // Encodes a list of strings to a single string.\n    public String encode(List<String> strs) {\n        \n    }\n\n    // Decodes a single string to a list of strings.\n    public List<String> decode(String s) {\n        \n    }\n}\n\n// Your Codec object will be instantiated and called as such:\n// Codec codec = new Codec();\n// codec.decode(codec.encode(strs));`
  },

  "walls-and-gates": {
    content: `<p>You are given an <code>m x n</code> grid <code>rooms</code> initialized with these three possible values.</p>
<ul>
<li><code>-1</code> A wall or an obstacle.</li>
<li><code>0</code> A gate.</li>
<li><code>INF</code> Infinity means an empty room. We use the value <code>2<sup>31</sup> - 1 = 2147483647</code> to represent <code>INF</code> as you may assume that the distance to a gate is less than <code>2147483647</code>.</li>
</ul>
<p>Fill each empty room with the distance to <em>its nearest gate</em>. If it is impossible to reach a gate, it should be filled with <code>INF</code>.</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> rooms = [[2147483647,-1,0,2147483647],[2147483647,2147483647,2147483647,-1],[2147483647,-1,2147483647,-1],[0,-1,2147483647,2147483647]]
<strong>Output:</strong> [[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]
</pre>
<p><strong class="example">Example 2:</strong></p>
<pre><strong>Input:</strong> rooms = [[-1]]
<strong>Output:</strong> [[-1]]
</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
<li><code>m == rooms.length</code></li>
<li><code>n == rooms[i].length</code></li>
<li><code>1 &lt;= m, n &lt;= 250</code></li>
<li><code>rooms[i][j]</code> is <code>-1</code>, <code>0</code>, or <code>2<sup>31</sup> - 1</code>.</li>
</ul>`,
    java: `class Solution {\n    public void wallsAndGates(int[][] rooms) {\n        \n    }\n}`
  },

  "number-of-connected-components-in-an-undirected-graph": {
    content: `<p>You have a graph of <code>n</code> nodes. You are given an integer <code>n</code> and an array <code>edges</code> where <code>edges[i] = [a<sub>i</sub>, b<sub>i</sub>]</code> indicates that there is an edge between <code>a<sub>i</sub></code> and <code>b<sub>i</sub></code> in the graph.</p>
<p>Return <em>the number of connected components in the graph</em>.</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> n = 5, edges = [[0,1],[1,2],[3,4]]
<strong>Output:</strong> 2
</pre>
<p><strong class="example">Example 2:</strong></p>
<pre><strong>Input:</strong> n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]
<strong>Output:</strong> 1
</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
<li><code>1 &lt;= n &lt;= 2000</code></li>
<li><code>1 &lt;= edges.length &lt;= 5000</code></li>
<li><code>edges[i].length == 2</code></li>
<li><code>0 &lt;= a<sub>i</sub> &lt;= b<sub>i</sub> &lt; n</code></li>
<li><code>a<sub>i</sub> != b<sub>i</sub></code></li>
<li>There are no repeated edges.</li>
</ul>`,
    java: `class Solution {\n    public int countComponents(int n, int[][] edges) {\n        \n    }\n}`
  },

  "number-of-distinct-islands": {
    content: `<p>You are given an <code>m x n</code> binary matrix <code>grid</code>. An island is a group of <code>1</code>'s (representing land) connected <strong>4-directionally</strong> (horizontal or vertical). You may assume all four edges of the grid are surrounded by water.</p>
<p>An island is considered to be the same as another if and only if one island can be translated (and not rotated or reflected) to equal the other.</p>
<p>Return <em>the number of <strong>distinct</strong> islands</em>.</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> grid = [[1,1,0,0,0],[1,1,0,0,0],[0,0,0,1,1],[0,0,0,1,1]]
<strong>Output:</strong> 1
<strong>Explanation:</strong> Both islands have the same shape, so they count once.
</pre>
<p><strong class="example">Example 2:</strong></p>
<pre><strong>Input:</strong> grid = [[1,1,0,1,1],[1,0,0,0,0],[0,0,0,0,1],[1,1,0,1,1]]
<strong>Output:</strong> 3
</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
<li><code>m == grid.length</code></li>
<li><code>n == grid[i].length</code></li>
<li><code>1 &lt;= m, n &lt;= 50</code></li>
<li><code>grid[i][j]</code> is either <code>0</code> or <code>1</code>.</li>
</ul>`,
    java: `class Solution {\n    public int numDistinctIslands(int[][] grid) {\n        \n    }\n}`
  },

  "basic-calculator-iii": {
    content: `<p>Implement a basic calculator to evaluate a simple expression string.</p>
<p>The expression string contains only non-negative integers, <code>'+'</code>, <code>'-'</code>, <code>'*'</code>, <code>'/'</code> operators, and open <code>'('</code> and closing parentheses <code>')'</code>. The integer division should <strong>truncate toward zero</strong>.</p>
<p>You may assume that the given expression is always valid. All intermediate results will be in the range of <code>[-2<sup>31</sup>, 2<sup>31</sup> - 1]</code>.</p>
<p><strong>Note:</strong> You are not allowed to use any built-in function which evaluates strings as mathematical expressions, such as <code>eval()</code>.</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> s = "1+1"
<strong>Output:</strong> 2
</pre>
<p><strong class="example">Example 2:</strong></p>
<pre><strong>Input:</strong> s = "6-4/2"
<strong>Output:</strong> 4
</pre>
<p><strong class="example">Example 3:</strong></p>
<pre><strong>Input:</strong> s = "2*(5+5*2)/3+(6/2+8)"
<strong>Output:</strong> 21
</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
<li><code>1 &lt;= s &lt;= 10<sup>4</sup></code></li>
<li><code>s</code> consists of digits, <code>'+'</code>, <code>'-'</code>, <code>'*'</code>, <code>'/'</code>, <code>'('</code>, and <code>')'</code>.</li>
<li><code>s</code> is a <strong>valid</strong> expression.</li>
</ul>`,
    java: `class Solution {\n    public int calculate(String s) {\n        \n    }\n}`
  },

  "minimum-swaps-to-group-all-1s-together": {
    content: `<p>Given a binary array <code>data</code>, return the minimum number of swaps required to group all <code>1</code>'s present in the array together in <strong>any place</strong> in the array.</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> data = [1,0,1,0,1]
<strong>Output:</strong> 1
<strong>Explanation:</strong> There are 3 ways to group all 1's together:
[1,1,1,0,0] using 1 swap.
[0,1,1,1,0] using 2 swaps.
[0,0,1,1,1] using 1 swap.
The minimum is 1.
</pre>
<p><strong class="example">Example 2:</strong></p>
<pre><strong>Input:</strong> data = [0,0,0,1,0]
<strong>Output:</strong> 0
<strong>Explanation:</strong> Since there is only one 1 in the array, no swaps are needed.
</pre>
<p><strong class="example">Example 3:</strong></p>
<pre><strong>Input:</strong> data = [1,0,1,0,1,0,0,1,1,0,1]
<strong>Output:</strong> 3
<strong>Explanation:</strong> One possible solution that uses 3 swaps is [0,0,0,0,0,1,1,1,1,1,1].
</pre>
<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>
<ul>
<li><code>1 &lt;= data.length &lt;= 10<sup>5</sup></code></li>
<li><code>data[i]</code> is either <code>0</code> or <code>1</code>.</li>
</ul>`,
    java: `class Solution {\n    public int minSwaps(int[] data) {\n        \n    }\n}`
  }
};

module.exports = { PREMIUM };
