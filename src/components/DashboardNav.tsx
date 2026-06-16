"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  BookOpen, 
  Brain, 
  Calendar, 
  BarChart3, 
  MessageSquare, 
  LogOut, 
  FileText, 
  Layers, 
  Home, 
  Menu, 
  X,
  User
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Documents', href: '/dashboard/documents', icon: FileText },
    { name: 'Study Kit', href: '/dashboard/kits', icon: Layers },
    { name: 'Flashcards', href: '/dashboard/flashcards', icon: Brain },
    { name: 'Quiz Generator', href: '/dashboard/quiz', icon: BookOpen },
    { name: 'AI Tutor', href: '/dashboard/tutor', icon: MessageSquare },
    { name: 'Study Planner', href: '/dashboard/planner', icon: Calendar },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 text-white bg-zinc-950 md:hidden">
        <div className="flex items-center gap-2 font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">
          <Brain className="h-6 w-6 stroke-indigo-500" />
          StudySprint AI
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-400 hover:text-white">
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/5 bg-zinc-950/90 text-zinc-400 backdrop-blur-md transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:block h-screen flex flex-col justify-between`}>
        <div className="px-4 py-6">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 mb-8 text-xl font-bold text-white tracking-wider">
            <Brain className="h-8 w-8 text-indigo-500 animate-pulse" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-500">StudySprint AI</span>
          </Link>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]' 
                      : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-xl transition-all"
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
