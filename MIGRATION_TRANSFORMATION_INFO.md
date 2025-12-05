# Migration Transformation Methods: AST vs AI

This document explains how different file types are transformed during the React to Next.js migration, including which files use AST (Abstract Syntax Tree) transformations and which use AI-powered transformations.

## Overview

The migration system uses a **hybrid approach** combining three transformation methods:

1. **AST Transformations** - Deterministic, rule-based code transformations
2. **AI Transformations** - Semantic understanding and intelligent code conversion
3. **File Structure Management** - Directory reorganization and file relocation

## Transformation Decision Flow

```
File → Can use AST? → Needs AI? → Transformation Method
  ↓         ↓              ↓
  Yes       Yes         → AST + AI (Hybrid)
  Yes       No          → AST Only
  No        -           → AI Only (or Skip)
```

## File Types and Transformation Methods

### 1. JavaScript/TypeScript Component Files

**Files:** `*.js`, `*.jsx`, `*.ts`, `*.tsx` in `components/`, `hooks/`, `context/`

**Method:** AST + AI (Hybrid)

**Process:**
1. **AST Phase**: 
   - Converts JavaScript to TypeScript
   - Updates import statements
   - Adds type annotations
   - Removes React imports (not needed in Next.js 13+)

2. **AI Phase**:
   - Adds `'use client'` directive for client components
   - Converts to TypeScript with proper interfaces
   - Adds accessibility attributes
   - Improves type safety

**Examples:**

#### Component File (TodoItem.js)
```javascript
// BEFORE (React)
import React from 'react';

const TodoItem = ({ todo, onToggle, onDelete }) => {
  return (
    <div className="todo-container">
      <input type="checkbox" checked={todo.completed} onChange={onToggle} />
      <span>{todo.text}</span>
      <button onClick={onDelete}>Delete</button>
    </div>
  );
};

export default TodoItem;
```

```typescript
// AFTER (Next.js) - AST + AI
'use client'

import React from 'react';

interface Todo {
  text: string;
  completed: boolean;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
  return (
    <div className="todo-container">
      <input 
        type="checkbox" 
        checked={todo.completed} 
        onChange={onToggle}
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />
      <span>{todo.text}</span>
      <button onClick={onDelete} aria-label={`Delete "${todo.text}"`}>
        Delete
      </button>
    </div>
  );
};

export default TodoItem;
```

**Transformation Details:**
- ✅ AST: Converted to TypeScript syntax
- ✅ AI: Added `'use client'` directive
- ✅ AI: Created TypeScript interfaces
- ✅ AI: Added accessibility attributes
- ✅ File Structure: Moved from `src/components/` to `components/`

---

#### Hook File (useTodos.js)
```javascript
// BEFORE (React)
import { useContext } from 'react';
import { TodoContext } from '../context/TodoContext';

const useTodos = () => {
  const context = useContext(TodoContext);
  return context;
};

export default useTodos;
```

```typescript
// AFTER (Next.js) - AST Only
import { useContext } from 'react';
import { TodoContext } from '../context/TodoContext';

const useTodos = () => {
  const context = useContext(TodoContext);
  return context;
};

export default useTodos;
```

**Transformation Details:**
- ✅ AST: Converted to TypeScript
- ❌ AI: Not needed (simple hook, no complex logic)
- ✅ File Structure: Moved from `src/hooks/` to `hooks/`

---

#### Context File (TodoContext.js)
```javascript
// BEFORE (React)
import React, { createContext, useState } from 'react';

export const TodoContext = createContext();

export const TodoProvider = ({ children }) => {
  const [todos, setTodos] = useState([]);
  
  const addTodo = (text) => {
    setTodos([...todos, { id: Date.now(), text, completed: false }]);
  };
  
  return (
    <TodoContext.Provider value={{ todos, addTodo }}>
      {children}
    </TodoContext.Provider>
  );
};
```

```typescript
// AFTER (Next.js) - AST Only
import React, { createContext, useState } from 'react';

export const TodoContext = createContext();

export const TodoProvider = ({ children }) => {
  const [todos, setTodos] = useState([]);
  
  const addTodo = (text) => {
    setTodos([...todos, { id: Date.now(), text, completed: false }]);
  };
  
  return (
    <TodoContext.Provider value={{ todos, addTodo }}>
      {children}
    </TodoContext.Provider>
  );
};
```

