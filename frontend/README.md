# PatentsBrowser Frontend

A modern React frontend for the PatentsBrowser application.

## Tech Stack

- **Library**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Data Fetching**: React Query
- **Routing**: React Router
- **Form Handling**: Formik with Yup
- **Styling**: SASS
- **Charts**: Recharts
- **Icons**: Font Awesome
- **Real-time Communication**: Socket.IO

## Prerequisites

- Node.js (v18.x recommended)
- npm or yarn package manager

## Environment Setup

1. Clone the repository
2. Navigate to the frontend directory
3. Install dependencies:

```bash
npm install
```

4. Set up environment variables by creating a `.env` file based on `.env.stage`:

```
VITE_API_URL=http://localhost:5000/api
```

## Running the Application

### Development Mode

Standard development mode:
```bash
npm run dev
```

Development with staging environment variables:
```bash
npm run dev:stage
```

### Production Build

Build the application:
```bash
npm run build
```

Build with staging configuration:
```bash
npm run build:stage
```

Preview the production build:
```bash
npm run preview
```

### Code Quality

Run ESLint:
```bash
npm run lint
```

## Connection to Backend

The frontend communicates with the backend API located at `http://localhost:5000/api` by default (configurable via environment variables).

## Features

- User authentication
- Patent search and management
- Patent list customization
- Real-time data updates via WebSockets

## Browser Support

This application supports all modern browsers including:
- Chrome
- Firefox
- Safari
- Edge

## Notes

- Make sure the backend server is running before interacting with the frontend application
- The application requires JavaScript to be enabled in the browser
