/**
 * FILE: backend/config/sectionSchemas.js
 * PURPOSE: JSON schemas for website section types
 * DESCRIPTION: Defines the structure and default values for each section type
 *              that can be added to a DevOpser Lite website.
 */

// Available icon names for features
const AVAILABLE_ICONS = [
  'rocket', 'star', 'heart', 'check', 'shield', 'lightning',
  'globe', 'users', 'clock', 'chart', 'lock', 'cloud',
  'code', 'mobile', 'settings', 'support', 'book', 'gift'
];

// Section type definitions
const SECTION_SCHEMAS = {
  hero: {
    type: 'hero',
    displayName: 'Hero Banner',
    description: 'Main hero section with headline, subheadline, and call-to-action',
    defaultContent: {
      headline: 'Build Something Amazing',
      subheadline: 'Create beautiful websites with AI assistance in minutes',
      ctaText: 'Get Started',
      ctaLink: '#contact',
      backgroundImage: null,
      backgroundColorStart: null,  // Hex color for gradient start, null = use theme
      backgroundColorEnd: null     // Hex color for gradient end, null = use theme
    },
    schema: {
      headline: { type: 'string', maxLength: 100, required: true },
      subheadline: { type: 'string', maxLength: 300, required: false },
      ctaText: { type: 'string', maxLength: 30, required: false },
      ctaLink: { type: 'string', maxLength: 200, required: false },
      backgroundImage: { type: 'url', required: false },
      backgroundColorStart: { type: 'hexColor', required: false, description: 'Gradient start color in hex format (e.g., #000000)' },
      backgroundColorEnd: { type: 'hexColor', required: false, description: 'Gradient end color in hex format (e.g., #1a1a1a)' }
    }
  },

  features: {
    type: 'features',
    displayName: 'Features',
    description: 'Feature grid showcasing product capabilities',
    defaultContent: {
      title: 'Features',
      subtitle: 'Everything you need to succeed',
      items: [
        { icon: 'rocket', title: 'Fast', description: 'Lightning-fast performance' },
        { icon: 'shield', title: 'Secure', description: 'Enterprise-grade security' },
        { icon: 'support', title: 'Support', description: '24/7 customer support' }
      ]
    },
    schema: {
      title: { type: 'string', maxLength: 100, required: true },
      subtitle: { type: 'string', maxLength: 200, required: false },
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 6,
        itemSchema: {
          icon: { type: 'enum', values: AVAILABLE_ICONS, required: true },
          title: { type: 'string', maxLength: 50, required: true },
          description: { type: 'string', maxLength: 150, required: true }
        }
      }
    }
  },

  about: {
    type: 'about',
    displayName: 'About',
    description: 'About section with text and optional image',
    defaultContent: {
      title: 'About Us',
      content: 'We are a team dedicated to making website creation simple and accessible for everyone.',
      image: null,
      imagePosition: 'right'
    },
    schema: {
      title: { type: 'string', maxLength: 100, required: true },
      content: { type: 'text', maxLength: 1000, required: true },
      image: { type: 'url', required: false },
      imagePosition: { type: 'enum', values: ['left', 'right'], required: false }
    }
  },

  testimonials: {
    type: 'testimonials',
    displayName: 'Testimonials',
    description: 'Customer testimonials and reviews',
    defaultContent: {
      title: 'What Our Customers Say',
      items: [
        {
          quote: 'This product changed how we do business. Highly recommended!',
          author: 'Jane Smith',
          role: 'CEO, TechCorp',
          avatar: null
        }
      ]
    },
    schema: {
      title: { type: 'string', maxLength: 100, required: true },
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 4,
        itemSchema: {
          quote: { type: 'string', maxLength: 500, required: true },
          author: { type: 'string', maxLength: 100, required: true },
          role: { type: 'string', maxLength: 100, required: false },
          avatar: { type: 'url', required: false }
        }
      }
    }
  },

  pricing: {
    type: 'pricing',
    displayName: 'Pricing',
    description: 'Pricing tiers and plans',
    defaultContent: {
      title: 'Simple Pricing',
      subtitle: 'Choose the plan that works for you',
      items: [
        {
          name: 'Starter',
          price: '$9',
          period: '/month',
          features: ['Feature 1', 'Feature 2', 'Feature 3'],
          ctaText: 'Get Started',
          ctaLink: '#contact',
          highlighted: false
        },
        {
          name: 'Pro',
          price: '$29',
          period: '/month',
          features: ['Everything in Starter', 'Feature 4', 'Feature 5', 'Priority Support'],
          ctaText: 'Get Started',
          ctaLink: '#contact',
          highlighted: true
        }
      ]
    },
    schema: {
      title: { type: 'string', maxLength: 100, required: true },
      subtitle: { type: 'string', maxLength: 200, required: false },
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 4,
        itemSchema: {
          name: { type: 'string', maxLength: 50, required: true },
          price: { type: 'string', maxLength: 20, required: true },
          period: { type: 'string', maxLength: 20, required: false },
          features: { type: 'array', maxItems: 10, itemType: 'string' },
          ctaText: { type: 'string', maxLength: 30, required: false },
          ctaLink: { type: 'string', maxLength: 200, required: false },
          highlighted: { type: 'boolean', required: false }
        }
      }
    }
  },

  contact: {
    type: 'contact',
    displayName: 'Contact',
    description: 'Contact form and information',
    defaultContent: {
      title: 'Get in Touch',
      subtitle: 'We\'d love to hear from you',
      email: 'hello@example.com',
      phone: null,
      address: null,
      showForm: true,
      formFields: ['name', 'email', 'message']
    },
    schema: {
      title: { type: 'string', maxLength: 100, required: true },
      subtitle: { type: 'string', maxLength: 200, required: false },
      email: { type: 'email', required: false },
      phone: { type: 'string', maxLength: 30, required: false },
      address: { type: 'string', maxLength: 200, required: false },
      showForm: { type: 'boolean', required: false },
      formFields: { type: 'array', maxItems: 10, itemType: 'string' }
    }
  },

  footer: {
    type: 'footer',
    displayName: 'Footer',
    description: 'Site footer with links and copyright',
    defaultContent: {
      companyName: 'My Company',
      copyright: '2024 My Company. All rights reserved.',
      links: [
        { label: 'Privacy', url: '/privacy' },
        { label: 'Terms', url: '/terms' }
      ],
      socialLinks: []
    },
    schema: {
      companyName: { type: 'string', maxLength: 100, required: true },
      copyright: { type: 'string', maxLength: 200, required: false },
      links: {
        type: 'array',
        maxItems: 6,
        itemSchema: {
          label: { type: 'string', maxLength: 50, required: true },
          url: { type: 'string', maxLength: 200, required: true }
        }
      },
      socialLinks: {
        type: 'array',
        maxItems: 5,
        itemSchema: {
          platform: { type: 'enum', values: ['twitter', 'facebook', 'instagram', 'linkedin', 'github'], required: true },
          url: { type: 'string', maxLength: 200, required: true }
        }
      }
    }
  }
};

