import Link from 'next/link'
import { DeviceMobile, Shield, Heart } from '@phosphor-icons/react/dist/ssr'
import NewsletterSignup from '@/components/NewsletterSignup'

const features = [
  {
    title: 'Instant access',
    desc: "Anyone can scan the QR code with their phone to instantly access your pet's profile",
    Icon: DeviceMobile,
    shape: 'rounded-2xl',
  },
  {
    title: 'Secure & private',
    desc: 'Your contact info is protected. Finders see only what you choose to share',
    Icon: Shield,
    shape: 'rounded-full',
  },
  {
    title: 'Medical info',
    desc: 'Include allergies, medications, and vet info for emergency situations',
    Icon: Heart,
    shape: 'rounded-2xl',
  },
]

const steps = [
  {
    title: 'Order your tag',
    desc: 'Choose from our durable, waterproof tags designed for active pets',
  },
  {
    title: 'Create profile',
    desc: "Use the code on your tag to set up your pet's profile with photos and info",
  },
  {
    title: 'Stay protected',
    desc: 'If your pet is found, the finder can scan and contact you immediately',
  },
]

export default function HomePage() {
  return (
    <div className="bg-transparent">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-cream dark:bg-gray-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 w-[28rem] h-[28rem] rounded-full bg-primary-200/50 dark:bg-primary-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.07] text-primary-900 dark:text-primary-100"
          style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-6 text-balance">
              Keep your pets{' '}
              <span className="text-primary-600 dark:text-primary-400">safe</span>{' '}
              with QR code tags
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-xl">
              When your pet goes missing, every second counts. Our QR code tags provide
              instant access to their profile, medical info, and your contact details.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/shop" className="btn-primary text-lg px-8 py-3 text-center">
                Shop Tags
              </Link>
              <Link href="/activate" className="btn-outline text-lg px-8 py-3 text-center">
                Activate Your Tag
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28 bg-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 text-balance">
              Everything you need to keep pets safe
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Simple, effective, and designed with your pet&apos;s safety in mind
            </p>
          </div>

          <div className="space-y-14">
            {features.map((feature, i) => {
              const reversed = i % 2 === 1
              return (
                <div
                  key={feature.title}
                  className={`flex flex-col md:flex-row gap-6 md:gap-10 items-start ${
                    reversed ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`shrink-0 w-16 h-16 ${feature.shape} bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center`}
                  >
                    <feature.Icon className="w-8 h-8 text-primary-600 dark:text-primary-400" weight="duotone" />
                  </div>
                  <div className={`flex flex-col ${reversed ? 'md:items-end md:text-right' : ''}`}>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md">{feature.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 bg-brand-cream dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 text-balance">
              How it works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Get your pet protected in three simple steps
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-y-10 gap-x-8">
            <div
              aria-hidden
              className="hidden md:block absolute top-8 left-[16.6%] right-[16.6%] h-px bg-primary-300 dark:bg-primary-700"
            />
            {steps.map((step, i) => (
              <div
                key={step.title}
                className={`relative flex flex-col items-center text-center ${i === 1 ? 'md:-translate-y-3' : ''}`}
              >
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mb-5 text-white font-bold text-xl shadow-lg shadow-primary-900/20 dark:shadow-black/40">
                  {i + 1}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-14">
            <Link
              href="/resources/faq"
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium inline-flex items-center gap-1"
            >
              Have questions? Check out our FAQ
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <NewsletterSignup variant="full" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-20 lg:py-24 bg-primary-700">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.10), transparent 55%)' }}
        />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-primary-500/30 blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4 text-balance">
            Ready to protect your pet?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of pet parents who trust NotAStray to keep their furry family safe
          </p>
          <Link
            href="/shop"
            className="inline-block bg-white text-primary-700 hover:bg-primary-50 active:scale-[0.98] font-medium py-3 px-8 rounded-lg text-lg transition-all duration-150 shadow-lg shadow-primary-900/30"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  )
}
