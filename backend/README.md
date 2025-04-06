# Patents Browser Backend

Backend API for the Patents Browser application.

## Environment Setup

### MongoDB Atlas Setup (Free Tier)

1. Create a MongoDB Atlas account at [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Create a new cluster (Free tier is sufficient)
3. Set up database access:
   - Create a new database user with password authentication
   - Make note of the username and password created
4. Set up network access:
   - Add your IP address to the IP Access List
   - For production deployment on Render, select "Allow Access from Anywhere" (0.0.0.0/0)
5. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<username>`, `<password>`, and `<dbname>` with your actual values
   
Example connection string:
```
mongodb+srv://patentsbrowser:<password>@cluster0.mongodb.net/patent_db?retryWrites=true&w=majority
```

### Environment Variables

Set the following environment variables in your deployment platform (Render):

| Variable | Description |
|----------|-------------|
| MONGODB_URI | MongoDB Atlas connection string |
| JWT_SECRET | Secret key for JWT token generation |
| EMAIL_USER | Gmail address for sending OTP emails |
| EMAIL_APP_PASSWORD | Gmail app password for OTP emails |
| SERP_API_KEY | API key for SERP API |
| RAZORPAY_KEY_ID | Razorpay API key ID |
| RAZORPAY_KEY_SECRET | Razorpay API key secret |
| RAZORPAY_WEBHOOK_SECRET | Razorpay webhook secret |
| FRONTEND_URL | URL of the frontend application |

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment on Render

This project includes a `render.yaml` file for easy deployment on Render.

1. Push your code to GitHub
2. Create a new Web Service in Render
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` configuration
5. Set the required environment variables in the Render dashboard
6. Deploy your application

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