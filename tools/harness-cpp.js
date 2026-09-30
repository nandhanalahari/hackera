function cppType(type) {
  const map = {
    integer: 'int', long: 'long long', double: 'double', boolean: 'bool', string: 'std::string', character: 'char',
    'integer[]': 'std::vector<int>', 'long[]': 'std::vector<long long>', 'double[]': 'std::vector<double>', 'boolean[]': 'std::vector<bool>', 'string[]': 'std::vector<std::string>', 'character[]': 'std::vector<char>',
    'integer[][]': 'std::vector<std::vector<int>>', 'double[][]': 'std::vector<std::vector<double>>', 'string[][]': 'std::vector<std::vector<std::string>>', 'character[][]': 'std::vector<std::vector<char>>',
    ListNode: 'ListNode*', TreeNode: 'TreeNode*'
  };
  return map[type] || type;
}

function cppValue(val, type) {
  if (val === null) return 'nullptr';
  if (type === 'string') return JSON.stringify(val);
  if (type === 'character') return "'" + val.replace(/'/g, "\\'") + "'";
  if (type.endsWith('[]')) {
    const inner = type.slice(0, -2);
    if (!Array.isArray(val)) return '{}';
    return '{' + val.map(v => cppValue(v, inner)).join(', ') + '}';
  }
  return String(val);
}

function cppPrint(type, varName) {
  if (type === 'string') return `std::cout << "\\"" << ${varName} << "\\"";`;
  if (type.endsWith('[]')) {
    return `std::cout << "["; for(size_t i=0; i<${varName}.size(); ++i) { if(i>0) std::cout << ","; ${cppPrint(type.slice(0,-2), varName + "[i]")} } std::cout << "]";`;
  }
  if (type === 'boolean') return `std::cout << (${varName} ? "true" : "false");`;
  if (type === 'ListNode') return `std::cout << "["; for(ListNode* c=${varName}; c; c=c->next) { if(c!=${varName}) std::cout<<","; std::cout<<c->val; } std::cout << "]";`;
  if (type === 'TreeNode') return `std::cout << "[]";`; // Simplified TreeNode printing for now
  return `std::cout << ${varName};`;
}

function buildCppMain(meta, tests, userCode) {
  const funcName = meta.name;
  
  const cases = tests.map((t, i) => {
    const decls = meta.params.map((p, j) => {
      const val = JSON.parse(t.args[j]);
      return `        ${cppType(p.type)} arg${j} = ${cppValue(val, p.type)};`;
    }).join('\n');
    const callArgs = meta.params.map((p, j) => `arg${j}`).join(', ');
    
    let call = `Solution().${funcName}(${callArgs});`;
    let print = '';
    if (meta.return.type !== 'void') {
      call = `${cppType(meta.return.type)} ans = ${call}`;
      print = cppPrint(meta.return.type, 'ans');
    }
    
    return `
    {
        std::stringstream captured;
        std::streambuf* old_cout = std::cout.rdbuf(captured.rdbuf());
        auto t0 = std::chrono::high_resolution_clock::now();
        std::string err;
        try {
${decls}
        ${call}
        std::cout.rdbuf(old_cout);
        
        auto t1 = std::chrono::high_resolution_clock::now();
        int ms = std::chrono::duration_cast<std::chrono::milliseconds>(t1 - t0).count();
        
        std::cout << "<<<CASE>>>\\n";
        ${print}
        std::cout << "\\n<<<STDOUT>>>\\n" << captured.str() << "\\n<<<ERROR>>>\\n" << err << "\\n<<<MS>>>" << ms << "\\n";
        
        } catch(const std::exception& e) {
            err = e.what();
            std::cout.rdbuf(old_cout);
            std::cout << "<<<CASE>>>\\n\\n<<<STDOUT>>>\\n" << captured.str() << "\\n<<<ERROR>>>\\n" << err << "\\n<<<MS>>>0\\n";
        } catch(...) {
            err = "Unknown error";
            std::cout.rdbuf(old_cout);
            std::cout << "<<<CASE>>>\\n\\n<<<STDOUT>>>\\n" << captured.str() << "\\n<<<ERROR>>>\\n" << err << "\\n<<<MS>>>0\\n";
        }
    }`;
  }).join('\n');

  return `
#include <iostream>
#include <vector>
#include <string>
#include <chrono>
#include <sstream>

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

using namespace std;

// User code
${userCode}

int main() {
${cases}
    return 0;
}
`;
}
module.exports = { buildCppMain };
