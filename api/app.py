"""
Knowledge Base Flask App for Vercel Deployment
Serverless version of the Knowledge Base system
"""

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
import sqlite3
import json
import hashlib
from datetime import datetime
from pathlib import Path
import logging
import tempfile
import shutil

# Import existing AI processing functionality
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configuration for Vercel
DATABASE_PATH = '/tmp/knowledge_base.db'
DOCS_FOLDER = 'docs'
PODCASTS_FOLDER = 'podcasts'

# Ensure temp directories exist
os.makedirs('/tmp', exist_ok=True)

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

def init_database():
    """Initialize database with schema if not exists"""
    if not os.path.exists(DATABASE_PATH):
        conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
        conn.row_factory = sqlite3.Row
        
        # Read and execute schema
        try:
            with open('database/schema.sql', 'r', encoding='utf-8') as f:
                schema = f.read()
                conn.executescript(schema)
                conn.commit()
                print("Database initialized successfully")
        except Exception as e:
            print(f"Error initializing database: {e}")
        finally:
            conn.close()

def get_db_connection():
    """Get database connection"""
    # Initialize database if it doesn't exist
    if not os.path.exists(DATABASE_PATH):
        init_database()
    
    conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA synchronous = NORMAL')
    conn.execute('PRAGMA temp_store = memory')
    conn.execute('PRAGMA mmap_size = 268435456')  # 256MB
    return conn

@app.route('/')
def index():
    """Serve the main application page"""
    return send_file('index-enhanced.html')

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
        return jsonify({'documents': documents, 'podcasts': []})
        
    except Exception as e:
        logging.error(f"Error searching: {e}")
        return jsonify({'error': str(e)}), 500

# Chat API endpoints
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
            LIMIT 3
        """, search_params)
        
        relevant_docs = cursor.fetchall()
        
        # Prepare context from relevant documents
        context = ""
        source_ids = []
        
        if relevant_docs:
            context += "ข้อมูลที่เกี่ยวข้องจากเอกสารในฐานข้อมูล:\n\n"
            for doc in relevant_docs:
                context += f"เอกสาร: {doc['title']}\n"
                context += f"สรุป: {doc['summary_en'] or ''}\n"
                if doc['detailed_summary_en']:
                    context += f"รายละเอียด: {doc['detailed_summary_en'][:1000]}...\n"
                if doc['insights_en']:
                    try:
                        insights = json.loads(doc['insights_en'])
                        context += f"ข้อค้นพบสำคัญ: {', '.join(insights[:3])}\n"
                    except:
                        pass
                context += "\n---\n\n"
                source_ids.append(doc['id'])
        
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
            user_prompt = f"""คำถาม: {user_question}

ขออภัย ไม่พบเอกสารที่เกี่ยวข้องในฐานข้อมูล กรุณาลองถามคำถามอื่นที่เกี่ยวข้องกับเทคโนโลยีการผลิต การควบคุมคุณภาพ หรือการประยุกต์ใช้ AI ในอุตสาหกรรม"""
        
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

@app.route('/files/<path:filename>')
def serve_file(filename):
    """Serve uploaded files"""
    try:
        if filename.startswith('docs/'):
            return send_from_directory(DOCS_FOLDER, filename[5:])
        elif filename.startswith('podcasts/'):
            return send_from_directory(PODCASTS_FOLDER, filename[9:])
        else:
            return "File not found", 404
    except Exception as e:
        return jsonify({'error': str(e)}), 404

# Initialize database on startup
init_database()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))