**Transformation Details:**
- ✅ AST: Converted to TypeScript
- ❌ AI: Not needed (context structure is straightforward)
- ✅ File Structure: Moved from `src/context/` to `context/`

---

### 2. Page/Route Files

**Files:** `src/App.js`, `pages/*.js`

**Method:** AST + AI (Hybrid)

**Process:**
1. **AST Phase**: Basic TypeScript conversion
2. **AI Phase**: Converts to Next.js App Router conventions
3. **File Structure**: Relocates to `app/page.tsx`

**Example:**

```javascript
// BEFORE (React - src/App.js)
import React from 'react';
import TodoList from './components/TodoList';
import TodoInput from './components/TodoInput';
import { TodoProvider } from './context/TodoContext';
import './App.css';

function App() {
  return (
    <TodoProvider>
      <div className="App">
        <h1>Todo App</h1>
        <TodoInput />
        <TodoList />
      </div>
    </TodoProvider>
  );
}

export default App;
```

```typescript
// AFTER (Next.js - app/page.tsx)
import TodoList from '@/components/TodoList';
import TodoInput from '@/components/TodoInput';
import { TodoProvider } from '@/context/TodoContext';

export default function Home() {
  return (
    <TodoProvider>
      <div className="App">
        <h1>Todo App</h1>
        <TodoInput />
        <TodoList />
      </div>
    </TodoProvider>
  );
}
```

**Transformation Details:**
- ✅ AST: Converted to TypeScript
- ✅ AI: Changed to default export function
- ✅ AI: Updated imports to use `@/` alias
- ✅ File Structure: Moved from `src/App.js` to `app/page.tsx`

---

### 3. Configuration Files

**Files:** `package.json`, `tsconfig.json`, `next.config.js`

**Method:** AI Only

**Process:**
- AI analyzes dependencies and updates them
- Adds Next.js-specific configurations
- Updates scripts for Next.js commands

**Example:**

```json
// BEFORE (React - package.json)
{
  "name": "todo-app",
  "version": "1.0.0",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  }
}
```

```json
// AFTER (Next.js - package.json)
{
  "name": "next-todo-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.18",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "eslint": "^9.14.0",
    "eslint-config-next": "^14.2.18",
    "tailwindcss": "^3.4.0"
  }
}
```

**Transformation Details:**
- ❌ AST: Not applicable (JSON file)
- ✅ AI: Updated all dependencies
- ✅ AI: Changed scripts to Next.js commands
- ✅ AI: Added Next.js dev dependencies

---

### 4. Test Files

**Files:** `*.test.js`, `*.spec.js`, `setupTests.js`

**Method:** AST Only

**Process:**
1. **AST Phase**: Converts to TypeScript
2. **File Structure**: Moves to `__tests__/` directory

**Example:**

```javascript
// BEFORE (React - src/App.test.js)
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders todo app', () => {
  render(<App />);
  const heading = screen.getByText(/todo app/i);
  expect(heading).toBeInTheDocument();
});
```

```typescript
// AFTER (Next.js - __tests__/App.test.tsx)
import { render, screen } from '@testing-library/react';
import App from '../app/page';

test('renders todo app', () => {
  render(<App />);
  const heading = screen.getByText(/todo app/i);
  expect(heading).toBeInTheDocument();
});
```

**Transformation Details:**
- ✅ AST: Converted to TypeScript
- ✅ AST: Updated import paths
- ❌ AI: Not needed (test structure is simple)
- ✅ File Structure: Moved from `src/` to `__tests__/`

---

### 5. Style Files

**Files:** `*.css`, `*.scss`

**Method:** File Structure Only + CSS Merging

**Process:**
1. Merges multiple CSS files into `app/globals.css`
2. Adds Tailwind directives
3. Removes duplicate CSS rules

**Example:**

```css
/* BEFORE (React - src/index.css) */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto';
}
```

```css
/* BEFORE (React - src/App.css) */
.App {
  text-align: center;
  padding: 20px;
}

.todo-container {
  display: flex;
  gap: 10px;
}
```

```css
/* AFTER (Next.js - app/globals.css) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* From src/index.css */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto';
}

/* From src/App.css */
.App {
  text-align: center;
  padding: 20px;
}

.todo-container {
  display: flex;
  gap: 10px;
}
```

**Transformation Details:**
- ❌ AST: Not applicable (CSS file)
- ❌ AI: Not needed
- ✅ File Structure: Merged multiple CSS files
- ✅ CSS Processing: Added Tailwind directives
- ✅ CSS Processing: Removed duplicate rules

