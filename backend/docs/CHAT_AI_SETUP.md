# AI Chat Integration Setup

The PB Assistant chat now supports AI-powered responses for more accurate and flexible matching of user questions to predefined answers. This document explains how to set up the AI integration.

## OpenAI API Setup

1. **Get an API Key from OpenAI**:
   - Create an account at [OpenAI's website](https://platform.openai.com/)
   - Navigate to the API keys section
   - Generate a new API key

2. **Add the API Key to your Environment**:
   - In each environment file (`.env`, `.env.production`, `.env.stage`), add:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

3. **Functionality Without an API Key**:
   - If no API key is provided, the system will fall back to keyword-based matching
   - All features still work, but with less accuracy in understanding user questions

## How It Works

The AI integration helps in two ways:

1. **Semantic Matching**: Instead of relying only on keyword matching, the system uses AI to understand the intent behind user questions and match them to the most relevant predefined answer.

2. **Fallback Responses**: When no predefined answer matches, the system can generate a contextually relevant response about the platform's features.

## Testing

To test if your AI integration is working:

1. Start the backend server with the API key set
2. Check the console logs when a chat message is processed
3. You should see messages like "AI found a matching predefined answer" or "Using AI-generated response"

## Adding New Predefined Answers

When you add new predefined answers to the database:

1. The AI will automatically include them in its matching process
2. No additional configuration is needed

## Troubleshooting

If the AI integration is not working:

1. Check if your API key is valid and correctly set in the environment
2. Verify network connectivity to the OpenAI API
3. Look for error messages in the console logs

## Rate Limits and Costs

Be aware that using the OpenAI API incurs costs and has rate limits:

- Monitor your usage on the OpenAI dashboard
- Consider implementing caching for common questions
- Set up proper error handling to fail gracefully when rate limits are hit 