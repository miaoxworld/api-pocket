# API Pocket

A web application for managing and proxying OpenAI-compatible API endpoints.

**Demo**:[API Pocket](https://api-pocket.xxworld.org/)

## Features

- **Endpoint Management**: Add, edit, delete, and toggle OpenAI-compatible API endpoints
- **API Key Management**: Create, manage, and monitor API keys for authentication
- **User Authentication**: Register, login, and user access control
- **OpenAI Compatibility**: Acts as a proxy for any OpenAI-compatible API
- **Usage Tracking**: Monitor API usage statistics and request logs

## Technologies

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB
- **Authentication**: NextAuth.js
- **Database**: MongoDB

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB instance (local or cloud)

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```
# MongoDB Connection
MONGODB_URI=mongodb://your-mongodb-uri

# NextAuth Configuration
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=your-random-secret-key

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/apimanager-nextjs.git
cd apimanager-nextjs
```

2. Install dependencies
```bash
npm install
```

3. Initialize the database (optional)
```bash
npm run init-db
```

4. Run the development server
```bash
npm run dev
```

5. Visit `http://localhost:3000` in your browser

## API Endpoints

### OpenAI Compatible Endpoints

The main OpenAI-compatible endpoint is:

```
/v1/chat/completions
```

This endpoint works exactly like the OpenAI API, accepting the same parameters and providing the same response format.

### Internal API Endpoints

- **Authentication**: `/api/auth/*` - NextAuth.js authentication endpoints
- **Endpoint Management**: `/api/endpoints/*` - Manage API configurations
- **API Keys**: `/api/keys/*` - Manage API keys

## Usage

1. Register an account or log in
2. Add an OpenAI-compatible API in the Endpoint Management section
3. Create API keys for the configured API
4. Use the keys to authenticate requests to `/v1/chat/completions`

## Development

### Project Structure

- `/app` - Next.js application and UI components
- `/app/api` - API routes and handlers
- `/lib` - Shared utilities and database connections
- `/public` - Static assets

### Code Conventions

- Use TypeScript for type safety
- Follow the ESLint configuration
- Use server components where possible

## License

MIT

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [MongoDB](https://www.mongodb.com/)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
