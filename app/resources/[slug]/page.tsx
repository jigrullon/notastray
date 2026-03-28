import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, AlertTriangle, Lightbulb, Info, Calendar, Clock } from 'lucide-react'
import { getArticleBySlug, getAllSlugs } from '@/lib/articles'
import type { ArticleSection } from '@/lib/articles'

export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: 'Article Not Found' }
  return {
    title: `${article.title} | NotAStray Resources`,
    description: article.excerpt,
  }
}

function SectionRenderer({ section }: { section: ArticleSection }) {
  switch (section.type) {
    case 'heading':
      return <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4">{section.content}</h2>
    case 'paragraph':
      return <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{section.content}</p>
    case 'list':
      return (
        <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 dark:text-gray-300">
          {section.items?.map((item, i) => <li key={i} className="leading-relaxed">{item}</li>)}
        </ul>
      )
    case 'numbered-list':
      return (
        <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700 dark:text-gray-300">
          {section.items?.map((item, i) => <li key={i} className="leading-relaxed">{item}</li>)}
        </ol>
      )
    case 'callout': {
      const variants = {
        tip: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-200', icon: <Lightbulb className="w-5 h-5" /> },
        warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-200', icon: <AlertTriangle className="w-5 h-5" /> },
        info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-200', icon: <Info className="w-5 h-5" /> },
      }
      const v = variants[section.variant || 'info']
      return (
        <div className={`${v.bg} ${v.border} ${v.text} border rounded-lg p-4 mb-4 flex items-start gap-3`}>
          <span className="flex-shrink-0 mt-0.5">{v.icon}</span>
          <p className="leading-relaxed">{section.content}</p>
        </div>
      )
    }
    default:
      return null
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const categoryColors: Record<string, string> = {
    Safety: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    Setup: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    Emergency: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
    Travel: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
    Education: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200',
    Community: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200',
    Prevention: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    Family: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200',
  }

  return (
    <div className="bg-transparent">
      {/* Hero */}
      <section className="bg-gradient-to-b from-gray-50 to-brand-cream dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/resources"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resources
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[article.category] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
              {article.category}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {article.readTime}
            </span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">{article.title}</h1>

          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 gap-4">
            <span>By {article.author}</span>
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(article.publishDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </section>

      {/* Article Body */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {article.sections.length > 0 ? (
            <div className="prose-container">
              {article.sections.map((section, index) => (
                <SectionRenderer key={index} section={section} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">This article is coming soon.</p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Ready to protect your pet?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            A NotAStray smart tag gives anyone who finds your pet instant access to your contact information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/shop"
              className="bg-primary-600 hover:bg-primary-400 text-white font-medium py-3 px-8 rounded-lg transition-colors"
            >
              Get Your Tag
            </Link>
            <Link
              href="/activate"
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium py-3 px-8 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Activate a Tag
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
