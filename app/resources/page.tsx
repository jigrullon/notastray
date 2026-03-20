'use client'

import Link from 'next/link'
import { BookOpen, Shield, Heart, Zap, Calendar, ArrowRight, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { articles } from '@/lib/articles'

const categories = [
  { name: "All", count: articles.length },
  { name: "Safety", count: articles.filter(a => a.category === "Safety").length },
  { name: "Setup", count: articles.filter(a => a.category === "Setup").length },
  { name: "Emergency", count: articles.filter(a => a.category === "Emergency").length },
  { name: "Travel", count: articles.filter(a => a.category === "Travel").length },
  { name: "Education", count: articles.filter(a => a.category === "Education").length },
]

export default function ResourcesPage() {
  const { user } = useAuth()
  const featuredArticles = articles.filter(article => article.featured)
  const regularArticles = articles.filter(article => !article.featured)

  return (
    <div className="bg-transparent">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-brand-cream dark:from-gray-900 dark:to-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href={user ? '/dashboard' : '/'}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Pet Safety Resources
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Expert tips, guides, and resources to keep your pets safe and help you get the most out of your NotAStray tag
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/activate" className="group bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg p-6 transition-colors">
              <div className="flex items-center mb-3">
                <Zap className="w-6 h-6 text-primary-600 mr-2" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Activate Your Tag</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">Set up your pet's profile in just a few minutes</p>
              <span className="text-primary-600 group-hover:text-primary-700 dark:group-hover:text-primary-400 font-medium">
                Get started →
              </span>
            </Link>

            <Link href="/resources/setup" className="group bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg p-6 transition-colors">
              <div className="flex items-center mb-3">
                <BookOpen className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Setup Guide</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">Complete walkthrough for new users</p>
              <span className="text-blue-600 group-hover:text-blue-700 dark:group-hover:text-blue-400 font-medium">
                Read guide →
              </span>
            </Link>

            <Link href="/resources/emergency" className="group bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg p-6 transition-colors">
              <div className="flex items-center mb-3">
                <Shield className="w-6 h-6 text-red-600 mr-2" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Emergency Plan</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">What to do if your pet goes missing</p>
              <span className="text-red-600 group-hover:text-red-700 dark:group-hover:text-red-400 font-medium">
                View plan →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Featured Articles</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {featuredArticles.map((article) => (
              <Link key={article.id} href={'/resources/' + article.slug} className="group cursor-pointer block">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-48 mb-4 flex items-center justify-center">
                  <Heart className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 px-2 py-1 rounded text-xs font-medium mr-2">
                    {article.category}
                  </span>
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{article.readTime}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 transition-colors">
                  {article.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{article.excerpt}</p>
                <span className="text-primary-600 font-medium group-hover:text-primary-700 dark:group-hover:text-primary-400 flex items-center">
                  Read more <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Link>
            ))}
          </div>

          {/* Categories Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category.name}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* All Articles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularArticles.map((article) => (
              <Link key={article.id} href={'/resources/' + article.slug} className="group cursor-pointer block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-medium mr-2">
                    {article.category}
                  </span>
                  <span>{article.readTime}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 transition-colors">
                  {article.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{article.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Stay updated on pet safety
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Get the latest safety tips, product updates, and pet care advice delivered to your inbox
          </p>
          <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
            />
            <button className="btn-primary px-6 py-3">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