// Default site configuration template
const DEFAULT_SITE_CONFIG = {
  siteName: '',
  theme: {
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    fontFamily: 'Inter'
  },
  sections: [
    {
      id: 'hero-1',
      type: 'hero',
      order: 0,
      visible: true,
      content: SECTION_SCHEMAS.hero.defaultContent
    },
    {
      id: 'features-1',
      type: 'features',
      order: 1,
      visible: true,
      content: SECTION_SCHEMAS.features.defaultContent
    },
    {
      id: 'about-1',
      type: 'about',
      order: 2,
      visible: true,
      content: SECTION_SCHEMAS.about.defaultContent
    },
    {
      id: 'contact-1',
      type: 'contact',
      order: 3,
      visible: true,
      content: SECTION_SCHEMAS.contact.defaultContent
    },
    {
      id: 'footer-1',
      type: 'footer',
      order: 4,
      visible: true,
      content: SECTION_SCHEMAS.footer.defaultContent
    }
  ]
};

// Available theme presets
const THEME_PRESETS = {
  blue: {
    name: 'Ocean Blue',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937'
  },
  purple: {
    name: 'Royal Purple',
    primaryColor: '#8B5CF6',
    secondaryColor: '#EC4899',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937'
  },
  green: {
    name: 'Forest Green',
    primaryColor: '#10B981',
    secondaryColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937'
  },
  dark: {
    name: 'Dark Mode',
    primaryColor: '#60A5FA',
    secondaryColor: '#34D399',
    backgroundColor: '#111827',
    textColor: '#F9FAFB'
  },
  sunset: {
    name: 'Sunset',
    primaryColor: '#F59E0B',
    secondaryColor: '#EF4444',
    backgroundColor: '#FFFBEB',
    textColor: '#1F2937'
  }
};

module.exports = {
  SECTION_SCHEMAS,
  DEFAULT_SITE_CONFIG,
  THEME_PRESETS,
  AVAILABLE_ICONS
};