---

### 6. Files to Delete

**Files:** `src/index.js`, `src/reportWebVitals.js`, `public/index.html`

**Method:** File Structure Only (Deletion)

**Process:**
- Marked for deletion (not transformed)
- These files are React-specific and not needed in Next.js

**Files:**
- ❌ `src/index.js` - React entry point (Next.js uses `app/layout.tsx`)
- ❌ `src/reportWebVitals.js` - Web vitals reporting (Next.js has built-in analytics)
- ❌ `public/index.html` - HTML template (Next.js generates HTML automatically)

---

### 7. Generated Files

**Files:** `app/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`, `tailwind.config.ts`

**Method:** Template Generation

**Process:**
- Generated from templates
- No transformation needed (new files)

**Example:**

```typescript
// GENERATED (Next.js - app/layout.tsx)
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Todo App',
  description: 'Migrated to Next.js App Router',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

---

## Summary Table

| File Type | AST | AI | File Structure | Example |
|-----------|-----|----|--------------| --------|
| **Components** | ✅ | ✅ | ✅ Move | `src/components/TodoItem.js` → `components/TodoItem.tsx` |
| **Hooks** | ✅ | ❌ | ✅ Move | `src/hooks/useTodos.js` → `hooks/useTodos.tsx` |
| **Context** | ✅ | ❌ | ✅ Move | `src/context/TodoContext.js` → `context/TodoContext.tsx` |
| **Pages** | ✅ | ✅ | ✅ Move | `src/App.js` → `app/page.tsx` |
| **Tests** | ✅ | ❌ | ✅ Move | `src/App.test.js` → `__tests__/App.test.tsx` |
| **Config** | ❌ | ✅ | ❌ | `package.json` (updated in place) |
| **Styles** | ❌ | ❌ | ✅ Merge | `src/*.css` → `app/globals.css` |
| **Entry Points** | ❌ | ❌ | ✅ Delete | `src/index.js` (deleted) |
| **Generated** | ❌ | ❌ | ✅ Create | `app/layout.tsx` (new file) |

## When AI is Used

AI transformations are triggered when:

1. **Complex Component Logic**: Components with event handlers, state, or effects
2. **Type Inference Needed**: When TypeScript types need to be inferred from usage
3. **Framework-Specific Patterns**: Converting React patterns to Next.js conventions
4. **Accessibility Improvements**: Adding ARIA attributes and semantic HTML
5. **Configuration Files**: JSON files that need intelligent dependency updates

## When AST is Used

AST transformations are used for:

1. **Syntax Conversion**: JavaScript to TypeScript
2. **Import Updates**: Changing import paths and removing unused imports
3. **Simple Refactoring**: Renaming variables, updating function signatures
4. **Deterministic Changes**: Changes that follow clear, rule-based patterns

## Confidence Scores

Each transformation includes a confidence score:

- **90-100%**: AST-only transformations (deterministic)
- **80-89%**: Hybrid AST + AI (high confidence)
- **70-79%**: AI-heavy transformations (may need review)
- **<70%**: Complex transformations (requires manual review)

## Viewing Transformation Details

To see which method was used for each file, check the server logs:

```
[Hybrid Engine] AI transformation needed for src/components/TodoItem.js: true
[Hybrid Engine] ▶ Applying Enhanced AI transformation
```

Or:

```
[Hybrid Engine] AI transformation needed for src/hooks/useTodos.js: false
[Hybrid Engine] Skipping AI transformation (AST-only)
```

---

## File Structure Changes

All files undergo directory reorganization:

### React Structure:
```
src/
  ├── components/
  ├── context/
  ├── hooks/
  ├── App.js
  ├── index.js
  ├── App.css
  └── index.css
```

### Next.js Structure:
```
app/
  ├── layout.tsx (generated)
  ├── page.tsx (from src/App.js)
  ├── error.tsx (generated)
  ├── not-found.tsx (generated)
  ├── globals.css (merged)
  └── context/
      └── TodoContext.tsx
components/
  ├── TodoItem.tsx
  ├── TodoList.tsx
  └── TodoInput.tsx
hooks/
  └── useTodos.tsx
__tests__/
  ├── App.test.tsx
  └── setupTests.tsx
```

---

## Notes

- **AST transformations** are fast, deterministic, and safe
- **AI transformations** are intelligent but may require review
- **File structure changes** are applied to all files regardless of transformation method
- The system uses a **hybrid approach** to get the best of both worlds
