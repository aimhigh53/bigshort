'use client'

import { Home, Heart, Bell, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'dashboard' | 'favorites' | 'notifications' | 'settings'

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs = [
  { id: 'dashboard' as const, label: '대시보드', icon: Home },
  { id: 'favorites' as const, label: '관심물건', icon: Heart },
  { id: 'notifications' as const, label: '알림', icon: Bell },
  { id: 'settings' as const, label: '설정', icon: Settings },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center py-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors',
              activeTab === id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
