import Link from 'next/link'
import { BookOpen, Shield, Heart, Zap, Calendar, ArrowRight } from 'lucide-react'

const articles = [
  {
    id: 1,
    title: "Fireworks Safety: Keeping Your Pet Calm During Celebrations",
    excerpt: "Learn how to prepare your pet for fireworks season and keep them safe during loud celebrations.",
    category: "Safety",
    readTime: "5 min read",
    featured: true
  },
  {
    id: 2,
    title: "Setting Up Your TailTrackers Profile: Complete Guide",
    excerpt: "Step-by-step instructions for creating the perfect pet profile that will help bring your pet home.",
    category: "Setup",
    readTime: "3 min read",
    featured: false
  },
  {
    id: 3,
    title: "Holiday Pet Safety: What Every Owner Should Know",
    excerpt: "From toxic foods to decorations, keep your pets safe during holiday celebrations.",
    category: "Safety",
    readTime: "7 min read",
    featured: true
  },
  {
    id: 4,
    title: "Lost Pet Action Plan: What to Do in the First 24 Hours",
    excerpt: "A comprehensive guide to the most effective steps to take when your pet goes missing.",
    category: "Emergency",
    readTime: "6 min read",
    featured: false
  },
  {
    id: 5,
    title: "Traveling with Pets: Essential Safety Tips",
    excerpt: "Make sure your pet stays safe and comfortable during travel with these expert tips.",
    category: "Travel",
    readTime: "4 min read",
    featured: false
  },
  {
    id: 6,
    title: "Microchips vs. QR Tags: Which is Better?",
    excerpt: "Compare the benefits of different pet identification methods and why you might want both.",
    category: "Education",
    readTime: "5 min read",
    featured: false
  }
]

const categories = [
  { name: "All", count: articles.length },
  { name: "Safety", count: articles.filter(a => a.category === "Safety").length },
  { name: "Setup", count: articles.filter(a => a.category === "Setup").length },
  { name: "Emergency", count: articles.filter(a => a.category === "Emergency").length },
  { name: "Travel", count: articles.filter(a => a.category === "Travel").length },
  { name: "Education", count: articles.filter(a => a.category === "Education").length },
]

export default function ResourcesPage() {
  const featuredArticles = articles.filter(article => article.featured)
  const regularArticles = articles.filter(article => !article.featured)

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Pet Safety Resources
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Expert tips, guides, and resources to keep your pets safe and help you get the most out of your TailTrackers tag
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/activate" className="group bg-primary-50 hover:bg-primary-100 rounded-lg p-6 transition-colors">
              <div className="flex items-center mb-3">
                <Zap className="w-6 h-6 text-primary-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Activate Your Tag</h3>
              </div>
              <p className="text-gray-600 mb-3">Set up your pet's profile in just a few minutes</p>
              <span className="text-primary-600 group-hover:text-primary-700 font-medium">
                Get started →
              </span>
            </Link>

            <Link href="/resources/setup" className="group bg-blue-50 hover:bg-blue-100 rounded-lg p-6 transition-colors">
              <div className="flex items-center mb-3">
                <BookOpen className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Setup Guide</h3>
              </div>
              <p className="text-gray-600 mb-3">Complete walkthrough for new users</p>
              <span className="text-blue-600 group-hover:text-blue-700 font-medium">
                Read guide →
              </span>
            </Link>

            <Link href="/resources/emergency" className="group bg-red-50 hover:bg-red-100 rounded-lg p-6 transition-colors">
              <div className="flex items-center mb-3">
                <Shield className="w-6 h-6 text-red-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Emergency Plan</h3>
              </div>
              <p className="text-gray-600 mb-3">What to do if your pet goes missing</p>
              <span className="text-red-600 group-hover:text-red-700 font-medium">
                View plan →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Featured Articles</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {featuredArticles.map((article) => (
              <article key={article.id} className="group cursor-pointer">
                <div className="bg-gray-100 rounded-lg h-48 mb-4 flex items-center justify-center">
                  <Heart className="w-12 h-12 text-gray-400" />
                </div>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded text-xs font-medium mr-2">
                    {article.category}
                  </span>
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{article.readTime}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {article.title}
                </h3>
                <p className="text-gray-600 mb-4">{article.excerpt}</p>
                <span className="text-primary-600 font-medium group-hover:text-primary-700 flex items-center">
                  Read more <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </article>
            ))}
          </div>

          {/* Categories Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category.name}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 transition-colors"
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* All Articles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularArticles.map((article) => (
              <article key={article.id} className="group cursor-pointer bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium mr-2">
                    {article.category}
                  </span>
                  <span>{article.readTime}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {article.title}
                </h3>
                <p className="text-gray-600 text-sm">{article.excerpt}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Stay updated on pet safety
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Get the latest safety tips, product updates, and pet care advice delivered to your inbox
          </p>
          <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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