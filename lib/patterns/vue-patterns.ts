/**
 * Vue-specific pattern detection rules
 */

import type { PatternRule } from './rules'

export const VUE_PATTERNS: PatternRule[] = [
  {
    id: 'vue-options-to-composition',
    name: 'Options API to Composition API',
    category: 'modernization',
    language: 'javascript',
    framework: 'vue',
    detector: /export\s+default\s+{[\s\S]*data\s*\(\s*\)\s*{/,
    description: 'Migrate from Options API to Composition API',
    problem: 'Options API has limited code reuse and organization',
    solution: 'Use Composition API with setup() for better logic composition',
    example: {
      before: `export default {
  data() {
    return {
      count: 0,
      message: 'Hello'
    }
  },
  computed: {
    doubleCount() {
      return this.count * 2;
    }
  },
  methods: {
    increment() {
      this.count++;
    }
  }
}`,
      after: `import { ref, computed } from 'vue';

export default {
  setup() {
    const count = ref(0);
    const message = ref('Hello');
    
    const doubleCount = computed(() => count.value * 2);
    
    const increment = () => {
      count.value++;
    };
    
    return { count, message, doubleCount, increment };
  }
}`,
    },
    autoFixable: false,
    complexity: 'high',
    estimatedTime: '1-2 hours per component',
    benefits: [
      'Better code organization',
      'Easier logic reuse with composables',
      'Better TypeScript support',
      'Tree-shakeable',
    ],
    breakingChanges: [
      'this context no longer available',
      'Different reactivity system',
      'Lifecycle hooks renamed',
    ],
    tags: ['vue', 'composition-api', 'options-api', 'vue3'],
  },
  {
    id: 'vue-script-setup',
    name: 'setup() to <script setup>',
    category: 'modernization',
    language: 'javascript',
    framework: 'vue',
    detector: /setup\s*\(\s*\)\s*{/,
    description: 'Use <script setup> syntax sugar',
    problem: 'setup() requires explicit return statement',
    solution: 'Use <script setup> for more concise code',
    example: {
      before: `<script>
import { ref } from 'vue';

export default {
  setup() {
    const count = ref(0);
    const increment = () => count.value++;
    return { count, increment };
  }
}
</script>`,
      after: `<script setup>
import { ref } from 'vue';

const count = ref(0);
const increment = () => count.value++;
</script>`,
    },
    autoFixable: false,
    complexity: 'low',
    estimatedTime: '10 minutes',
    benefits: [
      'Less boilerplate',
      'Better performance',
      'Automatic component registration',
      'Better TypeScript inference',
    ],
    breakingChanges: [
      'No explicit return needed',
      'Different component registration',
    ],
    tags: ['vue', 'script-setup', 'vue3', 'composition-api'],
  },
  {
    id: 'vue-v-model-v3',
    name: 'v-model to Vue 3 syntax',
    category: 'modernization',
    language: 'javascript',
    framework: 'vue',
    detector: /this\.\$emit\s*\(\s*['"]input['"]/,
    description: 'Update v-model to Vue 3 syntax',
    problem: 'Vue 2 v-model uses "input" event',
    solution: 'Vue 3 v-model uses "update:modelValue" event',
    example: {
      before: `// Vue 2
props: ['value'],
methods: {
  updateValue(newValue) {
    this.$emit('input', newValue);
  }
}`,
      after: `// Vue 3
props: ['modelValue'],
emits: ['update:modelValue'],
methods: {
  updateValue(newValue) {
    this.$emit('update:modelValue', newValue);
  }
}`,
    },
    autoFixable: false,
    complexity: 'medium',
    estimatedTime: '20-30 minutes',
    benefits: [
      'Multiple v-model support',
      'Better naming conventions',
      'Explicit emits declaration',
    ],
    breakingChanges: [
      'Prop name changes from "value" to "modelValue"',
      'Event name changes from "input" to "update:modelValue"',
    ],
    tags: ['vue', 'v-model', 'vue3', 'migration'],
  },
  {
    id: 'vue-filters-to-methods',
    name: 'Filters to Methods/Computed',
    category: 'modernization',
    language: 'javascript',
    framework: 'vue',
    detector: /filters\s*:\s*{/,
    description: 'Replace filters with methods or computed properties',
    problem: 'Filters are removed in Vue 3',
    solution: 'Use methods or computed properties instead',
    example: {
      before: `<template>
  <div>{{ price | currency }}</div>
</template>

<script>
export default {
  filters: {
    currency(value) {
      return '$' + value.toFixed(2);
    }
  }
}
</script>`,
      after: `<template>
  <div>{{ formatCurrency(price) }}</div>
</template>

<script setup>
const formatCurrency = (value) => {
  return '$' + value.toFixed(2);
};
</script>`,
    },
    autoFixable: false,
    complexity: 'low',
    estimatedTime: '15 minutes',
    benefits: [
      'More explicit code',
      'Better TypeScript support',
      'Easier to test',
    ],
    breakingChanges: [
      'Template syntax changes',
      'No global filters',
    ],
    tags: ['vue', 'filters', 'vue3', 'migration'],
  },
  {
    id: 'vue-event-bus-to-provide-inject',
    name: 'Event Bus to Provide/Inject',
    category: 'modernization',
    language: 'javascript',
    framework: 'vue',
    detector: /\$bus|\$emit.*\$on/,
    description: 'Replace event bus with provide/inject or composables',
    problem: 'Global event bus is hard to track and debug',
    solution: 'Use provide/inject or composables for state management',
    example: {
      before: `// Vue 2 Event Bus
// main.js
Vue.prototype.$bus = new Vue();

// Component A
this.$bus.$emit('event', data);

// Component B
this.$bus.$on('event', (data) => {
  console.log(data);
});`,
      after: `// Vue 3 Composable
// useEventBus.js
import { ref } from 'vue';

export function useEventBus() {
  const listeners = ref(new Map());
  
  const emit = (event, data) => {
    listeners.value.get(event)?.(data);
  };
  
  const on = (event, callback) => {
    listeners.value.set(event, callback);
  };
  
  return { emit, on };
}

// Or use provide/inject
provide('eventBus', { emit, on });`,
    },
    autoFixable: false,
    complexity: 'high',
    estimatedTime: '1-2 hours',
    benefits: [
      'Better type safety',
      'Easier to track dependencies',
      'More testable',
      'Better performance',
    ],
    breakingChanges: [
      'Complete event system rewrite',
      'Different API',
    ],
    tags: ['vue', 'event-bus', 'provide-inject', 'vue3'],
  },
]
