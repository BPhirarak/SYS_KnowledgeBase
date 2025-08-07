# Knowledge Base Web App

A web application that creates interactive knowledge cards from PDF files with English/Thai language support and podcast integration.

## Features

- 📄 **PDF Processing**: Automatically reads and processes PDF files in the KB folder
- 🌐 **Bilingual Support**: Toggle between English and Thai content
- 📝 **Smart Summaries**: AI-generated summaries and key insights for each document
- 🎧 **Podcast Integration**: Automatically detects and plays corresponding audio files
- 🔄 **Auto-Refresh**: Monitors folder for new files and updates cards automatically
- 📱 **Responsive Design**: Mobile-friendly interface

## Quick Start

1. **Run the Application**:
   ```bash
   # Double-click run.bat or use command line:
   run.bat
   ```

2. **Open in Browser**:
   - Navigate to `http://localhost:5000`

3. **Add Content**:
   - Place PDF files in the `d:\KB\` folder
   - Add corresponding audio files (.wav, .mp3, .m4a) with matching names
   - Refresh the page to see new content

## File Structure

```
d:\KB\
├── index.html          # Main web app interface
├── styles.css          # Application styling
├── app.js              # Frontend JavaScript logic
├── server.py           # Python Flask backend
├── requirements.txt    # Python dependencies
├── run.bat            # Windows startup script
├── README.md          # This file
├── CLAUDE.md          # Claude Code guidance
├── *.pdf              # Your knowledge documents
└── *.wav/*.mp3        # Podcast files (optional)
```

## How It Works

1. **PDF Processing**: The app scans the KB folder for PDF files and extracts their content
2. **Content Generation**: Creates summaries and insights for each document
3. **Language Support**: Provides content in both English and Thai
4. **Audio Detection**: Automatically finds matching podcast files
5. **Card Creation**: Displays everything in beautiful, interactive cards

## Adding New Content

### PDF Documents
- Simply drop PDF files into the `d:\KB\` folder
- The app will automatically process them on the next refresh

### Podcast Files
- Add audio files with the **exact same name** as the PDF (but with audio extension)
- Supported formats: `.wav`, `.mp3`, `.m4a`
- Example: 
  - PDF: `my-document.pdf`
  - Audio: `my-document.wav` or `my-document.mp3`

## Language Toggle

- Click **EN** for English content
- Click **TH** for Thai content
- Your preference is automatically saved

## Technical Requirements

- Python 3.7+
- Modern web browser
- Internet connection (for PDF.js CDN)

## Troubleshooting

### Server Won't Start
- Make sure Python is installed
- Check that port 5000 is available
- Run `pip install -r requirements.txt` manually

### PDFs Not Processing
- Ensure PDF files are not corrupted
- Check file permissions
- Large files may take longer to process

### Audio Files Not Playing
- Verify audio file format (wav/mp3/m4a)
- Ensure filename exactly matches PDF name
- Check browser audio permissions

## Development

To modify the app:

1. **Frontend**: Edit `index.html`, `styles.css`, `app.js`
2. **Backend**: Modify `server.py`
3. **Styling**: Update CSS in `styles.css`

The app uses Flask for the backend and vanilla JavaScript for the frontend, making it easy to customize and extend.