import Link from 'next/link'

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          ReviveHub
        </Link>
        <nav className="flex gap-6">
          <Link href="/analyze" className="hover:text-primary">
            Analyze
          </Link>
          <Link href="/dashboard" className="hover:text-primary">
            Dashboard
          </Link>
          <Link href="/docs" className="hover:text-primary">
            Docs
          </Link>
        </nav>
      </div>
    </header>
  )
}
