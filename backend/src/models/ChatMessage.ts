import mongoose from "mongoose";

// Schema for storing chat messages
const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  patentId: {
    type: String,
    required: false,
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  response: {
    type: String,
    required: true,
  },
  metadata: {
    type: Object,
    default: {},
  },
  feedback: {
    helpful: {
      type: Boolean,
      default: null,
    },
    comment: {
      type: String,
      default: null,
    }
  },
  aiMatchSource: {
    type: String,
    enum: ['predefined', 'textSearch', 'aiGenerated', 'fallback'],
    default: 'fallback'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Schema for predefined Q&A pairs
const predefinedQASchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    index: true,
  },
  answer: {
    type: String,
    required: true,
  },
  keywords: {
    type: [String],
    default: [],
    index: true,
  },
  category: {
    type: String,
    enum: ["general", "patent", "search", "technical", "other"],
    default: "general",
    index: true,
  },
  patentId: {
    type: String,
    required: false,
    index: true,
  },
  useCount: {
    type: Number,
    default: 0,
  },
  positiveRating: {
    type: Number,
    default: 0,
  },
  negativeRating: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

predefinedQASchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Create text index for semantic search
chatMessageSchema.index({ message: "text", response: "text" });
predefinedQASchema.index({ question: "text", answer: "text" });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export const PredefinedQA = mongoose.model("PredefinedQA", predefinedQASchema);

// Function to initialize predefined Q&A pairs
export const initializePredefinedQA = async () => {
  try {
    const count = await PredefinedQA.countDocuments();

    // Only initialize if the collection is empty
    if (count === 0) {
      console.log("Initializing predefined Q&A pairs...");

      const platformQA = [
        // Subscription & Pricing Questions
        {
          question: "What subscription plans are available?",
          answer: `PatentsBrowser offers flexible subscription plans for different needs:

**Individual Plans:**
• Basic Plan (₹999/month) - Essential patent search and analysis
• Professional Plan (₹2,999/month) - Advanced features + AI analysis
• Premium Plan (₹7,999/month) - Full access + priority support

**Organization Plans:**
• Team Plan (₹9,999/month) - Multi-user access + collaboration tools
• Enterprise Plan (₹19,999/month) - Advanced team features + custom integrations
• Corporate Plan (₹49,999/month) - Full enterprise suite + dedicated support

All plans include patent search, smart analysis, and workflow management. Higher tiers add AI features, bulk processing, and team collaboration tools.`,
          keywords: ["subscription", "plans", "pricing", "cost", "price", "payment", "individual", "organization", "team"],
          category: "general",
        },
        {
          question: "How do I upgrade or change my subscription plan?",
          answer: `You can easily manage your subscription:

1. **Upgrade Plans:** Go to Settings → Subscription → View available plans for your account type
2. **Plan Stacking:** Add new plans to existing subscriptions for combined benefits
3. **Downgrade:** Contact support for downgrades (processed at next billing cycle)
4. **Payment Methods:** UPI, bank transfer, and other secure payment options available

**Organization Features:**
• Organization admins can manage team subscriptions
• Invite team members to share plan benefits
• Centralized billing and user management

Need help? Contact our support team for personalized assistance.`,
          keywords: ["upgrade", "change plan", "downgrade", "billing", "payment", "stack", "organization"],
          category: "general",
        },
        {
          question: "What features does PatentsBrowser offer?",
          answer: `PatentsBrowser offers several powerful features to enhance patent research:
      
1) Patent Highlighter: Supports complex search patterns to quickly identify relevant text in patents
2) Smart Search: Automatically transforms and corrects patent IDs to proper format
3) Workflow Management: Create folders to organize patents and avoid duplicate reviews
4) AI Assistant (Beta): Helps generate patent summaries and analysis reports
5) Batch Processing: Upload files to extract multiple patent IDs with a single click`,
          keywords: ["features", "platform", "capabilities", "benefits"],
          category: "general",
        },
        {
          question: "How does the Patent Highlighter work?",
          answer: `The Patent Highlighter supports advanced search patterns including:
      
• Boolean operators (AND, OR, NOT)
• Proximity search (finding terms within a certain distance)
• Wildcard searching (partial term matching)
• Phrase matching (exact sequences of words)
• Field-specific search (title, abstract, claims, description)
• Synonym expansion (finds related terms automatically)

This allows researchers to quickly identify relevant sections within lengthy patent documents, significantly reducing manual review time.`,
          keywords: [
            "highlighter",
            "highlight",
            "search pattern",
            "complex search",
          ],
          category: "technical",
        },
        {
          question: "Tell me about Smart Search for patent IDs",
          answer: `The Smart Search feature automatically transforms and corrects patent IDs to their proper format. It can:
      
• Convert between different patent ID formats (US8123456 → US-8,123,456-B2)
• Fix common typos and format errors
• Add missing country codes or publication details
• Normalize different patent ID representations to a standard format
• Process multiple IDs at once, even from unstructured text

This eliminates manual correction and ensures consistent, accurate patent references throughout your research.`,
          keywords: [
            "smart search",
            "patent id",
            "transform",
            "format",
            "correction",
          ],
          category: "technical",
        },
        {
          question: "How do folders and workflow management work?",
          answer: `The Workflow Management system helps organize your patent research by:
      
• Creating folders for different research projects or topics
• Saving patents with notes and custom tags
• Automatically detecting duplicates across workfiles
• Tracking which patents you've already reviewed
• Providing collaboration features for team research

When creating a new workfile inside a folder, the system can automatically filter out patents you've already reviewed, ensuring efficient progression through large patent sets.`,
          keywords: ["folder", "workflow", "organize", "duplicate"],
          category: "technical",
        },
        {
          question: "What AI features are coming soon?",
          answer: `Our upcoming AI Assistant feature will help with:
      
• Generating concise patent summaries
• Identifying key innovations in patent text
• Creating comparison reports between multiple patents
• Extracting relevant technical information
• Suggesting related patents based on content analysis

This will significantly reduce the time needed to understand complex patents and produce research reports. The feature is currently in beta and will be fully available soon.`,
          keywords: ["ai", "assistant", "report", "summary", "upcoming"],
          category: "technical",
        },
        {
          question: "How does batch processing of patent IDs work?",
          answer: `The Batch Processing feature allows you to:
      
• Upload documents containing patent references
• Automatically extract all patent IDs
• Correct and standardize the format of extracted IDs
• Import them directly into your workflow
• Process hundreds of patents with a single click

This is particularly useful when dealing with prior art search results, office actions, or competitor analysis documents that mention multiple patents.`,
          keywords: ["upload", "extract", "batch", "file", "multiple patents"],
          category: "technical",
        },
        // API & Settings Questions
        {
          question: "How do I configure AI API keys?",
          answer: `Configure your AI providers in Settings → API Keys:

**Supported AI Providers:**
• Google AI (Gemini) - FREE tier with generous limits
• OpenAI (GPT-4) - PREMIUM quality analysis
• DeepSeek AI - COST-EFFECTIVE option
• Anthropic (Claude) - PREMIUM with safety features
• Cohere AI - ENTERPRISE multilingual capabilities
• Hugging Face - OPEN SOURCE thousands of models
• Custom API - Your own OpenAI-compatible endpoint

**Setup Steps:**
1. Go to Settings → API Keys section
2. Choose your preferred AI provider
3. Get API key from provider's website
4. Paste key and save (stored locally only)
5. Keys automatically work in Patent Analyzer

**Security:** All API keys are stored locally in your browser only - never transmitted to our servers.`,
          keywords: ["api", "keys", "ai", "openai", "google", "deepseek", "settings", "configuration"],
          category: "technical",
        },
        {
          question: "What is Patent Analyzer and how does it work?",
          answer: `Patent Analyzer is our AI-powered patent analysis tool:

**Key Features:**
• Create custom taxonomies to categorize patents
• Bulk upload hundreds of patents at once
• AI analysis using your configured providers
• Relevance scoring and detailed explanations
• Export results to CSV for further analysis

**How It Works:**
1. **Setup:** Configure AI providers in Settings
2. **Taxonomies:** Define categories for analysis
3. **Upload Patents:** Add individual or bulk patent numbers
4. **Analysis Scope:** Choose title+abstract, claims, or full text
5. **AI Processing:** Automatic analysis using your AI provider
6. **Results:** Get relevance scores and explanations
7. **Export:** Download CSV reports

**Analysis Scopes:**
• Title + Abstract (recommended) - Fast and comprehensive
• Title + Abstract + Claims - Detailed legal analysis
• Claims Only - Focused legal relevance
• Full Text - Most comprehensive (slower)`,
          keywords: ["patent analyzer", "ai analysis", "taxonomy", "relevance", "scoring", "bulk upload"],
          category: "technical",
        },
        // Organization Features
        {
          question: "How do organization features work?",
          answer: `PatentsBrowser offers powerful organization features:

**Organization Admin Benefits:**
• Create organization during signup
• Access to organization-specific subscription plans
• Invite team members with shareable links
• Manage team access and permissions
• Centralized billing and subscription management

**Team Collaboration:**
• Share subscription benefits with all team members
• Collaborative patent research and analysis
• Shared workflows and saved patents
• Team-wide access to AI features

**Invitation System:**
• Generate shareable invitation links
• Share via email, WhatsApp, Telegram, Instagram
• Single-use invite links for security
• Automatic team member onboarding

**Member Benefits:**
• Access to organization's paid plan features
• Collaborative tools and shared resources
• No separate subscription needed
• Professional team environment

Perfect for law firms, research teams, and corporate IP departments.`,
          keywords: ["organization", "team", "invite", "collaboration", "admin", "members", "sharing"],
          category: "general",
        },
      ];

      await PredefinedQA.insertMany(platformQA);
      console.log("Predefined Q&A pairs initialized successfully");
    }
  } catch (error) {
    console.error("Error initializing predefined Q&A pairs:", error);
  }
};

export default { ChatMessage, PredefinedQA, initializePredefinedQA };
