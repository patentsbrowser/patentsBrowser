import axios from 'axios';
import { PredefinedQA } from '../models/ChatMessage';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Function to find the best matching predefined answer using AI
export const findBestMatch = async (userQuery: string, patentId?: string): Promise<string | null> => {
  try {
    // First, fetch all predefined Q&A pairs
    const query: any = {};
    if (patentId) {
      query.$or = [{ patentId }, { patentId: { $exists: false } }];
    }
    
    const predefinedQAs = await PredefinedQA.find(query);
    
    if (predefinedQAs.length === 0) {
      return null;
    }
    
    // Format the Q&A pairs for the AI prompt
    const qaPairsText = predefinedQAs.map((qa, index) => 
      `${index + 1}. Q: ${qa.question}\nA: ${qa.answer}`
    ).join('\n\n');
    
    // Use OpenAI to find the best match
    if (OPENAI_API_KEY) {
      try {
        const response = await axios.post(
          OPENAI_ENDPOINT,
          {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: `You are an AI assistant for a patent research platform. Your task is to match user queries to the most relevant predefined answer. Here are the available Q&A pairs:\n\n${qaPairsText}`
              },
              {
                role: 'user',
                content: `The user asked: "${userQuery}". What is the index number of the most relevant predefined answer? Only respond with the number, nothing else.`
              }
            ],
            max_tokens: 10,
            temperature: 0.3
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
          }
        );
        
        const aiResponse = response.data.choices[0].message.content.trim();
        const matchIndex = parseInt(aiResponse.match(/\d+/)?.[0] || '0', 10) - 1;
        
        if (matchIndex >= 0 && matchIndex < predefinedQAs.length) {
          console.log(`AI matched query "${userQuery}" to Q&A pair #${matchIndex + 1}`);
          return predefinedQAs[matchIndex].answer;
        }
      } catch (aiError) {
        console.error('OpenAI API error:', aiError);
        // Fall back to keyword matching if AI fails
      }
    }
    
    // Fallback: Simple keyword matching
    for (const qa of predefinedQAs) {
      // Check if any keywords match
      if (qa.keywords && qa.keywords.some(keyword => 
        userQuery.toLowerCase().includes(keyword.toLowerCase())
      )) {
        return qa.answer;
      }
      
      // Check if query contains words from the question
      const questionWords = qa.question.toLowerCase().split(/\s+/);
      const queryWords = userQuery.toLowerCase().split(/\s+/);
      const matchCount = questionWords.filter(word => 
        queryWords.includes(word) && word.length > 3
      ).length;
      
      if (matchCount >= 2) {
        return qa.answer;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding best match:', error);
    return null;
  }
};

// Function to generate a response using AI when no predefined answer is found
export const generateAIResponse = async (userQuery: string, patentId?: string): Promise<string | null> => {
  if (!OPENAI_API_KEY) {
    return null;
  }

  try {
    // Create a context for the AI including what the platform is about
    const systemPrompt = `You are PB Assistant, a helpful assistant for the PatentsBrowser platform, which offers patent research tools including:
    
1) Patent Highlighter: Complex search patterns to identify text in patents
2) Smart Search: Automatically transforms patent IDs to proper format
3) Workflow Management: Organize patents in folders and avoid duplicate reviews
4) AI Assistant: Generate patent summaries and analysis reports
5) Batch Processing: Upload files to extract multiple patent IDs

Provide a brief, helpful response about these features. Be concise and informative.`;

    const response = await axios.post(
      OPENAI_ENDPOINT,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating AI response:', error);
    return null;
  }
};

export default {
  findBestMatch,
  generateAIResponse
}; 