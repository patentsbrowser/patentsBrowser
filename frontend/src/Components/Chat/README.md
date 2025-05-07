# PB Assistant - Patent Browser Assistant Widget

## Overview
PB Assistant is an AI-powered chat assistant for the patentsBrowser platform. It provides contextual responses to user questions about patent details, helping users extract valuable information and insights from patents.

## Features
- Collapsible chat widget that can be toggled from the patent details page
- Responsive UI with typing indicators and message history
- Suggested questions for new users
- Message count limitation (10 messages per conversation)
- Patent-specific responses based on context
- User authentication integration with personalized welcome messages

## Components

### PBAssistant.tsx
The main chat component that manages the conversation UI and state.

**Props:**
- `patentId`: The ID of the current patent being viewed
- `patentTitle`: The title of the current patent
- `patentAbstract`: The abstract text of the current patent
- `patentClaims`: Array of claims from the current patent
- `isOpen`: Boolean to control if the chat is expanded or collapsed
- `onToggle`: Callback function when the collapse state changes

### PBAssistant.scss
Styles for the chat widget, including animations, layout, and responsive design.

## Services

### chatService.ts
Service that handles sending messages to the backend AI service and receiving responses.

**Methods:**
- `sendMessage(message: string, patentId?: string)`: Sends a message to the AI and returns a promise with the response
- `getWelcomeMessage()`: Returns a personalized welcome message based on user authentication status
- `initSession()`: Initializes or retrieves the current chat session ID
- `getSessionMessages()`: Retrieves message history for the current session

## Integration
To add the chat widget to a page:

```tsx
import { PBAssistant } from '../Chat';

// Inside your component:
const [isChatOpen, setIsChatOpen] = useState(false);

// In your JSX:
<PBAssistant 
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
To add new types of responses to the chat service, update the backend API that handles the chat responses. The frontend component will display the responses returned from the server.

### Styling Customization
The chat widget uses SCSS variables that can be customized to match your application's theme. Update the variables at the top of `PBAssistant.scss`.

### Known Limitations
- Limited to 10 messages per conversation

## Future Enhancements
- Add support for rich content (images, links, etc.)
- Add user feedback functionality for responses
- Implement voice input support 