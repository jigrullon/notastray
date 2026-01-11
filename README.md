# NotAStray - Smart Pet ID Tags Website

A modern, responsive website for NotAStray QR code pet tags built with Next.js 14, TypeScript, and Tailwind CSS. Inspired by GitHub's clean, professional design.

## Features

- **Homepage**: Hero section with features and how-it-works
- **Shop**: Product catalog with different tag options
- **Activate**: Multi-step form for setting up pet profiles
- **Pet Profiles**: Dynamic pages showing pet information when QR codes are scanned
- **Resources**: Safety tips, guides, and educational content
- **Responsive Design**: Mobile-first approach with clean, modern UI

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Ready for Vercel, Netlify, or any static hosting

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── activate/          # Tag activation flow
│   ├── pet/[code]/        # Dynamic pet profile pages
│   ├── resources/         # Safety guides and tips
│   ├── shop/              # Product catalog
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # Reusable components
│   ├── Header.tsx         # Navigation header
│   └── Footer.tsx         # Site footer
└── public/                # Static assets
```

## Key Pages

### Homepage (`/`)
- Hero section with value proposition
- Feature highlights
- How-it-works section
- Call-to-action sections

### Shop (`/shop`)
- Product grid with different tag options
- Feature comparisons
- FAQ section

### Activate (`/activate`)
- 3-step activation process
- Tag code verification
- Pet profile creation form
- Success confirmation

### Pet Profile (`/pet/[code]`)
- Pet information display
- Owner contact details
- Medical information
- Temperament indicators
- Emergency contact options

### Resources (`/resources`)
- Safety articles and guides
- Setup instructions
- Emergency procedures
- Educational content

## Customization

### Colors
The site uses a blue color scheme defined in `tailwind.config.js`. Update the `primary` colors to match your brand:

```js
primary: {
  50: '#f0f9ff',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
}
```

### Content
- Update company name from "NotAStray" in components if needed
- Replace placeholder content with your actual copy
- Add real product images and pricing
- Customize the pet profile mock data

### Features to Add
- User authentication and accounts
- Database integration for pet profiles
- Payment processing for shop
- Admin dashboard for managing profiles
- Email notifications
- GPS tracking integration
- Mobile app companion

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Deploy automatically

### Other Platforms
```bash
npm run build
npm start
```

## UX Improvements Implemented

- **Clean, GitHub-inspired design** with plenty of whitespace
- **Mobile-first responsive design** that works on all devices
- **Clear navigation** with prominent CTA buttons
- **Progressive disclosure** in the activation flow
- **Accessible color contrast** and typography
- **Loading states and feedback** throughout the user journey
- **Emergency-focused design** for pet profile pages
- **Trust indicators** like security badges and testimonials

## Next Steps

1. **Backend Integration**: Connect to a database for real pet profiles
2. **Payment Processing**: Add Stripe or similar for tag purchases
3. **User Accounts**: Allow owners to manage multiple pets
4. **Mobile App**: Companion app for easier profile management
5. **Analytics**: Track QR code scans and user behavior
6. **Notifications**: Email/SMS alerts when pets are found

## License

This project is for demonstration purposes. Update with your actual license.
## T
roubleshooting

### Chunk Loading Errors

If you encounter "ChunkLoadError: Loading chunk failed" errors:

1. **Quick Fix**: The error boundary will automatically refresh the page
2. **Manual Reset**: Run `npm run reset` to clean all caches
3. **Alternative**: Use `npm run dev:legacy` instead of `npm run dev`
4. **Clean Restart**: 
   ```bash
   npm run clean
   npm run dev
   ```

### Common Development Issues

- **Port conflicts**: Change port with `npm run dev -- -p 3001`
- **Cache issues**: Run `npm run clean` to clear Next.js cache
- **Module resolution**: Delete `node_modules` and run `npm install`
- **TypeScript errors**: Run `npm run lint` to check for issues

### Performance Tips

- Use `npm run dev` (with Turbo) for faster builds
- Keep the development server running instead of restarting frequently
- Use browser dev tools to monitor network requests and chunk loading