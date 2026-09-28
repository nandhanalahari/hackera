"use strict";

/* Turns a problem's LeetCode metaData plus its example test cases into a
   runnable Java program.
   
   Two files are produced so that compile errors point at the user's own code:
   Solution.java holds their code behind a fixed 2-line import preamble, and
   Main.java holds the generated driver. */

const IMPORT_LINES = ["import java.util.*;", "import java.util.function.*;"];
const IMPORT_OFFSET = IMPORT_LINES.length;

/* LeetCode type string -> Java type and the converter that builds it. */
const TYPES = {
  integer: "int",
  long: "long",
  double: "double",
  boolean: "boolean",
  string: "String",
  character: "char",
  "integer[]": "int[]",
  "long[]": "long[]",
  "double[]": "double[]",
  "boolean[]": "boolean[]",
  "string[]": "String[]",
  "character[]": "char[]",
  "integer[][]": "int[][]",
  "double[][]": "double[][]",
  "string[][]": "String[][]",
  "character[][]": "char[][]",
  "list<integer>": "List<Integer>",
  "list<long>": "List<Long>",
  "list<double>": "List<Double>",
  "list<boolean>": "List<Boolean>",
  "list<string>": "List<String>",
  "list<list<integer>>": "List<List<Integer>>",
  "list<list<string>>": "List<List<String>>",
  "ListNode": "ListNode",
  "TreeNode": "TreeNode",
  "ListNode[]": "ListNode[]",
  "TreeNode[]": "TreeNode[]"
};

const CONVERTERS = {
  integer: "toInt",
  long: "toLong",
  double: "toDouble",
  boolean: "toBool",
  string: "toStr",
  character: "toChar",
  "integer[]": "toIntArr",
  "long[]": "toLongArr",
  "double[]": "toDoubleArr",
  "boolean[]": "toBoolArr",
  "string[]": "toStrArr",
  "character[]": "toCharArr",
  "integer[][]": "toInt2D",
  "double[][]": "toDouble2D",
  "string[][]": "toStr2D",
  "character[][]": "toChar2D",
  "list<integer>": "toIntList",
  "list<long>": "toLongList",
  "list<double>": "toDoubleList",
  "list<boolean>": "toBoolList",
  "list<string>": "toStrList",
  "list<list<integer>>": "toIntListList",
  "list<list<string>>": "toStrListList",
  ListNode: "toListNode",
  TreeNode: "toTreeNode",
  "ListNode[]": "toListNodeArr",
  "TreeNode[]": "toTreeNodeArr"
};

function supports(meta) {
  if (!meta || !meta.name || !Array.isArray(meta.params)) return false;
  const ret = meta.return && meta.return.type;
  if (ret !== "void" && !TYPES[ret]) return false;
  return meta.params.every((p) => !!TYPES[p.type]);
}

function unsupportedReason(meta) {
  if (!meta || !meta.name || !Array.isArray(meta.params)) return "class-design problem";
  const bad = meta.params.filter((p) => !TYPES[p.type]).map((p) => p.type);
  const ret = meta.return && meta.return.type;
  if (ret !== "void" && !TYPES[ret]) bad.push("return " + ret);
  return "unsupported type: " + [...new Set(bad)].join(", ");
}

/* ------------------------------------------------------------------ */
/* the fixed Java support library                                      */
/* ------------------------------------------------------------------ */

