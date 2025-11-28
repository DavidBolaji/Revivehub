/**
 * Python-specific pattern detection rules
 */

import type { PatternRule } from './rules'

export const PYTHON_PATTERNS: PatternRule[] = [
  {
    id: 'python-print-statement',
    name: 'Python 2 print to Python 3',
    category: 'modernization',
    language: 'python',
    detector: /print\s+[^(]/,
    description: 'Convert Python 2 print statements to Python 3 function',
    problem: 'Python 2 print statement is not compatible with Python 3',
    solution: 'Use print() function with parentheses',
    example: {
      before: 'print "Hello, World!"\nprint x, y',
      after: 'print("Hello, World!")\nprint(x, y)',
    },
    autoFixable: true,
    complexity: 'low',
    estimatedTime: '5 minutes',
    benefits: [
      'Python 3 compatibility',
      'Consistent function syntax',
      'Better formatting options',
    ],
    breakingChanges: [
      'Requires parentheses',
      'Different separator syntax',
    ],
    tags: ['python', 'python2', 'python3', 'print'],
  },
  {
    id: 'python-string-format',
    name: 'String formatting to f-strings',
    category: 'modernization',
    language: 'python',
    detector: /['"].*%[sd]|\.format\(/,
    description: 'Replace % formatting and .format() with f-strings',
    problem: 'Old string formatting is verbose and less readable',
    solution: 'Use f-strings for cleaner, faster string interpolation',
    example: {
      before: `name = "Alice"
age = 30
message = "Hello, %s. You are %d years old." % (name, age)
message2 = "Hello, {}. You are {} years old.".format(name, age)`,
      after: `name = "Alice"
age = 30
message = f"Hello, {name}. You are {age} years old."`,
    },
    autoFixable: true,
    complexity: 'low',
    estimatedTime: '10 minutes',
    benefits: [
      'More readable',
      'Faster performance',
      'Inline expressions',
      'Less verbose',
    ],
    breakingChanges: [
      'Requires Python 3.6+',
    ],
    tags: ['python', 'f-strings', 'string-formatting'],
  },
  {
    id: 'python-type-hints',
    name: 'Add Type Hints',
    category: 'modernization',
    language: 'python',
    detector: (code) => {
      return /def\s+\w+\s*\([^)]*\)\s*:/.test(code) &&
             !/def\s+\w+\s*\([^)]*:\s*\w+/.test(code)
    },
    description: 'Add type hints to function signatures',
    problem: 'Missing type hints make code harder to understand and maintain',
    solution: 'Add type annotations for parameters and return values',
    example: {
      before: `def greet(name, age):
    return f"Hello {name}, you are {age} years old"`,
      after: `def greet(name: str, age: int) -> str:
    return f"Hello {name}, you are {age} years old"`,
    },
    autoFixable: false,
    complexity: 'medium',
    estimatedTime: '15-30 minutes',
    benefits: [
      'Better IDE support',
      'Catch type errors early',
      'Self-documenting code',
      'Better refactoring',
    ],
    breakingChanges: [],
    tags: ['python', 'type-hints', 'typing'],
  },
  {
    id: 'python-dict-get',
    name: 'Dictionary access to .get()',
    category: 'security',
    language: 'python',
    detector: /\w+\[['"][^'"]+['"]\]/,
    description: 'Use .get() method for safer dictionary access',
    problem: 'Direct dictionary access raises KeyError if key missing',
    solution: 'Use .get() with default value',
    example: {
      before: `value = data['key']
name = user['name']`,
      after: `value = data.get('key', None)
name = user.get('name', 'Unknown')`,
    },
    autoFixable: false,
    complexity: 'low',
    estimatedTime: '10 minutes',
    benefits: [
      'Prevents KeyError exceptions',
      'Provides default values',
      'More defensive code',
    ],
    breakingChanges: [
      'Returns None instead of raising error',
    ],
    tags: ['python', 'dictionaries', 'error-handling'],
  },
  {
    id: 'python-list-comprehension',
    name: 'Loops to List Comprehensions',
    category: 'performance',
    language: 'python',
    detector: (code) => {
      return /for\s+\w+\s+in\s+.*:\s*\n\s+\w+\.append\(/.test(code)
    },
    description: 'Replace simple loops with list comprehensions',
    problem: 'Explicit loops are verbose and slower',
    solution: 'Use list comprehensions for cleaner, faster code',
    example: {
      before: `result = []
for item in items:
    result.append(item * 2)`,
      after: `result = [item * 2 for item in items]`,
    },
    autoFixable: true,
    complexity: 'low',
    estimatedTime: '5 minutes',
    benefits: [
      'More concise',
      'Better performance',
      'More Pythonic',
    ],
    breakingChanges: [],
    tags: ['python', 'list-comprehension', 'performance'],
  },
  {
    id: 'python-pathlib',
    name: 'os.path to pathlib',
    category: 'modernization',
    language: 'python',
    detector: /import\s+os\.path|from\s+os\s+import\s+path/,
    description: 'Replace os.path with pathlib for better path handling',
    problem: 'os.path is procedural and less intuitive',
    solution: 'Use pathlib.Path for object-oriented path operations',
    example: {
      before: `import os.path

file_path = os.path.join(directory, 'file.txt')
if os.path.exists(file_path):
    with open(file_path, 'r') as f:
        content = f.read()`,
      after: `from pathlib import Path

file_path = Path(directory) / 'file.txt'
if file_path.exists():
    content = file_path.read_text()`,
    },
    autoFixable: false,
    complexity: 'medium',
    estimatedTime: '20-30 minutes',
    benefits: [
      'Object-oriented API',
      'Cross-platform compatibility',
      'More intuitive operations',
      'Built-in convenience methods',
    ],
    breakingChanges: [
      'Different API',
      'Returns Path objects instead of strings',
    ],
    tags: ['python', 'pathlib', 'os-path', 'file-handling'],
  },
  {
    id: 'python-dataclass',
    name: 'Class to dataclass',
    category: 'modernization',
    language: 'python',
    detector: (code) => {
      return /class\s+\w+.*:\s*\n\s+def\s+__init__/.test(code) &&
             !/@dataclass/.test(code)
    },
    description: 'Convert simple classes to dataclasses',
    problem: 'Manual __init__ and __repr__ methods are boilerplate',
    solution: 'Use @dataclass decorator for automatic method generation',
    example: {
      before: `class Person:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
    
    def __repr__(self):
        return f"Person(name={self.name}, age={self.age})"`,
      after: `from dataclasses import dataclass

@dataclass
class Person:
    name: str
    age: int`,
    },
    autoFixable: false,
    complexity: 'medium',
    estimatedTime: '15-20 minutes',
    benefits: [
      'Less boilerplate',
      'Automatic __init__, __repr__, __eq__',
      'Type hints required',
      'Immutable option with frozen=True',
    ],
    breakingChanges: [
      'Requires Python 3.7+',
      'Different initialization behavior',
    ],
    tags: ['python', 'dataclass', 'classes'],
  },
  {
    id: 'python-context-manager',
    name: 'Manual cleanup to context manager',
    category: 'security',
    language: 'python',
    detector: (code) => {
      return /open\s*\([^)]+\)(?!\s*as\s+)/.test(code) ||
             /\.close\(\)/.test(code)
    },
    description: 'Use context managers for resource management',
    problem: 'Manual resource cleanup can be forgotten or fail',
    solution: 'Use with statement for automatic cleanup',
    example: {
      before: `file = open('data.txt', 'r')
try:
    content = file.read()
finally:
    file.close()`,
      after: `with open('data.txt', 'r') as file:
    content = file.read()`,
    },
    autoFixable: true,
    complexity: 'low',
    estimatedTime: '5 minutes',
    benefits: [
      'Automatic resource cleanup',
      'Exception-safe',
      'More concise',
      'Prevents resource leaks',
    ],
    breakingChanges: [],
    tags: ['python', 'context-manager', 'with-statement', 'resources'],
  },
]
