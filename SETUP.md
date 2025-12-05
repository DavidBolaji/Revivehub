# ReviveHub Setup Guide

## ✅ Setup Complete!

Your Next.js 14 project with TypeScript is ready for the Kiroween hackathon.

## What's Been Created

### Core Configuration
- ✅ Next.js 14 with App Router
- ✅ TypeScript with strict mode enabled
- ✅ Tailwind CSS configured
- ✅ shadcn/ui setup (components.json)
- ✅ ESLint + Prettier
- ✅ Environment variables template

### Project Structure
```
revivehub/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with Inter font
│   ├── page.tsx           # Home page
│   └── globals.css        # Tailwind + shadcn/ui styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components (Button)
│   └── Header.tsx        # Navigation header
├── lib/                  # Utilities
│   └── utils.ts          # cn() utility for class merging
├── hooks/                # Custom React hooks
│   ├── useAnalysis.ts    # Code analysis hook
│   └── useRepository.ts  # GitHub repo hook
├── services/             # API services
│   ├── github.ts         # GitHub API client
│   └── ai.ts             # Claude AI service
├── transformers/         # Code transformation engines
│   └── index.ts          # Core transformer with rules
├── patterns/             # Pattern detection rules
│   ├── javascript.ts     # JS modernization patterns
│   └── typescript.ts     # TS best practices
└── types/                # TypeScript types
    └── index.ts          # Core type definitions
```

## Next Steps

### 1. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
- `ANTHROPIC_API_KEY` - Get from https://console.anthropic.com/
- `GITHUB_TOKEN` - Create at https://github.com/settings/tokens
- `NEXTAUTH_URL` - Set to `http://localhost:3000` for development
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `GITHUB_ID` - GitHub OAuth App Client ID (see [Authentication Quick Start](./docs/AUTHENTICATION_QUICKSTART.md))
- `GITHUB_SECRET` - GitHub OAuth App Client Secret

**For GitHub OAuth setup**, follow the [Authentication Quick Start Guide](./docs/AUTHENTICATION_QUICKSTART.md) (takes 5 minutes).

### 2. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 3. Add More shadcn/ui Components

```bash
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add tabs
npx shadcn@latest add toast
```

### 4. Create API Routes

Create these files as needed:
- `app/api/analyze/route.ts` - Code analysis endpoint
- `app/api/repository/route.ts` - GitHub repo endpoint
- `app/api/transform/route.ts` - Code transformation endpoint

### 5. Build Features

Priority features to implement:
1. Repository upload/import UI
2. Code analysis dashboard
3. AI-powered recommendations
4. Pattern-based transformations
5. Results export

## Available Scripts

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
```

## TypeScript Configuration

Strict mode is enabled with:
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `strictNullChecks: true`

## Tailwind + shadcn/ui

The project uses:
- Tailwind CSS 3.4
- shadcn/ui components (Radix UI primitives)
- CSS variables for theming
- Dark mode support (class-based)

## Services Ready to Use

### GitHub Service
```typescript
import { GitHubService } from '@/services/github'

const github = new GitHubService()
const repo = await github.getRepository('owner', 'repo')
const file = await github.getFileContent('owner', 'repo', 'path/to/file.js')
```

### AI Service
```typescript
import { AIService } from '@/services/ai'

const ai = new AIService()
const analysis = await ai.analyzeCode({
  code: 'var x = 1;',
  language: 'javascript',
})
```

### Code Transformer
```typescript
import { CodeTransformer, defaultRules } from '@/transformers'

const transformer = new CodeTransformer()
defaultRules.forEach(rule => transformer.addRule(rule))
const modernCode = transformer.transform(legacyCode, 'javascript')
```

## Progress Tracking

Log your sessions:
```bash
# CMD
log-kiro-session.bat

# PowerShell
.\log-kiro-session.ps1
```

Files:
- `KIRO_USAGE.md` - Kiro feature usage
- `PROGRESS.md` - Daily checklists
- `PROJECT_README.md` - Full docs

## Troubleshooting

### TypeScript Errors in IDE
If you see TypeScript errors, reload the TypeScript server:
- VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
- Or restart your IDE

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

## Authentication

ReviveHub uses GitHub OAuth for user authentication. See:
- [Authentication Quick Start](./docs/AUTHENTICATION_QUICKSTART.md) - 5-minute setup guide
- [Complete Authentication Guide](./docs/AUTHENTICATION.md) - Full documentation with troubleshooting

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Anthropic API](https://docs.anthropic.com/)
- [GitHub API](https://docs.github.com/en/rest)
- [NextAuth.js](https://next-auth.js.org/)

## Ready to Build! 🚀

Your ReviveHub project is fully configured and ready for the hackathon. Start by:
1. Setting up your API keys in `.env`
2. Running `npm run dev`
3. Building your first feature
4. Logging your progress with the session scripts

Good luck with Kiroween! 🎃