const SUPPORT = String.raw`
class ListNode {
    int val; ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    int val; TreeNode left; TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}

class Json {
    private final String s; private int i;
    private Json(String s) { this.s = s; }
    static Object parse(String s) { Json j = new Json(s.trim()); return j.value(); }

    private void ws() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }

    Object value() {
        ws();
        if (i >= s.length()) return null;
        char c = s.charAt(i);
        if (c == '[') {
            i++; List<Object> out = new ArrayList<>(); ws();
            if (i < s.length() && s.charAt(i) == ']') { i++; return out; }
            while (true) {
                out.add(value()); ws();
                if (i >= s.length()) break;
                char d = s.charAt(i++);
                if (d == ']') break;
            }
            return out;
        }
        if (c == '"') {
            i++; StringBuilder sb = new StringBuilder();
            while (i < s.length() && s.charAt(i) != '"') {
                char d = s.charAt(i++);
                if (d == '\\' && i < s.length()) {
                    char e = s.charAt(i++);
                    sb.append(e == 'n' ? '\n' : e == 't' ? '\t' : e == 'r' ? '\r' : e);
                } else sb.append(d);
            }
            i++; return sb.toString();
        }
        int st = i;
        while (i < s.length() && ",]".indexOf(s.charAt(i)) < 0) i++;
        String t = s.substring(st, i).trim();
        if (t.equals("null") || t.isEmpty()) return null;
        if (t.equals("true")) return Boolean.TRUE;
        if (t.equals("false")) return Boolean.FALSE;
        if (t.contains(".") || t.contains("e") || t.contains("E")) return Double.parseDouble(t);
        return Long.parseLong(t);
    }
}

class Conv {
    @SuppressWarnings("unchecked")
    static List<Object> L(Object o) { return o == null ? new ArrayList<>() : (List<Object>) o; }

    static int toInt(Object o) { return (int) ((Long) o).longValue(); }
    static long toLong(Object o) { return ((Long) o).longValue(); }
    static double toDouble(Object o) { return o instanceof Long ? ((Long) o).doubleValue() : (Double) o; }
    static boolean toBool(Object o) { return (Boolean) o; }
    static String toStr(Object o) { return (String) o; }
    static char toChar(Object o) { return ((String) o).charAt(0); }

    static int[] toIntArr(Object o) { List<Object> l = L(o); int[] a = new int[l.size()]; for (int i = 0; i < a.length; i++) a[i] = toInt(l.get(i)); return a; }
    static long[] toLongArr(Object o) { List<Object> l = L(o); long[] a = new long[l.size()]; for (int i = 0; i < a.length; i++) a[i] = toLong(l.get(i)); return a; }
    static double[] toDoubleArr(Object o) { List<Object> l = L(o); double[] a = new double[l.size()]; for (int i = 0; i < a.length; i++) a[i] = toDouble(l.get(i)); return a; }
    static boolean[] toBoolArr(Object o) { List<Object> l = L(o); boolean[] a = new boolean[l.size()]; for (int i = 0; i < a.length; i++) a[i] = toBool(l.get(i)); return a; }
    static String[] toStrArr(Object o) { List<Object> l = L(o); String[] a = new String[l.size()]; for (int i = 0; i < a.length; i++) a[i] = toStr(l.get(i)); return a; }

    /* A char[] arrives either as ["a","b"] or as the string "ab". */
    static char[] toCharArr(Object o) {
        if (o instanceof String) return ((String) o).toCharArray();
        List<Object> l = L(o); char[] a = new char[l.size()];
        for (int i = 0; i < a.length; i++) a[i] = toChar(l.get(i));
        return a;
    }

    static int[][] toInt2D(Object o) { List<Object> l = L(o); int[][] a = new int[l.size()][]; for (int i = 0; i < a.length; i++) a[i] = toIntArr(l.get(i)); return a; }
    static double[][] toDouble2D(Object o) { List<Object> l = L(o); double[][] a = new double[l.size()][]; for (int i = 0; i < a.length; i++) a[i] = toDoubleArr(l.get(i)); return a; }
    static String[][] toStr2D(Object o) { List<Object> l = L(o); String[][] a = new String[l.size()][]; for (int i = 0; i < a.length; i++) a[i] = toStrArr(l.get(i)); return a; }
    static char[][] toChar2D(Object o) { List<Object> l = L(o); char[][] a = new char[l.size()][]; for (int i = 0; i < a.length; i++) a[i] = toCharArr(l.get(i)); return a; }

    static List<Integer> toIntList(Object o) { List<Integer> r = new ArrayList<>(); for (Object x : L(o)) r.add(toInt(x)); return r; }
    static List<Long> toLongList(Object o) { List<Long> r = new ArrayList<>(); for (Object x : L(o)) r.add(toLong(x)); return r; }
    static List<Double> toDoubleList(Object o) { List<Double> r = new ArrayList<>(); for (Object x : L(o)) r.add(toDouble(x)); return r; }
    static List<Boolean> toBoolList(Object o) { List<Boolean> r = new ArrayList<>(); for (Object x : L(o)) r.add(toBool(x)); return r; }
    static List<String> toStrList(Object o) { List<String> r = new ArrayList<>(); for (Object x : L(o)) r.add(toStr(x)); return r; }
    static List<List<Integer>> toIntListList(Object o) { List<List<Integer>> r = new ArrayList<>(); for (Object x : L(o)) r.add(toIntList(x)); return r; }
    static List<List<String>> toStrListList(Object o) { List<List<String>> r = new ArrayList<>(); for (Object x : L(o)) r.add(toStrList(x)); return r; }

    static ListNode toListNode(Object o) {
        ListNode dummy = new ListNode(), cur = dummy;
        for (Object x : L(o)) { cur.next = new ListNode(toInt(x)); cur = cur.next; }
        return dummy.next;
    }
    static ListNode[] toListNodeArr(Object o) { List<Object> l = L(o); ListNode[] a = new ListNode[l.size()]; for (int i = 0; i < a.length; i++) a[i] = toListNode(l.get(i)); return a; }

    /* Level-order with explicit nulls, the format LeetCode prints. */
    static TreeNode toTreeNode(Object o) {
        List<Object> l = L(o);
        if (l.isEmpty() || l.get(0) == null) return null;
        TreeNode root = new TreeNode(toInt(l.get(0)));
        Deque<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        int i = 1;
        while (i < l.size() && !q.isEmpty()) {
            TreeNode n = q.poll();
            if (i < l.size()) { Object v = l.get(i++); if (v != null) { n.left = new TreeNode(toInt(v)); q.add(n.left); } }
            if (i < l.size()) { Object v = l.get(i++); if (v != null) { n.right = new TreeNode(toInt(v)); q.add(n.right); } }
        }
        return root;
    }
    static TreeNode[] toTreeNodeArr(Object o) { List<Object> l = L(o); TreeNode[] a = new TreeNode[l.size()]; for (int i = 0; i < a.length; i++) a[i] = toTreeNode(l.get(i)); return a; }
}

class Fmt {
    static String of(Object o) {
        if (o == null) return "null";
        if (o instanceof String) return "\"" + ((String) o).replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
        if (o instanceof Character) return "\"" + o + "\"";
        if (o instanceof Double || o instanceof Float) {
            double d = ((Number) o).doubleValue();
            return d == Math.floor(d) && !Double.isInfinite(d) ? String.valueOf((long) d) : String.valueOf(d);
        }
        if (o instanceof ListNode) {
            StringBuilder sb = new StringBuilder("[");
            for (ListNode n = (ListNode) o; n != null; n = n.next) { if (sb.length() > 1) sb.append(","); sb.append(n.val); }
            return sb.append("]").toString();
        }
        if (o instanceof TreeNode) return tree((TreeNode) o);
        if (o.getClass().isArray()) {
            int n = java.lang.reflect.Array.getLength(o);
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < n; i++) { if (i > 0) sb.append(","); sb.append(of(java.lang.reflect.Array.get(o, i))); }
            return sb.append("]").toString();
        }
        if (o instanceof Collection) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (Object x : (Collection<?>) o) { if (!first) sb.append(","); sb.append(of(x)); first = false; }
            return sb.append("]").toString();
        }
        return String.valueOf(o);
    }

    static String tree(TreeNode root) {
        if (root == null) return "[]";
        List<String> out = new ArrayList<>();
        Deque<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode n = q.poll();
            if (n == null) { out.add("null"); continue; }
            out.add(String.valueOf(n.val));
            q.add(n.left); q.add(n.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(",", out) + "]";
    }
}
`;

