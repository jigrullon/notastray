export interface ArticleSection {
  type: 'heading' | 'paragraph' | 'list' | 'callout' | 'numbered-list'
  content: string
  items?: string[]
  variant?: 'tip' | 'warning' | 'info'
}

export interface Article {
  id: number
  slug: string
  title: string
  excerpt: string
  category: string
  readTime: string
  featured: boolean
  publishDate: string
  author: string
  sections: ArticleSection[]
}

export const articles: Article[] = [
  {
    id: 1,
    slug: 'fireworks-safety',
    title: 'Fireworks Safety: Keeping Your Pet Calm During Celebrations',
    excerpt: 'Practical steps to prepare your pet for fireworks and keep them safe when the booms start.',
    category: 'Safety',
    readTime: '5 min read',
    featured: true,
    publishDate: '2026-02-15',
    author: 'NotAStray Team',
    sections: [
      {
        type: 'paragraph',
        content: 'Every year, animal shelters see a heartbreaking spike in lost pets around the Fourth of July, New Year\'s Eve, and other celebrations involving fireworks. More pets go missing on July 4th than any other day of the year. But with some preparation, you can keep your pet safe and calm through even the loudest celebrations.'
      },
      {
        type: 'heading',
        content: 'Why Fireworks Terrify Pets'
      },
      {
        type: 'paragraph',
        content: 'Dogs can hear sounds four times farther away than humans, and cats are even more sensitive. What sounds like a fun boom to you can feel like an explosion right next to your pet. The unpredictable timing, bright flashes, and sulfur smell all combine into a sensory overload that triggers a deep fight-or-flight response. A normally calm dog can chew through a fence or break through a screen door in a panic.'
      },
      {
        type: 'heading',
        content: 'Signs Your Pet Is Stressed'
      },
      {
        type: 'paragraph',
        content: 'Watch for these signs of distress so you can step in early:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Panting, drooling, or trembling',
          'Pacing or restlessness',
          'Hiding under furniture or in closets',
          'Whining, barking, or howling more than usual',
          'Trying to escape or scratching at doors and windows',
          'Refusing food or treats',
          'Accidents in the house (even in house-trained pets)',
          'Destructive behavior like chewing or digging'
        ]
      },
      {
        type: 'heading',
        content: 'Preparation: Days Before the Event'
      },
      {
        type: 'paragraph',
        content: 'The best time to prepare is well before the first boom. Start a few days (or even weeks) ahead.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Update your NotAStray profile with a current photo and your latest phone number. If your pet does escape, a stranger scanning their QR tag needs accurate information to reach you.',
          'Talk to your vet about anxiety options. For pets with severe noise phobia, prescription anti-anxiety medication can make a real difference. Your vet may also recommend calming supplements or a ThunderShirt.',
          'Try getting your pet used to the sounds gradually. Play recorded firework sounds at low volume while giving treats, then slowly increase the volume over several days. This won\'t cure severe phobia, but it can take the edge off for mildly anxious pets.',
          'Make sure your pet\'s collar fits snugly with the NotAStray tag attached. A panicked pet can slip out of a loose collar in seconds.',
          'Exercise your pet earlier in the day. A tired dog is a calmer dog. Get in a long walk or play session before the festivities begin.'
        ]
      },
      {
        type: 'callout',
        content: 'Double-check that your NotAStray tag is securely fastened to your pet\'s collar before any holiday. Give it a firm tug to make sure it won\'t come loose.',
        variant: 'tip'
      },
      {
        type: 'heading',
        content: 'During the Fireworks'
      },
      {
        type: 'paragraph',
        content: 'When the fireworks start, your goal is simple: make your pet feel safe.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Keep your pet indoors. This is the single most effective thing you can do. Close all windows, doors, and pet flaps.',
          'Create a safe space. Set up a cozy area in an interior room away from windows. A closet, bathroom, or basement works well. Add their favorite bed, blanket, and a worn piece of your clothing for comfort.',
          'Use white noise or calming music. Turn on a TV, fan, or play calming music designed for dogs. The steady sound helps mask the unpredictable booms.',
          'Stay calm yourself. Your pet picks up on your energy. If you act nervous, they\'ll feel more anxious. Speak in a normal, soothing voice.',
          'Don\'t force comfort. If your pet wants to hide, let them. Forcing them out of their safe spot can increase their stress. Just be nearby and available.',
          'Try calming aids. Pheromone diffusers (like Adaptil for dogs or Feliway for cats), calming treats, or a snug-fitting anxiety wrap can all help.'
        ]
      },
      {
        type: 'callout',
        content: 'Never bring your pet to a fireworks show, even if they seem calm normally. The intensity of a live display is completely different from distant neighborhood fireworks.',
        variant: 'warning'
      },
      {
        type: 'heading',
        content: 'If Your Pet Escapes'
      },
      {
        type: 'paragraph',
        content: 'Despite your best efforts, sometimes a scared pet bolts. If this happens, don\'t panic. If your pet is wearing their NotAStray QR tag, anyone who finds them can scan it with their phone camera. No app download needed. They\'ll instantly see your pet\'s profile and how to reach you, and you\'ll get a notification with the scanner\'s location so you know exactly where your pet was found.'
      },
      {
        type: 'paragraph',
        content: 'Start searching your immediate neighborhood. Frightened dogs often run but don\'t go far. Cats tend to hide very close to home. Leave your front door or garage open with familiar-smelling items outside. Check our Lost Pet Action Plan article for a detailed step-by-step guide.'
      },
      {
        type: 'heading',
        content: 'After the Fireworks'
      },
      {
        type: 'paragraph',
        content: 'The danger doesn\'t end when the show is over. Before letting your pet outside the next day, walk your yard and check for firework debris. Spent fireworks contain chemicals that are toxic if chewed or eaten. Pick up any casings, wrappers, or fragments you find.'
      },
      {
        type: 'paragraph',
        content: 'Some pets stay anxious for hours or even days after fireworks. Give them extra patience and maintain their normal routine as much as possible. Predictability helps them feel secure again.'
      },
      {
        type: 'heading',
        content: 'When to Call Your Vet'
      },
      {
        type: 'paragraph',
        content: 'Reach out to your veterinarian if your pet shows extreme panic that doesn\'t subside, if they injure themselves trying to escape, if they refuse to eat for more than 24 hours after the event, or if they seem disoriented or lethargic. Severe noise phobia is a real condition, and your vet can work with you to develop a long-term management plan that might include medication, behavioral training, or both.'
      },
      {
        type: 'callout',
        content: 'If your pet has a history of severe fireworks anxiety, schedule a vet visit at least two weeks before the next holiday so you have time to try medication and adjust dosing if needed.',
        variant: 'tip'
      }
    ]
  },
  {
    id: 2,
    slug: 'setup',
    title: 'Setting Up Your NotAStray Profile: Complete Guide',
    excerpt: 'Step-by-step instructions for creating the perfect pet profile that will help bring your pet home.',
    category: 'Setup',
    readTime: '3 min read',
    featured: false,
    publishDate: '2026-01-10',
    author: 'NotAStray Team',
    sections: [
      {
        type: 'paragraph',
        content: 'Welcome to NotAStray! You\'ve just taken one of the best steps you can to protect your pet. Setting up your profile takes just a few minutes, and once it\'s done, anyone who finds your pet can scan their tag and instantly know how to get them back to you.'
      },
      {
        type: 'heading',
        content: 'What You\'ll Need'
      },
      {
        type: 'list',
        content: 'Grab these before you start:',
        items: [
          'Your NotAStray tag (check the back for the activation code)',
          'A smartphone or computer',
          'A clear, recent photo of your pet',
          'About 5 minutes of your time'
        ]
      },
      {
        type: 'heading',
        content: 'Step 1: Create Your Account'
      },
      {
        type: 'paragraph',
        content: 'Head to our signup page and create your account with an email and password, or sign in with Google. This is the account you\'ll use to manage your pet\'s profile, view scan notifications, and update your contact info. Use an email you check regularly \u2014 this is how we\'ll reach you if someone scans your pet\'s tag.'
      },
      {
        type: 'heading',
        content: 'Step 2: Activate Your Tag'
      },
      {
        type: 'paragraph',
        content: 'Once you\'re logged in, go to the activation page at /activate. You\'ll see a simple form where you enter the unique code printed on the back of your NotAStray tag. This links the physical tag to your account. Each tag has a one-of-a-kind code, so only you control what appears when it\'s scanned.'
      },
      {
        type: 'callout',
        content: 'Can\'t find the code on your tag? It\'s a short alphanumeric code on the back side. If it\'s worn or hard to read, try scanning the QR code itself with your phone camera \u2014 the URL will contain the code.',
        variant: 'tip'
      },
      {
        type: 'heading',
        content: 'Step 3: Build Your Pet\'s Profile'
      },
      {
        type: 'paragraph',
        content: 'This is the page that strangers will see when they scan your pet\'s tag. The more complete it is, the faster your pet gets home. Here\'s what to include:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Pet photo: Choose a clear, well-lit photo that shows your pet\'s face and any distinguishing markings. Avoid blurry or distant shots. A good photo helps a finder confirm they have the right animal.',
          'Name, breed, and age: Basic info that helps anyone describe your pet accurately if they call a shelter or post on social media.',
          'Medical info: List any medications, allergies, or conditions (like diabetes or seizures) that a finder should know about. This can be lifesaving if your pet is lost for an extended period.',
          'Emergency contacts: Add your phone number and at least one backup contact. If you\'re unreachable, a second person can step in.'
        ]
      },
      {
        type: 'callout',
        content: 'For the best profile photo, get down to your pet\'s eye level and use natural lighting. Front-facing shots work better than side profiles for quick identification.',
        variant: 'tip'
      },
      {
        type: 'heading',
        content: 'Step 4: Attach the Tag to Your Pet\'s Collar'
      },
      {
        type: 'paragraph',
        content: 'Thread the tag onto your pet\'s collar using the included ring or clip. Make sure it\'s secure \u2014 give it a firm tug. The QR code should face outward so a finder can scan it easily. If your pet wears a harness instead of a collar, you can attach it there too. The tag is designed to be durable and weather-resistant, so it can handle rain, mud, and everyday adventures.'
      },
      {
        type: 'heading',
        content: 'What Happens When Someone Scans the Tag'
      },
      {
        type: 'paragraph',
        content: 'Here\'s the magic. When someone finds your pet and scans the QR code with any smartphone camera, two things happen at once. First, the finder sees your pet\'s profile page \u2014 name, photo, and how to contact you. Second, you get a notification with the scanner\'s approximate location, so you know where your pet was found. No app needed on either end. It just works.'
      },
      {
        type: 'heading',
        content: 'Tips for the Best Profile'
      },
      {
        type: 'numbered-list',
        content: '',
        items: [
          'Keep your phone number current. Moving? Changing numbers? Update your profile right away from your dashboard.',
          'Add multiple contacts. A neighbor, family member, or pet sitter who can act fast if you\'re unavailable.',
          'Update the photo as your pet ages. A puppy photo won\'t help identify a full-grown dog.',
          'Include behavioral notes. If your pet is shy around strangers or tends to run, let the finder know. Something like "She\'s friendly but nervous \u2014 crouch down and let her come to you" can help a lot.',
          'Review your profile every few months. A quick check takes 30 seconds and keeps everything accurate.'
        ]
      },
      {
        type: 'callout',
        content: 'Your profile is live as soon as you save it. Test it by scanning the QR code with your own phone to see exactly what a finder would see.',
        variant: 'info'
      },
      {
        type: 'paragraph',
        content: 'That\'s it! Your pet is now protected. The tag works 24/7, doesn\'t need charging, and doesn\'t require the finder to download anything. You\'ve given your pet the best chance of getting home quickly if they ever wander off.'
      }
    ]
  },
  {
    id: 3,
    slug: 'holiday-pet-safety',
    title: 'Holiday Pet Safety: What Every Owner Should Know',
    excerpt: 'From toxic foods to decorations, keep your pets safe during holiday celebrations.',
    category: 'Safety',
    readTime: '7 min read',
    featured: true,
    publishDate: '2026-03-01',
    author: 'NotAStray Team',
    sections: [
      {
        type: 'paragraph',
        content: 'Holidays bring joy, togetherness, and a house full of things that can hurt your pet. Between the festive food, shiny decorations, and a revolving door of guests, the risks multiply fast. Most holiday pet emergencies are completely preventable once you know what to watch for.'
      },
      {
        type: 'heading',
        content: 'Toxic Foods to Keep Away from Pets'
      },
      {
        type: 'paragraph',
        content: 'Holiday tables are loaded with foods that are dangerous or deadly for pets. The tricky part is that many of these are foods you eat every day without thinking twice. Here are the biggest offenders:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Chocolate: The darker the chocolate, the more dangerous. Baking chocolate and dark chocolate are the worst. Even small amounts can cause vomiting, rapid breathing, and seizures.',
          'Grapes and raisins: These can cause sudden kidney failure in dogs. Just a handful can be life-threatening, and there\'s no way to predict which dogs will react.',
          'Xylitol (birch sugar): Found in sugar-free candy, gum, baked goods, and some peanut butters. Even a tiny amount causes a rapid, dangerous drop in blood sugar and can lead to liver failure in dogs.',
          'Alcohol: Beer, wine, cocktails, and even rum-soaked desserts are toxic to pets. Their small bodies process alcohol much faster than ours, leading to vomiting, coordination problems, and breathing difficulty.',
          'Onions and garlic: Cooked or raw, these damage red blood cells in dogs and cats. Stuffing, gravy, and casseroles often contain both.',
          'Macadamia nuts: Cause weakness, vomiting, tremors, and overheating in dogs. Often found in holiday cookies and gift baskets.',
          'Unbaked yeast dough: If a dog eats raw bread dough, the yeast continues to rise inside their stomach, causing painful bloating and potentially dangerous alcohol production.'
        ]
      },
      {
        type: 'callout',
        content: 'If your pet eats something toxic, call the ASPCA Animal Poison Control Center at (888) 426-4435 or Pet Poison Helpline at (855) 764-7661 right away. Don\'t wait for symptoms.',
        variant: 'warning'
      },
      {
        type: 'heading',
        content: 'Dangerous Decorations'
      },
      {
        type: 'paragraph',
        content: 'Your beautiful holiday setup can be an obstacle course of hazards for a curious pet.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Tinsel and ribbon: Cats are especially drawn to tinsel. If swallowed, it can bunch up in the intestines and require emergency surgery. Keep tinsel off low branches or skip it entirely if you have cats.',
          'Ornament hooks and glass ornaments: Broken ornaments leave sharp fragments on the floor, and small hooks are easy for a pet to swallow. Use shatterproof ornaments on lower branches and twist hooks closed tightly.',
          'Candles: An excited tail or a curious cat can knock over a candle in seconds. Use flameless LED candles, or place real ones well out of reach on stable surfaces.',
          'Electrical cords and string lights: Chewing on cords can cause burns, electric shock, or start a fire. Run cords through PVC pipes or cord protectors, and unplug lights when you\'re not in the room.',
          'Gift wrap, bows, and bags: These look like toys to pets. The ribbons are a choking hazard, and bags can cause suffocation. Clean up wrapping debris immediately.'
        ]
      },
      {
        type: 'heading',
        content: 'Holiday Plants to Watch Out For'
      },
      {
        type: 'paragraph',
        content: 'Many popular holiday plants are toxic to pets, though severity varies quite a bit:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Poinsettias: Despite their reputation, poinsettias are only mildly toxic. They may cause drooling and stomach upset, but they\'re rarely dangerous.',
          'Mistletoe: More concerning than poinsettias. Eating mistletoe berries can cause significant stomach upset, difficulty breathing, and in larger amounts, heart problems. Keep it hung high.',
          'Lilies: Extremely dangerous for cats. Even tiny amounts \u2014 a nibble on a leaf, a sip of the water from the vase \u2014 can cause fatal kidney failure. If you have cats, don\'t bring lilies into your home at all.',
          'Holly: The berries cause vomiting, diarrhea, and stomach pain if eaten. Use artificial holly or keep real holly well out of reach.',
          'Amaryllis: The bulb is the most toxic part, causing vomiting, diarrhea, and tremors.'
        ]
      },
      {
        type: 'callout',
        content: 'Lilies are a life-threatening emergency for cats. This includes Easter lilies, tiger lilies, Asiatic lilies, and daylilies. If your cat has any contact with a lily, get to a vet immediately.',
        variant: 'warning'
      },
      {
        type: 'heading',
        content: 'Guests and Open Doors'
      },
      {
        type: 'paragraph',
        content: 'A house full of visitors means doors opening and closing constantly. Pets can slip out unnoticed in the commotion, especially during arrivals and departures when arms are full of gifts and coats.'
      },
      {
        type: 'paragraph',
        content: 'Before guests arrive, make sure your pet is wearing their collar with their NotAStray tag attached. If your dog or cat does dart out, anyone who spots them can scan the QR code and connect with you instantly. Ask guests to be mindful of the doors, and consider setting up a baby gate near the main entrance as an extra barrier.'
      },
      {
        type: 'paragraph',
        content: 'If your pet gets stressed around strangers, give them a quiet room to retreat to with food, water, and a comfortable bed. Not every pet enjoys a party, and that\'s okay. Forcing a nervous pet to socialize can lead to snapping, hiding, or escape attempts.'
      },
      {
        type: 'callout',
        content: 'Let your guests know the house rules: keep outside doors closed, don\'t feed the pets table scraps, and give nervous animals their space.',
        variant: 'tip'
      },
      {
        type: 'heading',
        content: 'Travel and Boarding During the Holidays'
      },
      {
        type: 'paragraph',
        content: 'If you\'re traveling with your pet, update your NotAStray profile with your travel destination and any temporary contact numbers. If you\'re boarding your pet or using a pet sitter, make sure the caretaker knows where the tag is, how it works, and has your emergency contact info. Leave a copy of your pet\'s medical records and your vet\'s phone number.'
      },
      {
        type: 'paragraph',
        content: 'Book boarding early during the holiday season \u2014 popular facilities fill up weeks in advance. Visit the facility beforehand to check cleanliness, security of enclosures, and staff attentiveness.'
      },
      {
        type: 'heading',
        content: 'Holiday Safety Checklist'
      },
      {
        type: 'numbered-list',
        content: 'Run through this list before each holiday gathering:',
        items: [
          'Scan your pet\'s NotAStray tag to confirm the profile is up to date.',
          'Move toxic foods to high counters or closed cabinets.',
          'Secure the Christmas tree to the wall to prevent tipping.',
          'Replace glass ornaments on low branches with shatterproof ones.',
          'Put away tinsel, ribbon, and small decorations.',
          'Cover or protect electrical cords.',
          'Set up a quiet retreat room for your pet.',
          'Brief guests on pet safety rules.',
          'Keep the vet\'s number and the ASPCA Poison Control number on your phone.',
          'Take out trash and food scraps before your pet can get to them.'
        ]
      },
      {
        type: 'paragraph',
        content: 'Holidays should be fun for everyone in the family, including the four-legged members. Run through the checklist above, brief your guests, and you can enjoy the celebrations without worrying about an emergency vet visit.'
      }
    ]
  },
  {
    id: 4,
    slug: 'emergency',
    title: 'Lost Pet Action Plan: What to Do in the First 24 Hours',
    excerpt: 'A comprehensive guide to the most effective steps to take when your pet goes missing.',
    category: 'Emergency',
    readTime: '6 min read',
    featured: false,
    publishDate: '2026-01-20',
    author: 'NotAStray Team',
    sections: [
      {
        type: 'paragraph',
        content: 'Your heart drops. You call their name and get nothing. You check every room, the yard, the garage \u2014 they\'re gone. Take a breath. You\'re going to get through this, and you\'re going to do everything you can to bring them home.'
      },
      {
        type: 'paragraph',
        content: 'Here\'s what you need to know right now: most lost pets are found. Studies show that over 90% of lost dogs and about 75% of lost cats are eventually reunited with their families. The key is acting fast and acting smart. The first 24 hours matter the most.'
      },
      {
        type: 'callout',
        content: 'If your pet is wearing a NotAStray tag, check your notifications first. Someone may have already scanned the tag, and you\'ll see their location. This can end the search before it really begins.',
        variant: 'tip'
      },
      {
        type: 'heading',
        content: 'First 30 Minutes: Start Close'
      },
      {
        type: 'paragraph',
        content: 'Before you jump in the car, search thoroughly at home. Pets hide in surprising places \u2014 inside closets, behind appliances, under beds, in boxes, even inside recliners. Cats especially can squeeze into spaces you wouldn\'t think possible. Check every room, every cabinet, every hiding spot.'
      },
      {
        type: 'paragraph',
        content: 'If they\'re truly not inside, step outside and walk your immediate neighborhood. Bring treats, a favorite squeaky toy, or shake a bag of kibble. Call their name in a calm, happy voice \u2014 a panicked tone can actually scare a hiding pet farther away. Walk slowly and listen carefully.'
      },
      {
        type: 'list',
        content: 'Talk to anyone you see:',
        items: [
          'Knock on neighbors\' doors and ask if they\'ve seen your pet.',
          'Check under porches, in open garages, and behind bushes.',
          'Ask anyone walking by, especially dog walkers and mail carriers who cover the area daily.',
          'Look up \u2014 cats often climb trees or get onto roofs when scared.'
        ]
      },
      {
        type: 'heading',
        content: 'First Few Hours: Expand Your Search'
      },
      {
        type: 'paragraph',
        content: 'If the first sweep didn\'t find them, it\'s time to widen the net.'
      },
      {
        type: 'numbered-list',
        content: '',
        items: [
          'Call local shelters and animal control. Don\'t just call once \u2014 call every day. Describe your pet in detail: breed, color, size, any distinctive markings, what collar they were wearing. Ask if you can email a photo.',
          'Contact nearby veterinary clinics. People who find injured pets often bring them to the closest vet. Give them your contact info and your pet\'s description.',
          'Post on social media. Put your pet\'s photo on your neighborhood Facebook group, Nextdoor, Instagram, and X. Include a clear photo, your neighborhood, the date and time they went missing, and your phone number. Ask people to share. These posts can reach thousands of local people in hours.',
          'Put up flyers. Use a large, clear photo and big text with your phone number. Post them at intersections, dog parks, grocery stores, laundromats, vet offices, and anywhere people stop and look. The best flyers have a color photo and can be read from a car.'
        ]
      },
      {
        type: 'callout',
        content: 'When making flyers, use LARGE text for "LOST DOG" or "LOST CAT" and your phone number. The photo should take up at least a third of the flyer. Laminate them if rain is expected.',
        variant: 'tip'
      },
      {
        type: 'heading',
        content: 'File Official Reports'
      },
      {
        type: 'paragraph',
        content: 'Don\'t skip the paperwork. Filing reports creates a record that shelters and animal control officers can match against incoming animals.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'File a lost pet report with your city or county animal control.',
          'Register on pet recovery websites like PetFBI.org, Pawboost, and the local Craigslist lost and found section.',
          'If your pet is microchipped, call the microchip company to confirm your contact info is current and report the pet as missing.',
          'Contact your pet\'s vet in case someone brings them in.',
          'File a report with your local police non-emergency line, especially if you think your pet was stolen.'
        ]
      },
      {
        type: 'heading',
        content: 'How NotAStray Helps in an Emergency'
      },
      {
        type: 'paragraph',
        content: 'If your pet is wearing their NotAStray QR tag, you have a powerful advantage. Here\'s why: when someone finds your pet, all they need to do is point their phone camera at the tag. No app to install. No account to create. They instantly see your pet\'s name, photo, and how to reach you.'
      },
      {
        type: 'paragraph',
        content: 'At the same time, you receive a notification showing the approximate location where the tag was scanned. This tells you exactly where your pet is, or at least where they were found. Even if the finder doesn\'t call right away, you know the area and can head straight there.'
      },
      {
        type: 'paragraph',
        content: 'This matters because the biggest challenge with a lost pet isn\'t that nobody finds them \u2014 it\'s that the finder doesn\'t know who to call. A collar tag with a phone number can be hard to read, and a microchip requires a trip to a vet or shelter. A QR code bridges that gap instantly.'
      },
      {
        type: 'callout',
        content: 'Anyone with a smartphone can scan a QR code. There\'s no app to download and no special equipment needed. This means even a passing stranger can help reunite you with your pet in seconds.',
        variant: 'info'
      },
      {
        type: 'heading',
        content: 'Tips to Lure Your Pet Home'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Leave your garage door cracked or a door propped open so they can find their way back.',
          'Put their bed, a worn shirt of yours, and their food bowl outside. Familiar scents carry far.',
          'For cats, place their used litter box outside. Cats can smell their own litter from a remarkable distance.',
          'Search at dawn and dusk when lost pets are most active and the neighborhood is quieter.',
          'If you spot your pet, don\'t chase them. Sit down, speak softly, and let them come to you. A scared pet will run from someone running at them.'
        ]
      },
      {
        type: 'heading',
        content: 'Don\'t Give Up'
      },
      {
        type: 'paragraph',
        content: 'Pets have been reunited with their families after weeks, months, and even years. Dogs can travel incredible distances \u2014 there are documented cases of dogs found hundreds of miles from home. Cats, on the other hand, tend to hide very close by. Many "lost" cats are found within a few houses of home, tucked under a deck or in a neighbor\'s shed.'
      },
      {
        type: 'paragraph',
        content: 'Keep checking shelters in person (new animals arrive daily), refresh your social media posts, and leave those familiar scent items outside. Persistence pays off. People find their pets when they refuse to stop looking.'
      },
      {
        type: 'callout',
        content: 'Visit shelters in person rather than relying only on phone calls. Photos on shelter websites aren\'t always current, and a stressed pet can look very different from their usual self. You might recognize your pet when a staff member wouldn\'t.',
        variant: 'tip'
      },
      {
        type: 'paragraph',
        content: 'You\'re doing the right thing by taking action. Every step you take \u2014 every flyer, every phone call, every social media post \u2014 increases the odds of bringing your pet home. Stay focused, stay hopeful, and keep going.'
      }
    ]
  },
  {
    id: 5,
    slug: 'traveling-with-pets',
    title: 'Traveling with Pets: Essential Safety Tips',
    excerpt: 'Make sure your pet stays safe and comfortable during travel with these expert tips.',
    category: 'Travel',
    readTime: '4 min read',
    featured: false,
    publishDate: '2026-02-05',
    author: 'NotAStray Team',
    sections: [
      {
        type: 'paragraph',
        content: 'Whether you\'re driving to the coast or flying across the country, traveling with your pet takes a bit of extra planning. A little preparation keeps the trip safe and enjoyable for both of you \u2014 and avoids some genuinely dangerous situations.'
      },
      {
        type: 'heading',
        content: 'Planning Ahead'
      },
      {
        type: 'paragraph',
        content: 'Start planning well before your departure date. Not every hotel, rental, or destination is pet-friendly, and requirements vary widely.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Research pet policies for hotels, vacation rentals, parks, and attractions along your route. Many places that say "pet-friendly" have size or breed restrictions.',
          'Schedule a vet visit 2-4 weeks before your trip. Make sure vaccinations are up to date and ask for a copy of your pet\'s health records to bring along.',
          'If your pet gets carsick or anxious during travel, talk to your vet about medication options ahead of time.',
          'Update your NotAStray profile with your travel destination, dates, and any temporary contact numbers. If your pet gets lost in an unfamiliar area, the finder needs to reach you where you actually are.'
        ]
      },
      {
        type: 'callout',
        content: 'Traveling somewhere with a different area code? Add a note to your NotAStray profile that you\'re visiting, so anyone who finds your pet knows you\'re not a local owner.',
        variant: 'tip'
      },
      {
        type: 'heading',
        content: 'Car Travel'
      },
      {
        type: 'paragraph',
        content: 'Road trips with pets can be a great experience, but safety in the car is non-negotiable.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Use a crash-tested crate or a pet-specific seatbelt harness. An unrestrained pet in a car is a projectile in an accident \u2014 dangerous for them and for you.',
          'Stop every 2-3 hours for bathroom breaks, water, and a short walk. Plan your route around rest stops with grassy areas.',
          'Bring a portable water bowl and fresh water. Pets dehydrate faster than you\'d think, especially in warm weather or with the car heater running.',
          'Keep the car well-ventilated. Crack windows slightly or run the air conditioning.',
          'Pack a familiar blanket or toy. The smell of home helps keep anxiety down in an unfamiliar moving vehicle.'
        ]
      },
      {
        type: 'callout',
        content: 'Never leave your pet in a parked car, even for a few minutes, even with the windows cracked. On a 70-degree day, a car\'s interior can reach 100 degrees in just 20 minutes. On a hot day, it can become fatal in under 10 minutes.',
        variant: 'warning'
      },
      {
        type: 'heading',
        content: 'Air Travel'
      },
      {
        type: 'paragraph',
        content: 'Flying with a pet requires more preparation and has stricter rules. Every airline handles it differently, so do your homework early.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Check your airline\'s pet policy before booking your ticket. Fees, size limits, and breed restrictions vary by carrier. Some airlines don\'t allow pets at all on certain routes.',
          'Small pets may fly in the cabin in an airline-approved carrier that fits under the seat in front of you. Measure your carrier against the airline\'s specific dimensions \u2014 don\'t guess.',
          'Larger pets may need to fly in the cargo hold. This is stressful and carries more risk. If possible, book direct flights to minimize time in the hold and avoid layovers in extreme heat or cold.',
          'Most airlines require a health certificate from your vet issued within 10 days of travel. Some states and all international destinations have their own requirements on top of that.',
          'Avoid sedating your pet for flights unless your vet specifically recommends it. Sedation can affect breathing and blood pressure at altitude.'
        ]
      },
      {
        type: 'heading',
        content: 'Pack a Pet Emergency Kit'
      },
      {
        type: 'paragraph',
        content: 'Don\'t assume you\'ll be able to find what you need at your destination. Pack a dedicated kit for your pet:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Copies of vaccination records and your vet\'s contact info',
          'Any medications with dosing instructions',
          'A basic pet first aid kit (gauze, antiseptic wipes, tweezers, styptic powder)',
          'Enough food for the trip plus an extra day or two, in case of delays',
          'Familiar items: a favorite toy, their regular blanket, a piece of your clothing',
          'Waste bags, a portable litter tray for cats, and a collapsible water bowl',
          'A recent photo of your pet on your phone, in case you need it for a lost pet report'
        ]
      },
      {
        type: 'heading',
        content: 'Keeping Routines While Away'
      },
      {
        type: 'paragraph',
        content: 'Pets thrive on routine, and travel disrupts everything they know. The more you can keep things consistent, the calmer they\'ll be. Feed them at their usual times, take walks at their normal schedule, and give them a consistent sleeping spot in each new location. If they normally sleep in a crate at home, bring the crate along.'
      },
      {
        type: 'callout',
        content: 'Scope out the nearest emergency vet clinic at every destination before you need one. A quick search when you arrive can save precious time in a crisis.',
        variant: 'tip'
      },
      {
        type: 'heading',
        content: 'A Note on International Travel'
      },
      {
        type: 'paragraph',
        content: 'Crossing borders with a pet adds layers of complexity. Many countries require specific vaccinations (particularly rabies), blood tests, quarantine periods, import permits, and microchipping. Some countries like the UK, Australia, and Japan have lengthy quarantine requirements. Start the process months in advance \u2014 some requirements have mandatory waiting periods after vaccinations. Check your destination country\'s official government website for their exact requirements, and confirm with your airline as well.'
      },
      {
        type: 'paragraph',
        content: 'A little planning keeps the trip safe so you can actually enjoy it together. And wherever you go, make sure that NotAStray tag is on the collar \u2014 pets are most likely to get lost in unfamiliar places, and that tag is how a stranger gets them back to you.'
      }
    ]
  },
  {
    id: 6,
    slug: 'microchips-vs-qr-tags',
    title: 'Microchips vs. QR Tags: Which is Better?',
    excerpt: 'Compare the benefits of different pet identification methods and why you might want both.',
    category: 'Education',
    readTime: '5 min read',
    featured: false,
    publishDate: '2026-02-20',
    author: 'NotAStray Team',
    sections: [
      {
        type: 'paragraph',
        content: 'If you\'re trying to decide between a microchip and a QR tag for your pet, here\'s the honest answer: get both. They solve the same problem \u2014 getting your lost pet back to you \u2014 but they work in completely different ways, and each one covers the other\'s weaknesses.'
      },
      {
        type: 'heading',
        content: 'How Microchips Work'
      },
      {
        type: 'paragraph',
        content: 'A microchip is a tiny device, about the size of a grain of rice, implanted under your pet\'s skin between the shoulder blades. Your vet does it with a quick injection \u2014 no surgery, no anesthesia. The chip stores a unique ID number. When a special scanner is held over your pet, it reads that number, which is then looked up in a database to find your contact information.'
      },
      {
        type: 'paragraph',
        content: 'Microchips are permanent. They don\'t fall off, they don\'t need batteries, and they last your pet\'s entire lifetime. Vets and shelters routinely scan incoming animals for chips, making them extremely effective when a lost pet ends up in professional hands.'
      },
      {
        type: 'heading',
        content: 'How QR Tags Work'
      },
      {
        type: 'paragraph',
        content: 'A QR tag hangs on your pet\'s collar like a traditional ID tag, but instead of engraved text, it has a QR code. When anyone points their phone camera at it, they\'re taken to your pet\'s profile page showing the pet\'s photo, name, your contact info, medical notes, and anything else you\'ve added. At the same time, you get a notification with the finder\'s approximate location.'
      },
      {
        type: 'paragraph',
        content: 'No special equipment needed. No app required. Any person with a smartphone can scan it and connect with you in seconds, right there on the spot.'
      },
      {
        type: 'heading',
        content: 'Side-by-Side Comparison'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Cost: Microchips cost $25-$75 for implantation plus potential annual database fees. QR tags are a one-time purchase with no ongoing fees.',
          'Updatability: Microchip databases require you to log in and update records separately. QR tag profiles can be updated instantly from your phone anytime.',
          'Scanner needed: Microchips require a special scanner that only vets and shelters have. QR tags work with any smartphone camera.',
          'Information depth: Microchips store only an ID number. QR tags display a full profile with photos, medical info, multiple contacts, and behavioral notes.',
          'Permanence: Microchips are implanted and can\'t fall off. QR tags depend on your pet wearing a collar.',
          'Speed of reunion: Microchips require a trip to a vet or shelter for scanning. QR tags allow immediate contact on the street, in a park, or wherever the pet is found.',
          'Owner notification: Microchips don\'t notify you when scanned. QR tags send you an alert with the scanner\'s location the moment someone scans.'
        ]
      },
      {
        type: 'heading',
        content: 'Why Microchips Alone Aren\'t Enough'
      },
      {
        type: 'paragraph',
        content: 'Microchips are a great safety net, but they have a real-world limitation that many pet owners don\'t think about. For a microchip to help, the person who finds your pet has to take them to a vet or shelter to be scanned. Think about that for a moment. A neighbor finds your dog in their yard. A jogger spots your cat by the road. A family sees a friendly dog at the park. Most people don\'t have time to drive to a vet right that moment. They might take a photo and post it online, they might knock on a few doors, or they might assume the pet lives nearby and move on.'
      },
      {
        type: 'paragraph',
        content: 'The gap between finding a pet and getting the chip scanned is where reunions fall apart. Hours or days can pass. Meanwhile, you\'re frantic and have no idea someone already found your pet.'
      },
      {
        type: 'callout',
        content: 'Studies show that only about 58% of microchipped pets in shelters are actually reunited with their owners, often because the chip\'s database contact info is outdated. Keep your microchip registration current.',
        variant: 'info'
      },
      {
        type: 'heading',
        content: 'The Gold Standard: Use Both'
      },
      {
        type: 'paragraph',
        content: 'The best protection is layered. Think of it this way:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Your QR tag is the first line of defense. It enables instant, on-the-spot reunions. Most lost pets are found by everyday people, not shelters. A QR tag turns any finder into a rescue hero with one scan.',
          'Your microchip is the backup. If the collar comes off, if the tag is damaged, or if your pet ends up at a shelter, the chip is still there under the skin, waiting to be scanned.',
          'Together, they cover almost every scenario. Collar on? QR tag gets you a fast reunion. Collar off? The microchip ensures your pet can still be identified.'
        ]
      },
      {
        type: 'callout',
        content: 'When you get your pet microchipped, write down the chip number and the database company. Store it in your phone and in your NotAStray profile notes. If you ever need to prove ownership, you\'ll have it handy.',
        variant: 'tip'
      },
      {
        type: 'heading',
        content: 'Keep Both Updated'
      },
      {
        type: 'paragraph',
        content: 'The best ID in the world is useless if it points to an old phone number. Whenever you move, change your number, or update your email, take two minutes to update both your microchip database and your NotAStray profile. Set a reminder to double-check both every six months. It\'s a tiny habit that could make all the difference.'
      },
      {
        type: 'paragraph',
        content: 'Microchips and QR tags aren\'t competing technologies \u2014 they\'re teammates. One is permanent and invisible. The other is immediate and information-rich. Together, they give your pet the strongest chance of getting home fast.'
      }
    ]
  }
]

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find(a => a.slug === slug)
}

export function getAllSlugs(): string[] {
  return articles.map(a => a.slug)
}
