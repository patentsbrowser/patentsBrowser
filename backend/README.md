# EasySearchPatent Backend

A Node.js backend for the EasySearchPatent application with MongoDB integration.

## Tech Stack

- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Language**: TypeScript
- **Authentication**: JWT

## Prerequisites

- Node.js (v18.x recommended)
- MongoDB (running locally or accessible instance)
- npm or yarn package manager

## Environment Setup

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
npm install
```

4. Set up environment variables by creating a `.env` file based on `.env.stage`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/patent_db
JWT_SECRET=your_jwt_secret_key
SERP_API_KEY=your_serp_api_key
API_URL=http://localhost:5000/api
EMAIL_USER=your_email@example.com
EMAIL_APP_PASSWORD=your_app_password
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

Start the built application:
```bash
npm start
```

Start with staging configuration:
```bash
npm run start:stage
```

Build and start with staging configuration:
```bash
npm run build:stage
```

## Database Information

- **Database Type**: MongoDB
- **Default Connection String**: `mongodb://localhost:27017/patent_db`
- **Models**:
  - User
  - SavedPatent
  - CustomPatentList

## API Documentation

API endpoints are available at `http://localhost:5000/api` by default.

### File Uploads

The application supports extracting patent IDs from various file formats:

- Text files (.txt)
- Microsoft Word documents (.doc, .docx)
- Microsoft Excel spreadsheets (.xls, .xlsx)

Patent IDs are extracted using pattern matching and returned as an array.

## Notes

- Make sure MongoDB is running before starting the application
- The application uses JWT for authentication
- Email functionality is configured for OTP verification 
- Ensure the `uploads` directory exists for temporary file storage during file processing 