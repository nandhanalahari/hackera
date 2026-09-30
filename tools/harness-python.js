function buildPythonMain(meta, tests, userCode) {
  const funcName = meta.name;
  
  // Create test case calls
  const cases = tests.map(t => {
    const argsStr = t.args.map(a => JSON.stringify(a)).join(', ');
    return `    __run_case([${argsStr}])`;
  }).join('\n');

  return `
import json, time, traceback, sys, io
from collections import deque
from typing import List, Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def _to_listnode(l):
    if not l: return None
    dummy = ListNode()
    curr = dummy
    for val in l:
        curr.next = ListNode(val)
        curr = curr.next
    return dummy.next

def _from_listnode(node):
    l = []
    while node:
        l.append(node.val)
        node = node.next
    return l

def _to_treenode(l):
    if not l or l[0] is None: return None
    root = TreeNode(l[0])
    q = deque([root])
    i = 1
    while i < len(l) and q:
        n = q.popleft()
        if i < len(l) and l[i] is not None:
            n.left = TreeNode(l[i])
            q.append(n.left)
        i += 1
        if i < len(l) and l[i] is not None:
            n.right = TreeNode(l[i])
            q.append(n.right)
        i += 1
    return root

def _from_treenode(root):
    if not root: return []
    out = []
    q = deque([root])
    while q:
        n = q.popleft()
        if not n:
            out.append(None)
            continue
        out.append(n.val)
        q.append(n.left)
        q.append(n.right)
    while out and out[-1] is None: out.pop()
    return out

# User code
${userCode}

def __run_case(args_raw):
    # Setup capture
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    result = None
    err = None
    ms = 0
    try:
        args = [json.loads(a) for a in args_raw]
        # Need to cast args if type is ListNode or TreeNode
        # To avoid complex type mapping, we just try to cast if the meta matches.
        # But wait, we can just map based on meta!
        # Actually, let's inject type conversion here
${meta.params.map((p, i) => {
    if (p.type === 'ListNode') return `        args[${i}] = _to_listnode(args[${i}])`;
    if (p.type === 'TreeNode') return `        args[${i}] = _to_treenode(args[${i}])`;
    return '';
}).join('\n')}
        t0 = time.time()
        sol = Solution()
        ans = getattr(sol, '${funcName}')(*args)
        t1 = time.time()
        ms = int((t1 - t0) * 1000)
        
        # Format answer
${(() => {
    const retType = meta.return.type;
    if (retType === 'ListNode') return '        ans = _from_listnode(ans)';
    if (retType === 'TreeNode') return '        ans = _from_treenode(ans)';
    return '';
})()}
        # Use python json to stringify and remove spaces to match java output format
        if ans is None:
            result = "null"
        elif isinstance(ans, bool):
            result = "true" if ans else "false"
        else:
            result = json.dumps(ans, separators=(',', ':'))
            
    except Exception as e:
        err = traceback.format_exc()

    captured = sys.stdout.getvalue()
    sys.stdout = old_stdout
    
    print("<<<CASE>>>")
    if result is not None: print(result)
    print("<<<STDOUT>>>")
    print(captured, end='')
    print("<<<ERROR>>>")
    if err: print(err, end='')
    print("<<<MS>>>" + str(ms))

if __name__ == '__main__':
${cases}
`;
}
module.exports = { buildPythonMain };
