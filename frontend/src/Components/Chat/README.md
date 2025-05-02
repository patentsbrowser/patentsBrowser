# Patty Chat - Patent Assistant Widget

## Overview
Patty Chat is an AI-powered chat assistant for the patentsBrowser platform. It provides contextual responses to user questions about patent details, helping users extract valuable information and insights from patents.

## Features
- Collapsible chat widget that can be toggled from the patent details page
- Responsive UI with typing indicators and message history
- Suggested questions for new users
- Message count limitation (10 messages per conversation)
- Patent-specific responses based on context

## Components

### PattyChat.tsx
The main chat component that manages the conversation UI and state.

**Props:**
- `patentId`: The ID of the current patent being viewed
- `patentTitle`: The title of the current patent
- `patentAbstract`: The abstract text of the current patent
- `patentClaims`: Array of claims from the current patent
- `isOpen`: Boolean to control if the chat is expanded or collapsed
- `onToggle`: Callback function when the collapse state changes

### PattyChat.scss
Styles for the chat widget, including animations, layout, and responsive design.

## Services

### chatService.ts
Service that handles sending messages to the backend AI service and receiving responses.

**Methods:**
- `sendMessage(message: string, patentId?: string)`: Sends a message to the AI and returns a promise with the response

## Integration
To add the chat widget to a page:

```tsx
import PattyChat from '../Chat/PattyChat';

// Inside your component:
const [isChatOpen, setIsChatOpen] = useState(false);

// In your JSX:
<PattyChat 
  patentId={patentId}
  patentTitle={title}
  patentAbstract={abstract}
  patentClaims={claims}
  isOpen={isChatOpen}
  onToggle={() => setIsChatOpen(!isChatOpen)}
/>
```

## Development and Customization

### Adding New Response Types
To add new types of responses to the chat service, modify the pattern matching in the `mockResponse` method in `chatService.ts`. For a real implementation, you would replace this with API calls to an AI service.

### Styling Customization
The chat widget uses SCSS variables that can be customized to match your application's theme. Update the variables at the top of `PattyChat.scss`.

### Known Limitations
- Currently using mock responses for demonstration
- Limited to 10 messages per conversation
- No persistence of chat history between sessions

## Future Enhancements
- Add real AI backend integration
- Implement chat history persistence
- Add support for rich content (images, links, etc.)
- Implement typing support for better UX 