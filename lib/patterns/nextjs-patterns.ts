/**
 * Next.js-specific pattern detection rules
 */

import type { PatternRule } from './rules'

export const NEXTJS_PATTERNS: PatternRule[] = [
  {
    id: 'nextjs-pages-to-app-router',
    name: 'Pages Router to App Router',
    category: 'modernization',
    language: 'javascript',
    framework: 'nextjs',
    detector: (code) => {
      return /export\s+(default\s+)?function\s+\w+\s*\([^)]*\)\s*{/.test(code) &&
             /getServerSideProps|getStaticProps|getStaticPaths/.test(code)
    },
    description: 'Migrate from Pages Router to App Router',
    problem: 'Pages Router is legacy and lacks modern features',
    solution: 'Use App Router with Server Components and new data fetching',
    example: {
      before: `// pages/posts/[id].js
export default function Post({ post }) {
  return <div>{post.title}</div>;
}

export async function getServerSideProps({ params }) {
  const post = await fetch(\`/api/posts/\${params.id}\`).then(r => r.json());
  return { props: { post } };
}`,
      after: `// app/posts/[id]/page.tsx
async function getPost(id: string) {
  const res = await fetch(\`/api/posts/\${id}\`, { cache: 'no-store' });
  return res.json();
}

export default async function Post({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  return <div>{post.title}</div>;
}`,
    },
    autoFixable: false,
    complexity: 'high',
    estimatedTime: '1-3 hours per page',
    benefits: [
      'Server Components by default',
      'Better streaming and suspense',
      'Improved data fetching',
      'Nested layouts',
      'Better TypeScript support',
    ],
    breakingChanges: [
      'File structure changes (pages/ to app/)',
      'Different data fetching API',
      'No getServerSideProps/getStaticProps',
      'Different routing conventions',
    ],
    tags: ['nextjs', 'app-router', 'pages-router', 'migration'],
  },
  {
    id: 'nextjs-image-optimization',
    name: 'img to next/image',
    category: 'performance',
    language: 'javascript',
    framework: 'nextjs',
    detector: /<img\s+/,
    description: 'Replace img tags with Next.js Image component',
    problem: 'Regular img tags don\'t optimize images',
    solution: 'Use next/image for automatic optimization',
    example: {
      before: `<img src="/photo.jpg" alt="Photo" width="500" height="300" />`,
      after: `import Image from 'next/image';

<Image src="/photo.jpg" alt="Photo" width={500} height={300} />`,
    },
    autoFixable: false,
    complexity: 'low',
    estimatedTime: '10-15 minutes',
    benefits: [
      'Automatic image optimization',
      'Lazy loading by default',
      'Prevents layout shift',
      'WebP/AVIF format support',
    ],
    breakingChanges: [
      'Requires width and height props',
      'Different styling approach',
    ],
    tags: ['nextjs', 'images', 'performance', 'optimization'],
  },
  {
    id: 'nextjs-link-optimization',
    name: 'a to next/link',
    category: 'performance',
    language: 'javascript',
    framework: 'nextjs',
    detector: /<a\s+href=["'][/]/,
    description: 'Replace anchor tags with Next.js Link component',
    problem: 'Regular anchor tags cause full page reloads',
    solution: 'Use next/link for client-side navigation',
    example: {
      before: `<a href="/about">About</a>`,
      after: `import Link from 'next/link';

<Link href="/about">About</Link>`,
    },
    autoFixable: true,
    complexity: 'low',
    estimatedTime: '5 minutes',
    benefits: [
      'Client-side navigation',
      'Prefetching',
      'No full page reload',
      'Better performance',
    ],
    breakingChanges: [],
    tags: ['nextjs', 'navigation', 'performance', 'links'],
  },
  {
    id: 'nextjs-api-routes-to-route-handlers',
    name: 'API Routes to Route Handlers',
    category: 'modernization',
    language: 'javascript',
    framework: 'nextjs',
    detector: /export\s+default\s+function\s+handler\s*\(\s*req\s*,\s*res\s*\)/,
    description: 'Migrate API routes to App Router route handlers',
    problem: 'Old API routes use Node.js request/response',
    solution: 'Use Web standard Request/Response',
    example: {
      before: `// pages/api/users.js
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ users: [] });
  }
}`,
      after: `// app/api/users/route.ts
export async function GET(request: Request) {
  return Response.json({ users: [] });
}`,
    },
    autoFixable: false,
    complexity: 'medium',
    estimatedTime: '20-30 minutes per route',
    benefits: [
      'Web standard APIs',
      'Better TypeScript support',
      'Streaming responses',
      'Edge runtime support',
    ],
    breakingChanges: [
      'Different request/response API',
      'File location changes',
      'Named exports instead of default',
    ],
    tags: ['nextjs', 'api-routes', 'route-handlers', 'app-router'],
  },
  {
    id: 'nextjs-metadata-api',
    name: 'Head to Metadata API',
    category: 'modernization',
    language: 'javascript',
    framework: 'nextjs',
    detector: /import\s+Head\s+from\s+['"]next\/head['"]/,
    description: 'Replace next/head with Metadata API',
    problem: 'next/head is client-side and less efficient',
    solution: 'Use Metadata API for server-side metadata',
    example: {
      before: `import Head from 'next/head';

export default function Page() {
  return (
    <>
      <Head>
        <title>My Page</title>
        <meta name="description" content="Page description" />
      </Head>
      <div>Content</div>
    </>
  );
}`,
      after: `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Page',
  description: 'Page description',
};

export default function Page() {
  return <div>Content</div>;
}`,
    },
    autoFixable: false,
    complexity: 'low',
    estimatedTime: '10 minutes',
    benefits: [
      'Server-side metadata',
      'Better SEO',
      'Type-safe metadata',
      'Automatic deduplication',
    ],
    breakingChanges: [
      'Requires App Router',
      'Different API',
    ],
    tags: ['nextjs', 'metadata', 'seo', 'app-router'],
  },
  {
    id: 'nextjs-server-actions',
    name: 'API Routes to Server Actions',
    category: 'modernization',
    language: 'javascript',
    framework: 'nextjs',
    detector: (code) => {
      return /fetch\s*\(\s*['"]\/api\//.test(code) &&
             /<form/.test(code)
    },
    description: 'Replace form API calls with Server Actions',
    problem: 'Separate API routes add complexity for form handling',
    solution: 'Use Server Actions for direct server mutations',
    example: {
      before: `// Component
async function handleSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  await fetch('/api/submit', {
    method: 'POST',
    body: formData,
  });
}

return <form onSubmit={handleSubmit}>...</form>;

// pages/api/submit.js
export default async function handler(req, res) {
  const data = req.body;
  await saveData(data);
  res.json({ success: true });
}`,
      after: `// actions.ts
'use server'

export async function submitForm(formData: FormData) {
  const data = Object.fromEntries(formData);
  await saveData(data);
  return { success: true };
}

// Component
import { submitForm } from './actions';

return <form action={submitForm}>...</form>;`,
    },
    autoFixable: false,
    complexity: 'medium',
    estimatedTime: '30-45 minutes',
    benefits: [
      'No separate API routes needed',
      'Progressive enhancement',
      'Better type safety',
      'Simpler code',
    ],
    breakingChanges: [
      'Requires App Router',
      'Different form handling',
    ],
    tags: ['nextjs', 'server-actions', 'forms', 'app-router'],
  },
]
