-- Knowledge Base Database Schema
-- Created: 2025-08-06
-- Purpose: Store documents, podcasts, tags, and metadata for the KB system

-- Documents table
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    title TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('PDF', 'TXT', 'CSV', 'DOCX')),
    file_size INTEGER,
    file_path TEXT NOT NULL,
    summary_en TEXT,
    summary_th TEXT,
    detailed_summary_en TEXT,
    detailed_summary_th TEXT,
    insights_en TEXT, -- JSON array of insights
    insights_th TEXT, -- JSON array of insights
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    is_processed BOOLEAN DEFAULT FALSE,
    groq_processed BOOLEAN DEFAULT FALSE
);

-- Podcasts table
CREATE TABLE podcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    title TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('MP3', 'WAV', 'M4A', 'OGG')),
    file_size INTEGER,
    file_path TEXT NOT NULL,
    duration INTEGER, -- in seconds
    transcript TEXT,
    summary_en TEXT,
    summary_th TEXT,
    document_id INTEGER, -- Link to related document
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    is_processed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- Tags table
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3B82F6', -- Default blue color
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document-Tags junction table (many-to-many relationship)
CREATE TABLE document_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(document_id, tag_id)
);

-- Podcast-Tags junction table (many-to-many relationship)
CREATE TABLE podcast_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    podcast_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(podcast_id, tag_id)
);

-- Search index table for full-text search
CREATE TABLE search_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER,
    podcast_id INTEGER,
    content_type TEXT NOT NULL CHECK (content_type IN ('document', 'podcast')),
    searchable_content TEXT NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('en', 'th')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_documents_filename ON documents(filename);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_is_processed ON documents(is_processed);

CREATE INDEX idx_podcasts_filename ON podcasts(filename);
CREATE INDEX idx_podcasts_document_id ON podcasts(document_id);
CREATE INDEX idx_podcasts_created_at ON podcasts(created_at);

CREATE INDEX idx_tags_name ON tags(name);

CREATE INDEX idx_document_tags_document_id ON document_tags(document_id);
CREATE INDEX idx_document_tags_tag_id ON document_tags(tag_id);

CREATE INDEX idx_podcast_tags_podcast_id ON podcast_tags(podcast_id);
CREATE INDEX idx_podcast_tags_tag_id ON podcast_tags(tag_id);

CREATE INDEX idx_search_content_type ON search_index(content_type);
CREATE INDEX idx_search_language ON search_index(language);

-- Insert default tags
INSERT INTO tags (name, color) VALUES 
    ('AI/Machine Learning', '#3B82F6'),
    ('Manufacturing', '#EF4444'),
    ('Quality Control', '#10B981'),
    ('Process Optimization', '#F59E0B'),
    ('Research', '#8B5CF6'),
    ('Technical Documentation', '#6B7280'),
    ('Steel Industry', '#DC2626'),
    ('Sensors', '#059669'),
    ('Temperature Control', '#D97706'),
    ('Predictive Maintenance', '#7C3AED');

-- Triggers to update modified_at timestamp
CREATE TRIGGER update_documents_modified_at 
    AFTER UPDATE ON documents
    FOR EACH ROW
    BEGIN
        UPDATE documents SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_podcasts_modified_at 
    AFTER UPDATE ON podcasts
    FOR EACH ROW
    BEGIN
        UPDATE podcasts SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger to update search index when documents are updated
CREATE TRIGGER update_search_index_documents
    AFTER UPDATE ON documents
    FOR EACH ROW
    BEGIN
        DELETE FROM search_index WHERE document_id = NEW.id;
        INSERT INTO search_index (document_id, content_type, searchable_content, language)
        VALUES 
            (NEW.id, 'document', NEW.title || ' ' || COALESCE(NEW.summary_en, '') || ' ' || COALESCE(NEW.detailed_summary_en, ''), 'en'),
            (NEW.id, 'document', NEW.title || ' ' || COALESCE(NEW.summary_th, '') || ' ' || COALESCE(NEW.detailed_summary_th, ''), 'th');
    END;

-- Trigger to update search index when podcasts are updated
CREATE TRIGGER update_search_index_podcasts
    AFTER UPDATE ON podcasts
    FOR EACH ROW
    BEGIN
        DELETE FROM search_index WHERE podcast_id = NEW.id;
        INSERT INTO search_index (podcast_id, content_type, searchable_content, language)
        VALUES 
            (NEW.id, 'podcast', NEW.title || ' ' || COALESCE(NEW.transcript, '') || ' ' || COALESCE(NEW.summary_en, ''), 'en'),
            (NEW.id, 'podcast', NEW.title || ' ' || COALESCE(NEW.transcript, '') || ' ' || COALESCE(NEW.summary_th, ''), 'th');
    END;

-- Quiz tables
CREATE TABLE quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    total_questions INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    question_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    user_identifier TEXT, -- Could be session ID or user ID in future
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answers TEXT, -- JSON object storing user answers
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Chat history table for ThothKB
CREATE TABLE chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources TEXT, -- JSON array of document IDs that were referenced
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
);

-- Indexes for quiz tables
CREATE INDEX idx_quizzes_document_id ON quizzes(document_id);
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_order ON quiz_questions(question_order);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_completed_at ON quiz_attempts(completed_at);

-- Indexes for chat tables
CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX idx_chat_sessions_last_activity ON chat_sessions(last_activity);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);