'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
  {
    category: 'PROTECT Membership',
    items: [
      {
        question: 'What do I get with the PROTECT Membership?',
        answer: (
          <p>
            The biggest benefit with our PROTECT membership is our GPS tag scan notifications. This
            helps your furry family member get home even faster! Other benefits include printable
            lost pet resources, and access to deals from our partners!
          </p>
        ),
      },
      {
        question: 'How exactly does the location notification work?',
        answer: (
          <>
            <p>
              Our highly valued benefit of our PROTECT membership allows you to get location
              notifications when someone scans your pet&apos;s tag. When someone scans your
              pet&apos;s tag, their phone shares their location (with permission). We will then send
              you an alert with a map showing the location where your tag was scanned.
            </p>
            <p className="mt-3 font-medium">
              Important: this is not a live GPS tracker.
            </p>
            <p className="mt-1">
              Instead of tracking your furry family member in real time, you will get a notification
              of the location, which is usually exactly where your pet is.
            </p>
            <p className="mt-3">
              <Link href="/shop" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                Check out pricing →
              </Link>
            </p>
          </>
        ),
      },
      {
        question: 'How can I cancel my PROTECT service?',
        answer: (
          <>
            <p>You can cancel right from your account in a few quick steps:</p>
            <ol className="list-decimal list-inside mt-3 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Log in to your account</li>
              <li>
                Go to your{' '}
                <Link href="/dashboard" className="text-primary-600 dark:text-primary-400 underline hover:text-primary-700 dark:hover:text-primary-300">
                  Dashboard
                </Link>
              </li>
              <li>Scroll down to the <strong>PROTECT Plan</strong> section</li>
              <li>Click <strong>&quot;Cancel plan&quot;</strong>. You&apos;ll be asked to confirm.</li>
            </ol>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              If you run into any trouble, email{' '}
              <a href="mailto:notastray.hq@gmail.com" className="text-primary-600 dark:text-primary-400 hover:underline">
                notastray.hq@gmail.com
              </a>{' '}
              and we&apos;ll help you take care of it.
            </p>
          </>
        ),
      },
    ],
  },
  {
    category: 'About the Tag',
    items: [
      {
        question: 'Why is this better than a tag with my phone number on it?',
        answer: (
          <p>
            Although those tags are better than nothing, they are difficult to read when you have an
            animal who won&apos;t sit still, and human error can cause wrong numbers to be typed in.
            An average QR code scan takes less than 1 second, and from there finders can click
            directly to call you! If you have our PROTECT membership you also get notified when
            someone scans it, which is something a phone number tag simply cannot do. Not to
            mention, if your phone number or address ever changes, with NotAStray tags you can
            easily update your pet&apos;s profile instead of having to order a whole new tag.
          </p>
        ),
      },
      {
        question: 'My pet has a microchip. Do I need this tag?',
        answer: (
          <>
            <p>
              Microchips are great. However, there are a lot of limitations. Microchips can only be
              scanned at shelters and vet offices. That means if your pet is lost at night, on
              holidays, or on weekends, it could be days before anyone can retrieve your contact
              information. Also, registering your microchip or changing information like your phone
              number often costs $100 or more!
            </p>
            <p className="mt-3">
              We still recommend having a microchip <em>on top of</em> our tag, because anything
              you can do to get your furry family member home is good in our book!
            </p>
          </>
        ),
      },
      {
        question: "My pet's tag is damaged. How do I get a replacement?",
        answer: (
          <p>
            We will take care of that for you! Email us at{' '}
            <a href="mailto:notastray.hq@gmail.com" className="text-primary-600 dark:text-primary-400 hover:underline">
              notastray.hq@gmail.com
            </a>{' '}
            and we&apos;ll get you sorted out.
          </p>
        ),
      },
    ],
  },
  {
    category: 'I Found a Pet',
    items: [
      {
        question: 'I found a pet. What should I do?',
        answer: (
          <>
            <p>
              First off, thank you so much for helping get this baby home safely!
            </p>
            <p className="mt-3">
              To locate the owners, open your camera, point it at the QR Code, and tap the link
              that pops up. You will see the pet&apos;s profile page with the information the owner
              has shared. Alternatively, you can go to{' '}
              <Link href="/lookup" className="text-primary-600 dark:text-primary-400 hover:underline">
                notastray.com/lookup
              </Link>{' '}
              and type in the code printed under the QR Code.
            </p>
          </>
        ),
      },
      {
        question: "The owner and emergency contacts aren't answering. Now what?",
        answer: (
          <>
            <p>Here are some steps to help keep the pet safe while you wait:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-gray-700 dark:text-gray-300">
              <li>If at all possible, keep the pet safe and secure. Avoid removing the collar or tag.</li>
              <li>
                If the owner has added vet information, contact them. They may have another contact
                number, be able to hold the pet, or can scan for a microchip.
              </li>
              <li>If the pet is injured, contact your nearest animal shelter or vet.</li>
              <li>If it is safe to do so, stay with the pet near the area you found them.</li>
              <li>Only offer water; do not offer food unless necessary.</li>
              <li>
                If they won&apos;t let you get close, approach slowly and be patient.
              </li>
            </ul>
            <p className="mt-4 font-medium text-primary-700 dark:text-primary-400">
              Thank you again for your help in getting someone&apos;s furry family member back home!
            </p>
          </>
        ),
      },
    ],
  },
  {
    category: 'I Lost a Pet',
    items: [
      {
        question: 'I lost a pet. What should I do?',
        answer: (
          <>
            <p>
              We are so sorry! Taking action right away and spreading the word is your best chance
              of getting them home safely. Here are some steps to help take the thinking out of it:
            </p>
            <p className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Download your I&apos;M LOST flyer</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li>
                Log in to your NotAStray pet profile and click the <strong>I&apos;M LOST</strong> button.
              </li>
              <li>Make sure all profile information is updated, including an up-to-date photo.</li>
              <li>Fill out the I&apos;M LOST report with the last place they were seen and any other important details.</li>
              <li>Download, print, and share the flyer!</li>
            </ol>
            <p className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Share widely</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Post to your social media, lost &amp; found Facebook groups, community groups, Nextdoor, and anywhere else that might help. Ask friends and family to share too.</li>
              <li>Print flyers to post in the surrounding area, local coffee shops, community boards, and anywhere you&apos;re allowed to post.</li>
            </ul>
            <p className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Start searching right away</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Go to the last known location. Bring their favorite treats, toys, or anything they love.</li>
              <li>Call them calmly. If you spot them, do not run after them. Out of their element they may be scared and run from you.</li>
              <li>Continue checking at different times and return to the area often.</li>
              <li>If you recently moved, go back to your old address; they may have returned there.</li>
            </ul>
            <p className="mt-4 font-semibold text-gray-900 dark:text-gray-100">Check local shelters</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Check <em>all</em> shelters near you (not just the closest one) and make a lost pet report at each.</li>
              <li>Going in person is best. Bring your flyer to post at each shelter.</li>
              <li>Don&apos;t go just once. Large shelters can receive hundreds of animals a day. Visit regularly and walk the shelter each time.</li>
            </ul>
            <p className="mt-4 font-bold text-primary-700 dark:text-primary-400">Don&apos;t give up!</p>
          </>
        ),
      },
    ],
  },
]

function FaqItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <span className="font-semibold text-gray-900 dark:text-gray-100 pr-4">{question}</span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-primary-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <section className="bg-brand-cream dark:bg-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Everything you need to know about NotAStray tags and the PROTECT membership.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {faqs.map((group) => (
            <div key={group.category}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {group.category}
              </h2>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <FaqItem key={item.question} question={item.question} answer={item.answer} />
                ))}
              </div>
            </div>
          ))}

          {/* Still have questions */}
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-lg p-6 text-center">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Don&apos;t see your question answered?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Email us and we&apos;ll help you out!
            </p>
            <a
              href="mailto:notastray.hq@gmail.com"
              className="btn-primary inline-block"
            >
              notastray.hq@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to protect your pet?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Get a NotAStray smart tag and give your furry family member the safety they deserve.
          </p>
          <Link
            href="/shop"
            className="bg-white text-primary-600 hover:bg-gray-100 font-medium py-3 px-8 rounded-lg text-lg transition-colors duration-200"
          >
            Shop Tags
          </Link>
        </div>
      </section>
    </div>
  )
}