/* ------------------------------------------------------------------ */
/* code generation                                                     */
/* ------------------------------------------------------------------ */

function javaString(s) {
  return (
    '"' +
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t") +
    '"'
  );
}

function buildMain(meta, tests) {
  const ret = meta.return.type;
  const isVoid = ret === "void";

  const cases = tests
    .map((t) => `        run(new String[]{${t.args.map(javaString).join(", ")}});`)
    .join("\n");

  const decls = meta.params
    .map((p, i) => `            ${TYPES[p.type]} ${p.name} = Conv.${CONVERTERS[p.type]}(Json.parse(raw[${i}]));`)
    .join("\n");

  const args = meta.params.map((p) => p.name).join(", ");
  const call = `new Solution().${meta.name}(${args})`;

  // A void signature means the answer is whatever the first argument became.
  const invoke = isVoid
    ? `            ${call};\n            Object value = ${meta.params[0].name};`
    : `            Object value = ${call};`;

  return `import java.util.*;
import java.io.*;

public class Main {
    static final PrintStream REAL = System.out;

    public static void main(String[] args) {
${cases}
    }

    static void run(String[] raw) {
        ByteArrayOutputStream captured = new ByteArrayOutputStream();
        String result = null, error = null;
        long started = System.nanoTime();
        try {
            System.setOut(new PrintStream(captured, true));
${decls}
${invoke}
            result = Fmt.of(value);
        } catch (Throwable t) {
            StringWriter sw = new StringWriter();
            t.printStackTrace(new PrintWriter(sw));
            error = sw.toString();
        } finally {
            System.out.flush();
            System.setOut(REAL);
        }
        long ms = (System.nanoTime() - started) / 1000000;

        REAL.println("<<<CASE>>>");
        REAL.println(result == null ? "" : result);
        REAL.println("<<<STDOUT>>>");
        REAL.print(captured.toString());
        REAL.println();
        REAL.println("<<<ERROR>>>");
        REAL.print(error == null ? "" : error);
        REAL.println();
        REAL.println("<<<MS>>>" + ms);
    }
}
${SUPPORT}`;
}

