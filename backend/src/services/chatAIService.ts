import axios from 'axios';
import { PredefinedQA, ChatMessage } from '../models/ChatMessage.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const MAX_CONVERSATION_HISTORY = 5; // Number of previous exchanges to include

// Get conversation history for context
const getConversationHistory = async (sessionId: string, limit = MAX_CONVERSATION_HISTORY) => {
  try {
    const history = await ChatMessage.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    
    // Return in chronological order
    return history.reverse();
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
};

// Format conversation history into messages for OpenAI
const formatConversationHistory = (history: any[]) => {
  const messages: {role: string, content: string}[] = [];
  
  history.forEach(item => {
    messages.push({ role: 'user', content: item.message });
    messages.push({ role: 'assistant', content: item.response });
  });
  
  return messages;
};

// Function to find the best matching predefined answer using AI
export const findBestMatch = async (userQuery: string, patentId?: string, sessionId?: string): Promise<{answer: string | null, source: string}> => {
  try {
    // First, fetch all predefined Q&A pairs
    const query: any = {};
    if (patentId) {
      query.$or = [{ patentId }, { patentId: { $exists: false } }];
    }
    
    const predefinedQAs = await PredefinedQA.find(query);
    
    if (predefinedQAs.length === 0) {
      return { answer: null, source: 'none' };
    }
    
    // Format the Q&A pairs for the AI prompt
    const qaPairsText = predefinedQAs.map((qa, index) => 
      `${index + 1}. Q: ${qa.question}\nA: ${qa.answer}`
    ).join('\n\n');
    
    // Use OpenAI to find the best match
    if (OPENAI_API_KEY) {
      try {
        // Get conversation history if sessionId is provided
        let conversationContext = '';
        if (sessionId) {
          const history = await getConversationHistory(sessionId, 2);
          if (history.length > 0) {
            conversationContext = '\n\nRecent conversation history:\n';
            history.forEach((item, index) => {
              conversationContext += `User: ${item.message}\nAssistant: ${item.response}\n\n`;
            });
          }
        }

        const response = await axios.post(
          OPENAI_ENDPOINT,
          {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: `You are an AI assistant for a patent research platform. Your task is to match user queries to the most relevant predefined answer. Here are the available Q&A pairs:\n\n${qaPairsText}${conversationContext}`
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
          
          // Update the useCount for this predefined QA
          await PredefinedQA.findByIdAndUpdate(
            predefinedQAs[matchIndex]._id,
            { $inc: { useCount: 1 } }
          );
          
          return { 
            answer: predefinedQAs[matchIndex].answer,
            source: 'predefined'
          };
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
        // Update the useCount for this predefined QA
        await PredefinedQA.findByIdAndUpdate(
          qa._id,
          { $inc: { useCount: 1 } }
        );
        
        return { 
          answer: qa.answer,
          source: 'keyword' 
        };
      }
      
      // Check if query contains words from the question
      const questionWords = qa.question.toLowerCase().split(/\s+/);
      const queryWords = userQuery.toLowerCase().split(/\s+/);
      const matchCount = questionWords.filter(word => 
        queryWords.includes(word) && word.length > 3
      ).length;
      
      if (matchCount >= 2) {
        // Update the useCount for this predefined QA
        await PredefinedQA.findByIdAndUpdate(
          qa._id,
          { $inc: { useCount: 1 } }
        );
        
        return { 
          answer: qa.answer,
          source: 'textMatch'
        };
      }
    }
    
    return { answer: null, source: 'none' };
  } catch (error) {
    console.error('Error finding best match:', error);
    return { answer: null, source: 'error' };
  }
};

// Function to generate a response using AI when no predefined answer is found
export const generateAIResponse = async (userQuery: string, patentId?: string, sessionId?: string): Promise<{answer: string | null, source: string}> => {
  if (!OPENAI_API_KEY) {
    console.log('No OpenAI API key found in environment variables');
    return { answer: null, source: 'missingApiKey' };
  }

  try {
    // First, check if we have stored Q&A pairs in the database
    const query: any = { $text: { $search: userQuery } };
    if (patentId) {
      query.$or = [{ patentId }, { patentId: { $exists: false } }];
    }
    
    const relevantQAs = await PredefinedQA.find(query)
      .sort({ score: { $meta: "textScore" } })
      .limit(3);
    
    // Create context for OpenAI with information about patent platform and any relevant stored QAs
    let systemPrompt = `You are PB Assistant, a helpful assistant for the PatentsBrowser platform, which offers patent research tools including:
    
1) Patent Highlighter: Complex search patterns to identify text in patents
2) Smart Search: Automatically transforms patent IDs to proper format
3) Workflow Management: Organize patents in folders and avoid duplicate reviews
4) AI Assistant: Generate patent summaries and analysis reports
5) Batch Processing: Upload files to extract multiple patent IDs

`;

    // Add context from our relevant stored Q&A pairs
    if (relevantQAs.length > 0) {
      systemPrompt += `\nHere are some relevant stored questions and answers that might help with this query:\n\n`;
      relevantQAs.forEach((qa, index) => {
        systemPrompt += `${index + 1}. Q: ${qa.question}\nA: ${qa.answer}\n\n`;
      });
    }

    systemPrompt += `\nIf you don't have a good answer for the user's question, admit you don't know rather than making up information. Your response should be concise and direct.`;

    // Get conversation history if sessionId is provided
    let messages = [{ role: 'system', content: systemPrompt }];
    
    if (sessionId) {
      const history = await getConversationHistory(sessionId);
      
      if (history.length > 0) {
        const historyMessages = formatConversationHistory(history);
        messages = messages.concat(historyMessages);
      }
    }
    
    // Add the current user query
    messages.push({ role: 'user', content: userQuery });

    // Call OpenAI API with enhanced context and conversation history
    const response = await axios.post(
      OPENAI_ENDPOINT,
      {
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 250,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    const answer = response.data.choices[0].message.content.trim();
    
    // If the answer contains uncertainty phrases, provide more explicit message
    const uncertaintyPhrases = [
      "I don't have information",
      "I don't know",
      "I'm not sure",
      "I don't have enough information",
      "I cannot provide",
      "no information available",
      "cannot find information"
    ];
    
    if (uncertaintyPhrases.some(phrase => answer.toLowerCase().includes(phrase.toLowerCase()))) {
      return { 
        answer: "Sorry, I don't have specific information related to your question. Is there anything else about the PatentsBrowser platform I can help you with?",
        source: 'aiUncertain'
      };
    }
    
    return { answer, source: 'aiGenerated' };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return { 
      answer: "I'm having trouble connecting to my knowledge base. Please try asking your question again or ask something about the PatentsBrowser platform features.",
      source: 'aiError'
    };
  }
};

export default {
  findBestMatch,
  generateAIResponse
}; 