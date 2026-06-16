"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Brain, 
  Upload, 
  Layers, 
  BookOpen, 
  MessageSquare, 
  Calendar, 
  BarChart3, 
  Sparkles, 
  Check, 
  ChevronDown, 
  ArrowRight, 
  Shield, 
  Zap, 
  Play
} from 'lucide-react';

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const features = [
    {
      icon: Upload,
      title: "Smart Document Processing",
      description: "Upload PDFs, DOCX, or raw notes. Our system automatically extracts, structures, and embeds the text for instant AI reference.",
      color: "text-indigo-400"
    },
    {
      icon: Layers,
      title: "AI Study Kits",
      description: "Get comprehensive summaries, chapter breakdowns, key takeaways, and lists of critical formulas generated in seconds.",
      color: "text-pink-400"
    },
    {
      icon: Brain,
      title: "3D Flashcards",
      description: "Study with interactive 3D flip-cards using spaced repetition algorithms. Track completion and shuffle cards to test your memory.",
      color: "text-purple-400"
    },
    {
      icon: BookOpen,
      title: "Adaptive Quiz Generator",
      description: "Generate 10-question multiple choice quizzes at your preferred difficulty. Get detailed explanations and automatic grading.",
      color: "text-emerald-400"
    },
    {
      icon: MessageSquare,
      title: "Context-Aware AI Tutor",
      description: "Chat with an AI tutor that is locked only to your uploaded materials. Get exact answers with precise page and source citations.",
      color: "text-amber-400"
    },
    {
      icon: Calendar,
      title: "Intelligent Study Planner",
      description: "Enter your exam date and study availability. Receive a structured calendar containing daily topics, revisions, and mock test dates.",
      color: "text-cyan-400"
    }
  ];

  const faqs = [
    {
      question: "How does the AI Tutor read my uploaded files?",
      answer: "When you upload a PDF, DOCX, or text file, our system parses the text and breaks it into smaller chunks. These chunks are embedded into a vector space using a PostgreSQL pgvector database. The AI Tutor uses these vector embeddings to search and retrieve only relevant contents from your file to formulate its answers."
    },
    {
      question: "Is there a limit to how many files I can upload?",
      answer: "In our Free Tier, you can upload up to 3 documents (up to 10MB each) and generate study kits, quizzes, and flashcards for them. The Pro Tier allows unlimited uploads, larger file sizes, and priority access to faster AI models."
    },
    {
      question: "Can I use StudySprint AI on my mobile phone?",
      answer: "Absolutely! StudySprint AI is built to be fully responsive. All tools, flashcards, study planners, and tutor chats are optimized for desktop, tablet, and mobile browsers so you can study on the go."
    },
    {
      question: "Is my personal study data private?",
      answer: "Yes, privacy is our priority. All documents, flashcards, and tutor chats are isolated and protected by Supabase Row-Level Security (RLS) policies. Only you can access your uploads and generated study kits."
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[30%] left-[20%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute -top-[20%] right-[10%] w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between border-b border-white/5 bg-zinc-950/20 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-wider">
          <Brain className="h-8 w-8 text-indigo-500 animate-pulse" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-500">StudySprint AI</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Log In
          </Link>
          <Link href="/auth/signup" className="bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-indigo-500/10 transition-all hover:scale-[1.02]">
            Get Started Free
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-400 hover:text-white"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden relative z-10 border-b border-white/5 bg-zinc-950/90 px-4 py-6 flex flex-col gap-4">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 font-medium text-sm">Features</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 font-medium text-sm">Pricing</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 font-medium text-sm">FAQ</a>
          <div className="h-[1px] bg-white/5 my-2" />
          <Link href="/auth/login" className="text-center text-zinc-300 font-medium text-sm py-2">
            Log In
          </Link>
          <Link href="/auth/signup" className="text-center bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl">
            Get Started Free
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-6 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5" /> Powered by Gemini 2.5 Flash
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15] mb-6">
          Supercharge Your Study Sessions with{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-pink-500 to-purple-400">
            Contextual AI
          </span>
        </h1>

        <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Convert PDFs, textbook chapters, and lecture notes into customized study kits, 3D interactive flashcards, graded quizzes, and study planners. Study smarter with your private AI Tutor.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
          <Link href="/auth/signup" className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold px-8 py-4 rounded-full shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
            Start Studying Free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/auth/login" className="w-full sm:w-auto border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white font-semibold px-8 py-4 rounded-full flex items-center justify-center gap-2 transition-all">
            Open Dashboard
          </Link>
        </div>

        {/* Dashboard Mockup Showcase */}
        <div className="relative max-w-5xl mx-auto rounded-2xl border border-white/10 bg-zinc-900/60 p-2 shadow-2xl backdrop-blur-sm overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-indigo-500 via-pink-500 to-purple-500" />
          <div className="bg-zinc-950/80 rounded-xl p-4 sm:p-6 overflow-hidden">
            {/* Window controls */}
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="h-5 w-[1px] bg-white/10 mx-2" />
              <span className="text-xs text-zinc-500 font-mono tracking-wider">STUDY_WORKSPACE.SYS</span>
            </div>

            {/* Mock Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="md:col-span-2 p-5 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-between min-h-[200px]">
                <div>
                  <div className="text-xs uppercase font-bold tracking-widest text-indigo-400 mb-1">Active Progress</div>
                  <h4 className="text-lg font-bold text-white mb-2">Modern Computer Networks</h4>
                  <p className="text-xs text-zinc-400 max-w-md">3/3 modules summarized. 45 spaced flashcards ready. AI Tutor contains 1,200 contextual citation tokens.</p>
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <div className="flex-1 bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full w-[82%]" />
                  </div>
                  <span className="text-xs font-bold text-indigo-400">82% Readiness</span>
                </div>
              </div>

              <div className="p-5 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="text-xs uppercase font-bold tracking-widest text-pink-400 mb-2">Quick Commands</div>
                  <div className="space-y-2">
                    <div className="text-xs bg-white/5 px-3 py-2 rounded-lg border border-white/5 flex items-center justify-between">
                      <span>📄 Summarize Chapter 2</span>
                      <span className="text-[10px] text-pink-400 font-bold">READY</span>
                    </div>
                    <div className="text-xs bg-white/5 px-3 py-2 rounded-lg border border-white/5 flex items-center justify-between">
                      <span>🧠 Spaced Recall Quiz</span>
                      <span className="text-[10px] text-indigo-400 font-bold">NEW</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 italic mt-4 text-center">Locked to active PDFs</div>
              </div>
            </div>

            {/* Interactive Overlay Preview */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Link href="/auth/signup" className="bg-white text-black text-sm font-bold px-6 py-3 rounded-full flex items-center gap-2 hover:scale-105 transition-all">
                <Play className="h-4 w-4 fill-black" /> Enter App Demo Workspace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Complete Study Toolkit</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">Everything you need to streamline research, notes, revisions, and test prep.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all hover:scale-[1.01] flex flex-col gap-4">
                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${feature.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">Start studying for free, and upgrade whenever you need more horsepower.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="p-8 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Sprint Basic</h3>
              <p className="text-zinc-400 text-sm mb-6">Perfect for self-learners and single exam preparation.</p>
              <div className="text-4xl font-extrabold text-white mb-6">$0 <span className="text-sm text-zinc-500 font-normal">/ month</span></div>
              <ul className="space-y-3 mb-8">
                {[
                  "Upload up to 3 documents",
                  "Auto-generate PDF summary outlines",
                  "Create up to 45 interactive flashcards",
                  "10-question practice quizzes",
                  "Context-aware AI tutor chat",
                  "Spaced-repetition card tracker"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/auth/signup" className="w-full text-center py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors">
              Get Started Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="p-8 bg-zinc-900/80 rounded-2xl border border-indigo-500/30 relative flex flex-col justify-between">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Sprint Pro</h3>
              <p className="text-zinc-400 text-sm mb-6">Designed for students handling multiple heavy modules and courses.</p>
              <div className="text-4xl font-extrabold text-white mb-6">$9.99 <span className="text-sm text-zinc-500 font-normal">/ month</span></div>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited document uploads",
                  "Unlimited summaries & outlines",
                  "Unlimited AI 3D flashcards",
                  "Unlimited advanced quizzes (Easy/Med/Hard)",
                  "Priority server queue (3x faster processing)",
                  "Customized daily calendar study planner",
                  "Interactive performance & mastery analytics"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/auth/signup" className="w-full text-center py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-lg shadow-indigo-500/15 transition-all">
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Frequently Asked Questions</h2>
          <p className="text-zinc-400">Clear doubts about document limits, AI tutor retrieval, and platform pricing.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div key={index} className="bg-white/5 rounded-xl border border-white/5 overflow-hidden transition-all">
                <button 
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center font-semibold text-white hover:bg-white/5 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-185' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-zinc-400 text-sm leading-relaxed border-t border-white/5 pt-4 bg-black/10">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/5 text-center">
        <div className="bg-gradient-to-br from-indigo-650/30 to-pink-650/30 rounded-3xl p-8 sm:p-12 border border-white/5 relative overflow-hidden max-w-5xl mx-auto">
          {/* Decorative glows */}
          <div className="absolute -bottom-[50%] -left-[20%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[80px]" />
          <div className="absolute -top-[50%] -right-[20%] w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[80px]" />

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4 relative z-10">
            Sprint Through Your Exams Today
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto mb-8 relative z-10 text-sm sm:text-base">
            Upload your files, set your study schedules, and let our custom AI tutor clarify your conceptual blockers.
          </p>
          <div className="relative z-10">
            <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-full hover:scale-102 transition-all">
              Sign Up Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <footer className="mt-16 text-center text-xs text-zinc-650 border-t border-white/5 pt-8">
          <p>© {new Date().getFullYear()} StudySprint AI. All rights reserved. Built using Next.js 15, Gemini AI, & Supabase.</p>
        </footer>
      </section>
    </div>
  );
}
