import mongoose from 'mongoose';

// Schema for storing chat messages
const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    enum: ['general', 'patent', 'search', 'technical', 'other'],
    default: 'general',
    index: true,
  },
  patentId: {
    type: String,
    required: false,
    index: true,
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

predefinedQASchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create text index for semantic search
chatMessageSchema.index({ message: 'text', response: 'text' });
predefinedQASchema.index({ question: 'text', answer: 'text' });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export const PredefinedQA = mongoose.model('PredefinedQA', predefinedQASchema);

// Function to initialize predefined Q&A pairs
export const initializePredefinedQA = async () => {
  try {
    const count = await PredefinedQA.countDocuments();
    
    // Only initialize if the collection is empty
    if (count === 0) {
      console.log('Initializing predefined Q&A pairs...');
      
      const platformQA = [
        {
          question: "What features does PatentsBrowser offer?",
          answer: `PatentsBrowser offers several powerful features to enhance patent research:
      
1) Patent Highlighter: Supports complex search patterns to quickly identify relevant text in patents
2) Smart Search: Automatically transforms and corrects patent IDs to proper format
3) Workflow Management: Create folders to organize patents and avoid duplicate reviews
4) AI Assistant (Beta): Helps generate patent summaries and analysis reports
5) Batch Processing: Upload files to extract multiple patent IDs with a single click`,
          keywords: ["features", "platform", "capabilities", "benefits"],
          category: "general"
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
          keywords: ["highlighter", "highlight", "search pattern", "complex search"],
          category: "technical"
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
          keywords: ["smart search", "patent id", "transform", "format", "correction"],
          category: "technical"
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
          category: "technical"
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
          category: "technical"
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
          category: "technical"
        }
      ];
      
      await PredefinedQA.insertMany(platformQA);
      console.log('Predefined Q&A pairs initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing predefined Q&A pairs:', error);
  }
};

export default { ChatMessage, PredefinedQA, initializePredefinedQA }; 