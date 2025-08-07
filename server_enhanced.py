#!/usr/bin/env python3
"""
Enhanced Flask server for Knowledge Base system with database integration
Features: File upload, database operations, tagging, search functionality
"""

from flask import Flask, request, jsonify, send_from_directory, redirect, url_for
from flask_cors import CORS
import os
import sqlite3
import json
import hashlib
from datetime import datetime
from pathlib import Path
import logging
from werkzeug.utils import secure_filename
import PyPDF2
import mimetypes

# Import existing AI processing functionality
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("Groq not available. AI processing will be disabled.")

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configuration
UPLOAD_FOLDER = 'uploads'
DOCS_FOLDER = 'docs'
PODCASTS_FOLDER = 'podcasts'
DATABASE_PATH = 'database/knowledge_base.db'
ALLOWED_DOC_EXTENSIONS = {'pdf', 'txt', 'csv', 'docx'}
ALLOWED_PODCAST_EXTENSIONS = {'mp3', 'wav', 'm4a', 'ogg'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Ensure directories exist
for folder in [UPLOAD_FOLDER, f"{UPLOAD_FOLDER}/docs", f"{UPLOAD_FOLDER}/podcasts", 
               DOCS_FOLDER, PODCASTS_FOLDER, "database"]:
    os.makedirs(folder, exist_ok=True)

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize Groq client if available
groq_client = None
if GROQ_AVAILABLE:
    groq_api_key = os.getenv('GROQ_API_KEY')
    if groq_api_key:
        try:
            groq_client = Groq(api_key=groq_api_key)
            print("Groq AI client initialized successfully")
        except Exception as e:
            print(f"Failed to initialize Groq client: {e}")
            groq_client = None

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA synchronous = NORMAL')
    conn.execute('PRAGMA temp_store = memory')
    conn.execute('PRAGMA mmap_size = 268435456')  # 256MB
    return conn

def allowed_file(filename, allowed_extensions):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def process_pdf_content(file_path):
    """Extract text from PDF for AI processing"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text[:8000]  # Limit text for AI processing
    except Exception as e:
        logging.error(f"Error reading PDF {file_path}: {e}")
        return ""

def generate_ai_summary_and_insights(text, filename):
    """Generate AI summary and insights using Groq"""
    if not groq_client or not text.strip():
        return None, None, None, None

    try:
        prompt = f"""
        Analyze this technical document: {filename}
        
        Content: {text}
        
        Provide a response in this exact JSON format:
        {{
            "title": "Clean document title",
            "summary_en_short": "Brief 1-2 sentence summary in English",
            "summary_en_detailed": "Detailed 3-4 sentence summary in English with technical details",
            "summary_th_short": "Brief 1-2 sentence summary in Thai",
            "summary_th_detailed": "Detailed 3-4 sentence summary in Thai with technical details",
            "insights_en": ["Insight 1 in English", "Insight 2 in English", "Insight 3 in English"],
            "insights_th": ["Insight 1 in Thai", "Insight 2 in Thai", "Insight 3 in Thai"]
        }}
        """

        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )
        
        response_text = completion.choices[0].message.content
        # Try to extract JSON from response
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        elif '{' in response_text:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            response_text = response_text[start:end]
        
        result = json.loads(response_text)
        return (result.get('title'), result.get('summary_en_short'), result.get('summary_en_detailed'),
                result.get('summary_th_short'), result.get('summary_th_detailed'),
                result.get('insights_en'), result.get('insights_th'))
        
    except Exception as e:
        logging.error(f"Error generating AI summary: {e}")
        return None, None, None, None, None, None, None

@app.route('/')
def index():
    """Serve the main application page"""
    return send_from_directory('.', 'index-enhanced.html')

@app.route('/api/knowledge-cards')
def get_knowledge_cards():
    """Legacy endpoint - redirect to documents API"""
    return get_documents()

@app.route('/api/documents')
def get_documents():
    """Get all documents with their tags"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get documents with tags and associated podcasts
        cursor.execute("""
            SELECT d.*, 
                   GROUP_CONCAT(DISTINCT t.name) as tags, 
                   GROUP_CONCAT(DISTINCT t.color) as tag_colors,
                   p.filename as podcast_file
            FROM documents d
            LEFT JOIN document_tags dt ON d.id = dt.document_id
            LEFT JOIN tags t ON dt.tag_id = t.id
            LEFT JOIN podcasts p ON d.id = p.document_id
            GROUP BY d.id
            ORDER BY d.created_at DESC
        """)
        
        documents = []
        for row in cursor.fetchall():
            doc = dict(row)
            doc['tags'] = row['tags'].split(',') if row['tags'] else []
            doc['tag_colors'] = row['tag_colors'].split(',') if row['tag_colors'] else []
            doc['insights_en'] = json.loads(doc['insights_en']) if doc['insights_en'] else []
            doc['insights_th'] = json.loads(doc['insights_th']) if doc['insights_th'] else []
            documents.append(doc)
        
        conn.close()
        return jsonify({'documents': documents})
        
    except Exception as e:
        logging.error(f"Error fetching documents: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/podcasts')
def get_podcasts():
    """Get all podcasts with their tags"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT p.*, d.title as document_title, GROUP_CONCAT(t.name) as tags
            FROM podcasts p
            LEFT JOIN documents d ON p.document_id = d.id
            LEFT JOIN podcast_tags pt ON p.id = pt.podcast_id
            LEFT JOIN tags t ON pt.tag_id = t.id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        """)
        
        podcasts = []
        for row in cursor.fetchall():
            podcast = dict(row)
            podcast['tags'] = row['tags'].split(',') if row['tags'] else []
            podcasts.append(podcast)
        
        conn.close()
        return jsonify({'podcasts': podcasts})
        
    except Exception as e:
        logging.error(f"Error fetching podcasts: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tags')
def get_tags():
    """Get all available tags"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tags ORDER BY name")
        tags = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'tags': tags})
    except Exception as e:
        logging.error(f"Error fetching tags: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search')
def search():
    """Search documents and podcasts"""
    query = request.args.get('q', '').strip()
    tags = request.args.getlist('tags')
    
    if not query and not tags:
        return jsonify({'documents': [], 'podcasts': []})
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Search documents
        doc_conditions = []
        doc_params = []
        
        if query:
            doc_conditions.append("""
                (d.title LIKE ? OR d.summary_en LIKE ? OR d.detailed_summary_en LIKE ? 
                 OR d.summary_th LIKE ? OR d.detailed_summary_th LIKE ?)
            """)
            search_param = f'%{query}%'
            doc_params.extend([search_param] * 5)
        
        if tags:
            placeholders = ','.join(['?' for _ in tags])
            doc_conditions.append(f"t.name IN ({placeholders})")
            doc_params.extend(tags)
        
        doc_query = f"""
            SELECT DISTINCT d.*, GROUP_CONCAT(t.name) as tags, GROUP_CONCAT(t.color) as tag_colors
            FROM documents d
            LEFT JOIN document_tags dt ON d.id = dt.document_id
            LEFT JOIN tags t ON dt.tag_id = t.id
            WHERE {' AND '.join(doc_conditions) if doc_conditions else '1=1'}
            GROUP BY d.id
            ORDER BY d.created_at DESC
        """
        
        cursor.execute(doc_query, doc_params)
        documents = []
        for row in cursor.fetchall():
            doc = dict(row)
            doc['tags'] = row['tags'].split(',') if row['tags'] else []
            doc['tag_colors'] = row['tag_colors'].split(',') if row['tag_colors'] else []
            doc['insights_en'] = json.loads(doc['insights_en']) if doc['insights_en'] else []
            doc['insights_th'] = json.loads(doc['insights_th']) if doc['insights_th'] else []
            documents.append(doc)
        
        conn.close()
        return jsonify({'documents': documents, 'podcasts': []})  # Podcast search can be added later
        
    except Exception as e:
        logging.error(f"Error searching: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload/document', methods=['POST'])
def upload_document():
    """Upload a document file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename, ALLOWED_DOC_EXTENSIONS):
        return jsonify({'error': 'File type not allowed'}), 400
    
    try:
        # Secure filename and save to uploads folder first
        original_filename = file.filename
        filename = secure_filename(original_filename)
        
        # Add timestamp to avoid conflicts
        name, ext = os.path.splitext(filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}{ext}"
        
        upload_path = os.path.join(UPLOAD_FOLDER, 'docs', filename)
        file.save(upload_path)
        
        # Get file info
        file_size = os.path.getsize(upload_path)
        file_type = filename.split('.')[-1].upper()
        
        # Process file content for AI analysis
        content = ""
        if file_type == 'PDF':
            content = process_pdf_content(upload_path)
        
        # Generate AI summary if available
        title, summary_en_short, summary_en_detailed, summary_th_short, summary_th_detailed, insights_en, insights_th = \
            generate_ai_summary_and_insights(content, original_filename) if content else (None, None, None, None, None, None, None)
        
        # Move file to permanent location
        final_path = os.path.join(DOCS_FOLDER, filename)
        os.rename(upload_path, final_path)
        
        # Save to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO documents 
            (filename, original_filename, title, file_type, file_path, file_size,
             summary_en, summary_th, detailed_summary_en, detailed_summary_th,
             insights_en, insights_th, is_processed, groq_processed, processed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            filename, original_filename,
            title or original_filename.rsplit('.', 1)[0],
            file_type, f"docs/{filename}", file_size,
            summary_en_short or '', summary_th_short or '',
            summary_en_detailed or '', summary_th_detailed or '',
            json.dumps(insights_en or []), json.dumps(insights_th or []),
            bool(content), bool(groq_client and content),
            datetime.now().isoformat() if content else None
        ))
        
        document_id = cursor.lastrowid
        
        # Auto-assign tags based on content
        if content:
            from database.migrate_data import determine_auto_tags
            auto_tags = determine_auto_tags({
                'filename': filename,
                'title': title or original_filename,
                'summary': {
                    'en': {
                        'detailed': summary_en_detailed or ''
                    }
                },
                'insights': {
                    'en': insights_en or []
                }
            })
            
            # Add tags to document
            for tag_name in auto_tags:
                cursor.execute("SELECT id FROM tags WHERE name = ?", (tag_name,))
                tag_row = cursor.fetchone()
                if tag_row:
                    tag_id = tag_row[0]
                    cursor.execute("""
                        INSERT OR IGNORE INTO document_tags (document_id, tag_id)
                        VALUES (?, ?)
                    """, (document_id, tag_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'document_id': document_id,
            'filename': filename,
            'message': 'Document uploaded successfully'
        })
        
    except Exception as e:
        logging.error(f"Error uploading document: {e}")
        # Clean up file if it exists
        try:
            if 'upload_path' in locals() and os.path.exists(upload_path):
                os.remove(upload_path)
            if 'final_path' in locals() and os.path.exists(final_path):
                os.remove(final_path)
        except:
            pass
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload/podcast', methods=['POST'])
def upload_podcast():
    """Upload a podcast file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    document_id = request.form.get('document_id')
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename, ALLOWED_PODCAST_EXTENSIONS):
        return jsonify({'error': 'File type not allowed'}), 400
    
    try:
        original_filename = file.filename
        filename = secure_filename(original_filename)
        
        # Add timestamp to avoid conflicts
        name, ext = os.path.splitext(filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}{ext}"
        
        final_path = os.path.join(PODCASTS_FOLDER, filename)
        file.save(final_path)
        
        file_size = os.path.getsize(final_path)
        file_type = filename.split('.')[-1].upper()
        
        # Save to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO podcasts 
            (filename, original_filename, title, file_type, file_path, file_size, document_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            filename, original_filename,
            original_filename.rsplit('.', 1)[0],
            file_type, f"podcasts/{filename}", file_size,
            document_id if document_id else None
        ))
        
        podcast_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'podcast_id': podcast_id,
            'filename': filename,
            'message': 'Podcast uploaded successfully'
        })
        
    except Exception as e:
        logging.error(f"Error uploading podcast: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete/document/<int:document_id>', methods=['DELETE'])
def delete_document(document_id):
    """Delete a document and its associated files"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get document info
        cursor.execute("SELECT * FROM documents WHERE id = ?", (document_id,))
        document = cursor.fetchone()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Delete associated podcasts first
        cursor.execute("SELECT file_path FROM podcasts WHERE document_id = ?", (document_id,))
        podcast_files = [row[0] for row in cursor.fetchall()]
        
        # Delete physical files
        if os.path.exists(document['file_path']):
            os.remove(document['file_path'])
        
        for podcast_file in podcast_files:
            if os.path.exists(podcast_file):
                os.remove(podcast_file)
        
        # Delete from database (cascading deletes will handle relationships)
        cursor.execute("DELETE FROM documents WHERE id = ?", (document_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Document deleted successfully'})
        
    except Exception as e:
        logging.error(f"Error deleting document: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tags', methods=['POST'])
def create_tag():
    """Create a new tag"""
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'error': 'Tag name required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO tags (name, color) VALUES (?, ?)
        """, (data['name'], data.get('color', '#3B82F6')))
        
        tag_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'tag_id': tag_id})
        
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Tag already exists'}), 400
    except Exception as e:
        logging.error(f"Error creating tag: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<int:document_id>/tags', methods=['POST'])
def add_document_tag(document_id):
    """Add tag to document"""
    data = request.get_json()
    if not data or 'tag_id' not in data:
        return jsonify({'error': 'Tag ID required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)
        """, (document_id, data['tag_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        logging.error(f"Error adding tag to document: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<int:document_id>/tags/<int:tag_id>', methods=['DELETE'])
def remove_document_tag(document_id, tag_id):
    """Remove tag from document"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?
        """, (document_id, tag_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        logging.error(f"Error removing tag from document: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/files/<path:filename>')
def serve_file(filename):
    """Serve uploaded files"""
    if filename.startswith('docs/'):
        return send_from_directory(DOCS_FOLDER, filename[5:])
    elif filename.startswith('podcasts/'):
        return send_from_directory(PODCASTS_FOLDER, filename[9:])
    else:
        return "File not found", 404

# Quiz API endpoints
@app.route('/api/quiz/generate/<int:document_id>', methods=['POST'])
def generate_quiz(document_id):
    """Generate a quiz for a specific document using Groq AI"""
    if not groq_client:
        return jsonify({'error': 'AI service not available'}), 503
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get document details
        cursor.execute("SELECT * FROM documents WHERE id = ?", (document_id,))
        document = cursor.fetchone()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Check if quiz already exists
        cursor.execute("SELECT id FROM quizzes WHERE document_id = ?", (document_id,))
        existing_quiz = cursor.fetchone()
        
        if existing_quiz:
            return jsonify({'error': 'Quiz already exists for this document'}), 400
        
        # Prepare content for AI processing
        content = f"""
        Title: {document['title']}
        Summary (English): {document['detailed_summary_en'] or document['summary_en'] or ''}
        Insights: {document['insights_en'] or '[]'}
        """
        
        # Generate quiz questions using Groq
        prompt = f"""
        Based on the following document content, create a 10-question multiple choice quiz in Thai language.
        
        Document Content:
        {content}
        
        Please provide the response in this exact JSON format:
        {{
            "title": "Quiz title in Thai",
            "description": "Brief description of the quiz in Thai",
            "questions": [
                {{
                    "question": "Question text in Thai",
                    "options": {{
                        "A": "Option A in Thai",
                        "B": "Option B in Thai", 
                        "C": "Option C in Thai",
                        "D": "Option D in Thai"
                    }},
                    "correct_answer": "A",
                    "explanation": "Explanation of correct answer in Thai"
                }}
            ]
        }}
        
        Make sure to create exactly 10 questions that test understanding of the key concepts, insights, and important details from the document.
        """
        
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=4000
        )
        
        response_text = completion.choices[0].message.content
        
        # Extract JSON from response
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        elif '{' in response_text:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            response_text = response_text[start:end]
        
        quiz_data = json.loads(response_text)
        
        # Save quiz to database
        cursor.execute("""
            INSERT INTO quizzes (document_id, title, description, total_questions)
            VALUES (?, ?, ?, ?)
        """, (document_id, quiz_data['title'], quiz_data.get('description', ''), len(quiz_data['questions'])))
        
        quiz_id = cursor.lastrowid
        
        # Save questions
        for i, question in enumerate(quiz_data['questions']):
            cursor.execute("""
                INSERT INTO quiz_questions 
                (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                quiz_id,
                question['question'],
                question['options']['A'],
                question['options']['B'],
                question['options']['C'],
                question['options']['D'],
                question['correct_answer'],
                question.get('explanation', ''),
                i + 1
            ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'quiz_id': quiz_id,
            'message': 'Quiz generated successfully'
        })
        
    except Exception as e:
        logging.error(f"Error generating quiz: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/<int:document_id>')
def get_quiz(document_id):
    """Get quiz for a specific document"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get quiz info
        cursor.execute("SELECT * FROM quizzes WHERE document_id = ?", (document_id,))
        quiz = cursor.fetchone()
        
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        # Get questions
        cursor.execute("""
            SELECT * FROM quiz_questions 
            WHERE quiz_id = ? 
            ORDER BY question_order
        """, (quiz['id'],))
        
        questions = []
        for row in cursor.fetchall():
            questions.append({
                'id': row['id'],
                'question': row['question_text'],
                'options': {
                    'A': row['option_a'],
                    'B': row['option_b'],
                    'C': row['option_c'],
                    'D': row['option_d']
                },
                'order': row['question_order']
            })
        
        conn.close()
        
        return jsonify({
            'quiz': {
                'id': quiz['id'],
                'title': quiz['title'],
                'description': quiz['description'],
                'total_questions': quiz['total_questions'],
                'questions': questions
            }
        })
        
    except Exception as e:
        logging.error(f"Error fetching quiz: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/<int:quiz_id>/submit', methods=['POST'])
def submit_quiz(quiz_id):
    """Submit quiz answers and get results"""
    try:
        data = request.get_json()
        if not data or 'answers' not in data:
            return jsonify({'error': 'Answers required'}), 400
        
        user_answers = data['answers']  # {question_id: selected_option}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get quiz and questions
        cursor.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
        quiz = cursor.fetchone()
        
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        cursor.execute("""
            SELECT id, correct_answer, explanation 
            FROM quiz_questions 
            WHERE quiz_id = ? 
            ORDER BY question_order
        """, (quiz_id,))
        
        questions = cursor.fetchall()
        
        # Calculate score
        correct_count = 0
        results = []
        
        for question in questions:
            question_id = str(question['id'])
            user_answer = user_answers.get(question_id, '')
            is_correct = user_answer == question['correct_answer']
            
            if is_correct:
                correct_count += 1
                
            results.append({
                'question_id': question['id'],
                'user_answer': user_answer,
                'correct_answer': question['correct_answer'],
                'is_correct': is_correct,
                'explanation': question['explanation']
            })
        
        score = (correct_count / len(questions)) * 100 if questions else 0
        
        # Save attempt
        cursor.execute("""
            INSERT INTO quiz_attempts (quiz_id, user_identifier, score, total_questions, answers)
            VALUES (?, ?, ?, ?, ?)
        """, (quiz_id, 'anonymous', int(score), len(questions), json.dumps(user_answers)))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'score': int(score),
            'correct_count': correct_count,
            'total_questions': len(questions),
            'results': results
        })
        
    except Exception as e:
        logging.error(f"Error submitting quiz: {e}")
        return jsonify({'error': str(e)}), 500

# ThothKB Chat API endpoints
@app.route('/api/chat/session', methods=['POST'])
def create_chat_session():
    """Create a new chat session"""
    try:
        import uuid
        session_id = str(uuid.uuid4())
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO chat_sessions (session_id) VALUES (?)
        """, (session_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'session_id': session_id})
        
    except Exception as e:
        logging.error(f"Error creating chat session: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/<session_id>/messages')
def get_chat_messages(session_id):
    """Get chat messages for a session"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM chat_messages 
            WHERE session_id = ? 
            ORDER BY created_at ASC
        """, (session_id,))
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                'id': row['id'],
                'type': row['message_type'],
                'content': row['content'],
                'sources': json.loads(row['sources']) if row['sources'] else [],
                'timestamp': row['created_at']
            })
        
        conn.close()
        return jsonify({'messages': messages})
        
    except Exception as e:
        logging.error(f"Error fetching chat messages: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/<session_id>/ask', methods=['POST'])
def ask_thothkb(session_id):
    """Process user question using RAG with document knowledge base"""
    if not groq_client:
        return jsonify({'error': 'AI service not available'}), 503
    
    try:
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({'error': 'Question required'}), 400
        
        user_question = data['question']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update session activity
        cursor.execute("""
            UPDATE chat_sessions 
            SET last_activity = CURRENT_TIMESTAMP 
            WHERE session_id = ?
        """, (session_id,))
        
        # Save user message
        cursor.execute("""
            INSERT INTO chat_messages (session_id, message_type, content)
            VALUES (?, 'user', ?)
        """, (session_id, user_question))
        
        # Search relevant documents using improved keyword matching
        search_terms = user_question.lower().split()
        search_conditions = []
        search_params = []
        
        # Create individual search conditions for each term
        for term in search_terms:
            if len(term) >= 2:  # Skip very short terms
                search_conditions.append("""
                    LOWER(d.title || ' ' || COALESCE(d.summary_en, '') || ' ' || 
                          COALESCE(d.detailed_summary_en, '') || ' ' || 
                          COALESCE(d.summary_th, '') || ' ' || 
                          COALESCE(d.detailed_summary_th, '')) LIKE ?
                """)
                search_params.append(f'%{term}%')
        
        # If no good search terms, search more broadly
        if not search_conditions:
            search_conditions.append("""
                LOWER(d.title || ' ' || COALESCE(d.summary_en, '') || ' ' || 
                      COALESCE(d.detailed_summary_en, '')) LIKE ?
            """)
            search_params.append(f'%{user_question.lower()}%')
        
        # Combine conditions with OR
        where_clause = ' OR '.join(search_conditions)
        
        cursor.execute(f"""
            SELECT d.id, d.title, d.summary_en, d.detailed_summary_en, d.insights_en,
                   d.summary_th, d.detailed_summary_th, d.insights_th
            FROM documents d
            WHERE {where_clause}
            ORDER BY d.created_at DESC
            LIMIT 5
        """, search_params)
        
        relevant_docs = cursor.fetchall()
        logging.info(f"Search terms: {search_terms}")
        logging.info(f"Found {len(relevant_docs)} relevant documents")
        
        # Prepare context from relevant documents
        context = ""
        source_ids = []
        
        if relevant_docs:
            context += "ข้อมูลที่เกี่ยวข้องจากเอกสารในฐานข้อมูล:\n\n"
            for doc in relevant_docs:
                context += f"เอกสาร: {doc['title']}\n"
                context += f"สรุป: {doc['summary_en'] or ''}\n"
                if doc['detailed_summary_en']:
                    context += f"รายละเอียด: {doc['detailed_summary_en'][:1000]}...\n"  # Limit context length
                if doc['insights_en']:
                    try:
                        insights = json.loads(doc['insights_en'])
                        context += f"ข้อค้นพบสำคัญ: {', '.join(insights[:3])}\n"
                    except:
                        pass
                context += "\n---\n\n"
                source_ids.append(doc['id'])
            logging.info(f"Generated context length: {len(context)} characters")
        
        # Create AI prompt
        system_prompt = """คุณคือ ThothKB ผู้ช่วยอัจฉริยะที่เชี่ยวชาญในการค้นหาและตอบคำถามจากฐานความรู้เกี่ยวกับเทคโนโลยี การผลิต และ AI 

หลักการตอบคำถาม:
1. ใช้ข้อมูลจากเอกสารในฐานข้อมูลเป็นหลัก
2. ตอบเป็นภาษาไทยที่เข้าใจง่าย
3. อ้างอิงเอกสารต้นทางเมื่อเป็นไปได้
4. หากไม่พบข้อมูลที่เกี่ยวข้อง ให้บอกตรงๆ และเสนอคำถามทางเลือก
5. ให้คำตอบที่ครอบคลุมและมีประโยชน์"""
        
        if context:
            user_prompt = f"""ตอบคำถามต่อไปนี้โดยอิงจากข้อมูลที่ให้มา:

{context}

คำถาม: {user_question}

กรุณาตอบอย่างละเอียดและอ้างอิงเอกสารต้นทางที่เกี่ยวข้อง"""
        else:
            # Try to get all documents as fallback
            cursor.execute("""
                SELECT d.id, d.title, d.summary_en, d.detailed_summary_en, d.insights_en
                FROM documents d
                ORDER BY d.created_at DESC
                LIMIT 3
            """)
            all_docs = cursor.fetchall()
            
            if all_docs:
                context = "ข้อมูลจากเอกสารในฐานข้อมูล:\n\n"
                source_ids = []
                for doc in all_docs:
                    context += f"เอกสาร: {doc['title']}\n"
                    context += f"สรุป: {doc['summary_en'] or ''}\n"
                    context += "\n---\n\n"
                    source_ids.append(doc['id'])
                
                user_prompt = f"""ตอบคำถามต่อไปนี้โดยใช้ข้อมูลจากเอกสารที่มี (ถ้าเกี่ยวข้อง):

{context}

คำถาม: {user_question}

หากข้อมูลในเอกสารไม่เกี่ยวข้องโดยตรง กรุณาแจ้งและแนะนำว่าควรถามคำถามประเภทใด"""
            else:
                user_prompt = f"""คำถาม: {user_question}

ขออภัย ไม่พบเอกสารในฐานข้อมูล กรุณาลองถามคำถามอื่นที่เกี่ยวข้องกับเทคโนโลยีการผลิต การควบคุมคุณภาพ หรือการประยุกต์ใช้ AI ในอุตสาหกรรม"""
        
        # Get AI response
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        ai_response = completion.choices[0].message.content
        
        # Save AI response
        cursor.execute("""
            INSERT INTO chat_messages (session_id, message_type, content, sources)
            VALUES (?, 'assistant', ?, ?)
        """, (session_id, ai_response, json.dumps(source_ids)))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'sources': source_ids
        })
        
    except Exception as e:
        logging.error(f"Error processing chat question: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=8080)