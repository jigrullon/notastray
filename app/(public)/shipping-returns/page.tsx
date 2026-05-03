import Link from 'next/link';
import { ArrowLeft, Truck, RotateCcw, Clock, MapPin, Phone, Mail } from 'lucide-react';

export const metadata = {
  title: 'Shipping & Returns | NotAStray',
  description: 'Fast shipping and hassle-free returns for your NotAStray pet ID tags.',
};

export default function ShippingReturnsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/shop"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Shipping & Returns
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            We're committed to getting your pet ID tags to you quickly and safely.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Shipping Section */}
        <section className="mb-12">
          <div className="flex items-start mb-6">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-100 dark:bg-primary-900">
                <Truck className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Shipping Information
              </h2>
            </div>
          </div>

          <div className="space-y-6 ml-16">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Processing Time
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Most orders are processed and shipped within <strong>1-2 business days</strong>.
                As a small business, we prioritize getting your pet's ID tag to you as quickly as possible.
                If you're in a rush, contact us — we may be able to expedite your order.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Shipping Method
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                All orders are shipped via <strong>USPS Ground Advantage</strong>. This service offers:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li>Reliable, cost-effective shipping across the United States</li>
                <li>Tracking number included with every shipment</li>
                <li>Typical delivery time: 5-7 business days</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Shipping Costs
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Shipping costs are calculated at checkout based on your location. You'll see the exact
                shipping fee before you complete your purchase.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Tracking Your Order
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Once your order ships, you'll receive an email with your tracking number. You can use
                this to track your package on the USPS website. We'll also send you updates as your
                package makes its way to you.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                International Shipping
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Currently, we only ship within the United States. If you have questions about
                international orders, please contact us.
              </p>
            </div>
          </div>
        </section>

        {/* Returns Section */}
        <section className="mb-12">
          <div className="flex items-start mb-6">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-100 dark:bg-primary-900">
                <RotateCcw className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Returns & Exchanges
              </h2>
            </div>
          </div>

          <div className="space-y-6 ml-16">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Return Policy
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                We want you to be completely satisfied with your NotAStray pet ID tag.
                Here's our return policy:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li><strong>30-day return window:</strong> Returns must be initiated within 30 days of purchase</li>
                <li><strong>Original condition:</strong> Tags must be unused and in original packaging</li>
                <li><strong>Free returns:</strong> We cover return shipping for defective items</li>
                <li><strong>Full refund:</strong> Refunds are processed within 5-7 business days of receiving your return</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Damaged or Defective Items
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                If your tag arrives damaged or defective, please contact us immediately with photos.
                We'll send you a replacement right away — no return necessary. We stand behind the
                quality of our products and want to make sure your pet stays safe.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                How to Return an Item
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                To initiate a return:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li>Email us at support@notastray.com with your order number</li>
                <li>We'll provide you with a return shipping label (if applicable)</li>
                <li>Ship the item back to us in original condition</li>
                <li>Once received and inspected, we'll process your refund</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Exchanges
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Need a different color or size? We're happy to exchange your tag. Simply contact us
                and we'll work out the details. If there's a price difference, we'll adjust accordingly.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section>
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Questions About Shipping or Returns?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              We're here to help! Reach out to us through any of these channels:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Email
                  </h3>
                  <a
                    href="mailto:support@notastray.com"
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    support@notastray.com
                  </a>
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Response Time
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    We respond within 24 hours
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