function buildSolution(userCode) {
  return IMPORT_LINES.join("\n") + "\n" + userCode + "\n";
}

/* javac reports positions in the generated file; shift them back onto the
   lines the user actually typed. */
function shiftSolutionLine(n) {
  const line = Number(n) - IMPORT_OFFSET;
  return line > 0 ? "Line " + line : "Solution.java:" + n;
}

function remapCompileError(stderr) {
  return String(stderr)
    .replace(/\/str\/Solution\.java \(at line (\d+)\)/g, (m, n) => shiftSolutionLine(n))
    .replace(/^Solution\.java:(\d+):/gm, (m, n) => shiftSolutionLine(n) + ":");
}

function normalize(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/"/g, "'");
}

function deepEqualUnordered(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sa = a.map((x) => JSON.stringify(x)).sort();
    const sb = b.map((x) => JSON.stringify(x)).sort();
    return sa.every((v, i) => v === sb[i]);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function equal(actual, expected) {
  const a = normalize(actual);
  const e = normalize(expected);
  if (a === e) return true;
  try {
    const ja = JSON.parse(actual.replace(/'/g, '"').replace(/\bnull\b/g, "null"));
    const je = JSON.parse(expected.replace(/'/g, '"'));
    return deepEqualUnordered(ja, je);
  } catch {
    return false;
  }
}

function gradeOutput(stdout, tests) {
  const runs = parseRunOutput(stdout);
  const cases = tests.map((t, i) => {
    const r = runs[i] || { actual: "", stdout: "", error: "No output for this case", ms: 0 };
    const hasExpected = t.expected != null && t.expected !== "";
    const passed = !r.error && (!hasExpected || equal(r.actual, t.expected));
    return {
      index: i + 1,
      args: t.args,
      expected: t.expected,
      actual: r.actual,
      stdout: r.stdout,
      error: r.error || null,
      ms: r.ms,
      passed,
      custom: !hasExpected
    };
  });
  const passed = cases.filter((c) => c.passed).length;
  return {
    ok: cases.every((c) => c.passed),
    stage: "run",
    passed,
    total: cases.length,
    cases
  };
}

function parseRunOutput(stdout) {
  const blocks = String(stdout).split("<<<CASE>>>").slice(1);
  return blocks.map((b) => {
    const out = b.split("<<<STDOUT>>>");
    const rest = (out[1] || "").split("<<<ERROR>>>");
    const tail = (rest[1] || "").split("<<<MS>>>");
    return {
      actual: (out[0] || "").trim(),
      stdout: (rest[0] || "").replace(/\n$/, ""),
      error: (tail[0] || "").trim(),
      ms: Number((tail[1] || "0").trim()) || 0
    };
  });
}

const harnessApi = {
  TYPES,
  supports,
  unsupportedReason,
  buildMain,
  buildSolution,
  remapCompileError,
  parseRunOutput,
  gradeOutput,
  IMPORT_OFFSET
};

if (typeof module !== "undefined" && module.exports) module.exports = harnessApi;
if (typeof window !== "undefined") window.HackeraHarness = harnessApi;
