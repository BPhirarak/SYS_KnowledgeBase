# Knowledge Base Deployment Guide

## Vercel Deployment

### Prerequisites

1. **GitHub Account** - Your project needs to be in a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Groq API Key** - Get your API key from [Groq Console](https://console.groq.com)

### Project Structure

The project has been prepared for Vercel deployment with these key files:

- `app.py` - Serverless Flask application
- `vercel.json` - Vercel configuration
- `requirements.txt` - Python dependencies
- `.gitignore` - Files to exclude from Git

### Deployment Steps

#### 1. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit - Knowledge Base with Quiz and Chat features"
```

#### 2. Create GitHub Repository

1. Go to GitHub and create a new repository
2. Add the remote origin:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

#### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and log in
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Other
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: `pip install -r requirements.txt`

#### 4. Configure Environment Variables

In Vercel dashboard, go to Project Settings > Environment Variables and add:

- **Variable Name**: `GROQ_API_KEY`
- **Value**: Your Groq API key
- **Environment**: Production, Preview, Development

#### 5. Database Initialization

The app will automatically create the SQLite database on first run. The database is stored in `/tmp/` on Vercel's serverless environment.

**Important Note**: Vercel's serverless functions are stateless, so the database will reset on each deployment. For production use, consider upgrading to a persistent database like PostgreSQL.

### Features Included

1. **Document Management**
   - Upload and view PDF documents
   - Tag system with color coding
   - Search functionality

2. **Quiz System**
   - Generate AI-powered quizzes from documents
   - 10 multiple-choice questions per document
   - Progress tracking and score calculation
   - Review answers with explanations

3. **ThothKB Chat**
   - AI assistant powered by Groq
   - RAG (Retrieval Augmented Generation) 
   - Document-based question answering
   - Chat session management

### File Structure

```
knowledge-base/
├── app.py                 # Main Flask application
├── vercel.json           # Vercel configuration
├── requirements.txt      # Python dependencies
├── .gitignore           # Git ignore rules
├── index-enhanced.html  # Frontend interface
├── database/
│   ├── schema.sql       # Database schema
│   └── migrate_quiz_chat.py  # Migration script
└── docs/                # Document storage
    └── (PDF files)
```

### Troubleshooting

#### Common Issues

1. **Database Locked Error**
   - The app includes timeout and WAL mode settings to handle this

2. **Environment Variables Not Set**
   - Ensure GROQ_API_KEY is properly configured in Vercel dashboard

3. **File Upload Issues**
   - Check file size limits and supported formats (PDF only)

4. **AI Features Not Working**
   - Verify Groq API key is valid and has sufficient credits

### Production Considerations

1. **Database Upgrade**: For persistent data, migrate to PostgreSQL or similar
2. **File Storage**: Use cloud storage (AWS S3, Cloudinary) for scalability
3. **Authentication**: Add user authentication for multi-user scenarios
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Monitoring**: Set up error tracking and performance monitoring

### Support

If you encounter issues:

1. Check Vercel deployment logs
2. Verify environment variables are set
3. Ensure all required files are in the repository
4. Test locally first using `python app.py`

### Local Development

To run locally:

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variable
set GROQ_API_KEY=your_api_key_here

# Run the application
python app.py
```

The application will be available at `http://localhost:8080`