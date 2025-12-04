import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardHeader } from '@/components/layout/Header'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      {/* Spooky background effects */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none opacity-10" />
      
      <div className="relative flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <DashboardHeader user={session.user} />
          
          {/* Page content with scroll */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-6 xl:px-8 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
