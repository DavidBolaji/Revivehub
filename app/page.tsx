import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-4">
          ReviveHub 01
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          AI-Powered Code Modernization Platform
        </p>
        <div className="flex justify-center">
          <Link 
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  )
}
