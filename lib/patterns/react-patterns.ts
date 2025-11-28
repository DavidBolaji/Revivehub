/**
 * React-specific pattern detection rules
 */

import type { PatternRule } from './rules'

export const REACT_PATTERNS: PatternRule[] = [
  {
    id: 'react-class-to-hooks',
    name: 'Class Components to Hooks',
    category: 'modernization',
    language: 'javascript',
    framework: 'react',
    detector: /class\s+\w+\s+extends\s+(React\.)?Component/,
    description: 'Convert React class components to functional components with hooks',
    problem: 'Class components are verbose and harder to reuse logic',
    solution: 'Use functional components with useState, useEffect, and custom hooks',
    example: {
      before: `class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  componentDidMount() {
    document.title = \`Count: \${this.state.count}\`;
  }

  render() {
    return (
      <button onClick={() => this.setState({ count: this.state.count + 1 })}>
        {this.state.count}
      </button>
    );
  }
}`,
      after: `function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}`,
    },
    autoFixable: false,
    complexity: 'high',
    estimatedTime: '30-60 minutes per component',
    benefits: [
      'Simpler, more concise code',
      'Better code reuse with custom hooks',
      'Easier to test',
      'Better performance with React.memo',
    ],
    breakingChanges: [
      'this.props becomes props parameter',
      'this.state becomes useState hooks',
      'Lifecycle methods become useEffect hooks',
    ],
    tags: ['react', 'hooks', 'class-components', 'functional-components'],
  },
  {
    id: 'react-proptypes-to-typescript',
    name: 'PropTypes to TypeScript',
    category: 'modernization',
    language: 'javascript',
    framework: 'react',
    detector: /PropTypes\./,
    description: 'Replace PropTypes with TypeScript interfaces',
    problem: 'PropTypes only validate at runtime and add bundle size',
    solution: 'Use TypeScript for compile-time type checking',
    example: {
      before: `import PropTypes from 'prop-types';

function Button({ label, onClick, disabled }) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}

Button.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};`,
      after: `interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function Button({ label, onClick, disabled }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}`,
    },
    autoFixable: false,
    complexity: 'medium',
    estimatedTime: '15-30 minutes',
    benefits: [
      'Compile-time type checking',
      'Better IDE autocomplete',
      'Smaller bundle size',
      'Better refactoring support',
    ],
    breakingChanges: [
      'Requires TypeScript setup',
      'File extension changes to .tsx',
    ],
    tags: ['react', 'typescript', 'proptypes', 'type-safety'],
  },
  {
    id: 'react-formik-to-rhf-zod',
    name: 'Formik to React Hook Form + Zod',
    category: 'modernization',
    language: 'javascript',
    framework: 'react',
    detector: /import.*Formik.*from ['"]formik['"]/,
    description: 'Migrate from Formik to React Hook Form with Zod validation',
    problem: 'Formik causes unnecessary re-renders and has larger bundle size',
    solution: 'Use React Hook Form for better performance and Zod for type-safe validation',
    example: {
      before: `import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

const schema = Yup.object({
  email: Yup.string().email().required(),
  password: Yup.string().min(8).required(),
});

function LoginForm() {
  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validationSchema={schema}
      onSubmit={(values) => console.log(values)}
    >
      <Form>
        <Field name="email" type="email" />
        <Field name="password" type="password" />
        <button type="submit">Submit</button>
      </Form>
    </Formik>
  );
}`,
      after: `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register('email')} type="email" />
      <input {...register('password')} type="password" />
      <button type="submit">Submit</button>
    </form>
  );
}`,
    },
    autoFixable: false,
    complexity: 'high',
    estimatedTime: '1-2 hours per form',
    benefits: [
      'Better performance (fewer re-renders)',
      'Smaller bundle size',
      'Type-safe validation with Zod',
      'Better TypeScript integration',
    ],
    breakingChanges: [
      'Different API for form handling',
      'Validation schema syntax changes',
      'Field registration changes',
    ],
    tags: ['react', 'forms', 'formik', 'react-hook-form', 'zod'],
  },
  {
    id: 'react-moment-to-datefns',
    name: 'Moment.js to date-fns',
    category: 'performance',
    language: 'javascript',
    framework: 'react',
    detector: /import.*moment.*from ['"]moment['"]/,
    description: 'Replace Moment.js with date-fns for smaller bundle size',
    problem: 'Moment.js is large (67KB minified) and mutable',
    solution: 'Use date-fns which is modular, immutable, and tree-shakeable',
    example: {
      before: `import moment from 'moment';

const formatted = moment(date).format('YYYY-MM-DD');
const relative = moment(date).fromNow();
const added = moment(date).add(7, 'days');`,
      after: `import { format, formatDistanceToNow, addDays } from 'date-fns';

const formatted = format(date, 'yyyy-MM-dd');
const relative = formatDistanceToNow(date, { addSuffix: true });
const added = addDays(date, 7);`,
    },
    autoFixable: false,
    complexity: 'medium',
    estimatedTime: '30-45 minutes',
    benefits: [
      'Smaller bundle size (2-3KB per function)',
      'Immutable date operations',
      'Tree-shakeable',
      'Better TypeScript support',
    ],
    breakingChanges: [
      'Different API for date operations',
      'Format string syntax changes',
      'Import statements change',
    ],
    tags: ['react', 'dates', 'moment', 'date-fns', 'bundle-size'],
  },
  {
    id: 'react-redux-to-zustand',
    name: 'Redux to Zustand',
    category: 'modernization',
    language: 'javascript',
    framework: 'react',
    detector: /import.*from ['"]@?reduxjs\/toolkit['"]/,
    description: 'Migrate from Redux to Zustand for simpler state management',
    problem: 'Redux requires boilerplate and complex setup',
    solution: 'Use Zustand for minimal boilerplate and better DX',
    example: {
      before: `// store.js
import { createSlice, configureStore } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; },
    decrement: (state) => { state.value -= 1; },
  },
});

export const { increment, decrement } = counterSlice.actions;
export const store = configureStore({ reducer: counterSlice.reducer });

// Component.jsx
import { useSelector, useDispatch } from 'react-redux';
import { increment, decrement } from './store';

function Counter() {
  const count = useSelector((state) => state.value);
  const dispatch = useDispatch();
  
  return (
    <div>
      <button onClick={() => dispatch(decrement())}>-</button>
      <span>{count}</span>
      <button onClick={() => dispatch(increment())}>+</button>
    </div>
  );
}`,
      after: `// store.js
import { create } from 'zustand';

export const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

// Component.jsx
import { useCounterStore } from './store';

function Counter() {
  const { count, increment, decrement } = useCounterStore();
  
  return (
    <div>
      <button onClick={decrement}>-</button>
      <span>{count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
}`,
    },
    autoFixable: false,
    complexity: 'high',
    estimatedTime: '2-4 hours',
    benefits: [
      'Less boilerplate code',
      'Simpler API',
      'Better TypeScript support',
      'Smaller bundle size',
      'No provider needed',
    ],
    breakingChanges: [
      'Complete state management rewrite',
      'Different hook API',
      'No Redux DevTools (use Zustand devtools)',
    ],
    tags: ['react', 'state-management', 'redux', 'zustand'],
  },
  {
    id: 'react-useeffect-cleanup',
    name: 'Add useEffect Cleanup',
    category: 'security',
    language: 'javascript',
    framework: 'react',
    detector: (code) => {
      return /useEffect\s*\(\s*\(\s*\)\s*=>\s*{[\s\S]*?}\s*,/.test(code) &&
             !/return\s*\(\s*\)\s*=>/.test(code)
    },
    description: 'Add cleanup functions to useEffect hooks',
    problem: 'Missing cleanup can cause memory leaks and race conditions',
    solution: 'Return cleanup function from useEffect',
    example: {
      before: `useEffect(() => {
  const subscription = api.subscribe(data => setData(data));
}, []);`,
      after: `useEffect(() => {
  const subscription = api.subscribe(data => setData(data));
  return () => subscription.unsubscribe();
}, []);`,
    },
    autoFixable: false,
    complexity: 'medium',
    estimatedTime: '10-15 minutes',
    benefits: [
      'Prevents memory leaks',
      'Avoids race conditions',
      'Proper resource cleanup',
    ],
    breakingChanges: [],
    tags: ['react', 'hooks', 'useEffect', 'memory-leaks'],
  },
  {
    id: 'react-key-prop',
    name: 'Add key prop to list items',
    category: 'performance',
    language: 'javascript',
    framework: 'react',
    detector: /\.map\s*\(\s*\([^)]*\)\s*=>\s*<(?!.*key=)/,
    description: 'Add key prop to elements in lists',
    problem: 'Missing keys cause poor performance and bugs',
    solution: 'Add unique key prop to each list item',
    example: {
      before: `items.map(item => (
  <div>{item.name}</div>
))`,
      after: `items.map(item => (
  <div key={item.id}>{item.name}</div>
))`,
    },
    autoFixable: false,
    complexity: 'low',
    estimatedTime: '5 minutes',
    benefits: [
      'Better rendering performance',
      'Prevents component state bugs',
      'Proper React reconciliation',
    ],
    breakingChanges: [],
    tags: ['react', 'performance', 'keys', 'lists'],
  },
  {
    id: 'react-memo-optimization',
    name: 'Add React.memo for expensive components',
    category: 'performance',
    language: 'javascript',
    framework: 'react',
    detector: (code) => {
      return /export\s+(default\s+)?function\s+\w+/.test(code) &&
             !/React\.memo|memo\(/.test(code) &&
             /props/.test(code)
    },
    description: 'Wrap components with React.memo to prevent unnecessary re-renders',
    problem: 'Components re-render even when props haven\'t changed',
    solution: 'Use React.memo to memoize component',
    example: {
      before: `function ExpensiveComponent({ data }) {
  // Expensive calculations
  return <div>{data}</div>;
}`,
      after: `import { memo } from 'react';

const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Expensive calculations
  return <div>{data}</div>;
});`,
    },
    autoFixable: false,
    complexity: 'low',
    estimatedTime: '5 minutes',
    benefits: [
      'Prevents unnecessary re-renders',
      'Better performance',
      'Reduced CPU usage',
    ],
    breakingChanges: [],
    tags: ['react', 'performance', 'memo', 'optimization'],
  },
  {
    id: 'react-usecallback',
    name: 'Add useCallback for function props',
    category: 'performance',
    language: 'javascript',
    framework: 'react',
    detector: (code) => {
      return /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{/.test(code) &&
             !/useCallback/.test(code)
    },
    description: 'Wrap callback functions with useCallback',
    problem: 'New function instances on every render cause child re-renders',
    solution: 'Use useCallback to memoize functions',
    example: {
      before: `function Parent() {
  const handleClick = () => {
    console.log('clicked');
  };
  return <Child onClick={handleClick} />;
}`,
      after: `import { useCallback } from 'react';

function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  return <Child onClick={handleClick} />;
}`,
    },
    autoFixable: false,
    complexity: 'low',
    estimatedTime: '5 minutes',
    benefits: [
      'Stable function references',
      'Prevents child re-renders',
      'Better performance with memo',
    ],
    breakingChanges: [],
    tags: ['react', 'hooks', 'useCallback', 'performance'],
  },
  {
    id: 'react-usememo',
    name: 'Add useMemo for expensive calculations',
    category: 'performance',
    language: 'javascript',
    framework: 'react',
    detector: (code) => {
      return /const\s+\w+\s*=\s*\w+\.(filter|map|reduce|sort)/.test(code) &&
             !/useMemo/.test(code)
    },
    description: 'Wrap expensive calculations with useMemo',
    problem: 'Expensive calculations run on every render',
    solution: 'Use useMemo to cache calculation results',
    example: {
      before: `function List({ items }) {
  const sortedItems = items.sort((a, b) => a.value - b.value);
  return <div>{sortedItems.map(item => <Item key={item.id} {...item} />)}</div>;
}`,
      after: `import { useMemo } from 'react';

function List({ items }) {
  const sortedItems = useMemo(
    () => items.sort((a, b) => a.value - b.value),
    [items]
  );
  return <div>{sortedItems.map(item => <Item key={item.id} {...item} />)}</div>;
}`,
    },
    autoFixable: false,
    complexity: 'low',
    estimatedTime: '10 minutes',
    benefits: [
      'Caches expensive calculations',
      'Better performance',
      'Reduces CPU usage',
    ],
    breakingChanges: [],
    tags: ['react', 'hooks', 'useMemo', 'performance'],
  },
  {
    id: 'react-fragment-shorthand',
    name: 'React.Fragment to shorthand',
    category: 'style',
    language: 'javascript',
    framework: 'react',
    detector: /<React\.Fragment>/,
    description: 'Use fragment shorthand syntax',
    problem: 'React.Fragment is verbose',
    solution: 'Use <> </> shorthand',
    example: {
      before: `return (
  <React.Fragment>
    <div>First</div>
    <div>Second</div>
  </React.Fragment>
);`,
      after: `return (
  <>
    <div>First</div>
    <div>Second</div>
  </>
);`,
    },
    autoFixable: true,
    complexity: 'low',
    estimatedTime: '2 minutes',
    benefits: [
      'More concise',
      'Cleaner JSX',
      'Less typing',
    ],
    breakingChanges: [],
    tags: ['react', 'jsx', 'fragments', 'style'],
  },
  {
    id: 'react-default-props',
    name: 'defaultProps to default parameters',
    category: 'modernization',
    language: 'javascript',
    framework: 'react',
    detector: /\.defaultProps\s*=/,
    description: 'Replace defaultProps with default parameters',
    problem: 'defaultProps is legacy and verbose',
    solution: 'Use ES6 default parameters',
    example: {
      before: `function Button({ label, variant }) {
  return <button className={variant}>{label}</button>;
}

Button.defaultProps = {
  variant: 'primary',
};`,
      after: `function Button({ label, variant = 'primary' }) {
  return <button className={variant}>{label}</button>;
}`,
    },
    autoFixable: true,
    complexity: 'low',
    estimatedTime: '5 minutes',
    benefits: [
      'More concise',
      'Better TypeScript support',
      'Standard JavaScript',
    ],
    breakingChanges: [],
    tags: ['react', 'props', 'default-props', 'es6'],
  },
]
