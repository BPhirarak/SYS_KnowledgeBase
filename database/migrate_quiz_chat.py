#!/usr/bin/env python3
"""
Migration script to add quiz and chat tables to existing database
Run this to add new features without losing existing data
"""

import sqlite3
import os
import sys

DATABASE_PATH = 'database/knowledge_base.db'

def migrate_database():
    """Add quiz and chat tables to existing database"""
    if not os.path.exists(DATABASE_PATH):
        print(f"Error: Database file {DATABASE_PATH} not found!")
        return False
    
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        print("Adding quiz and chat tables...")
        
        # Check if tables already exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='quizzes'")
        if cursor.fetchone():
            print("Quiz tables already exist, skipping quiz migration...")
        else:
            # Create quiz tables
            print("Creating quiz tables...")
            
            cursor.execute("""
                CREATE TABLE quizzes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    document_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    total_questions INTEGER DEFAULT 10,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
                )
            """)
            
            cursor.execute("""
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
                )
            """)
            
            cursor.execute("""
                CREATE TABLE quiz_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quiz_id INTEGER NOT NULL,
                    user_identifier TEXT,
                    score INTEGER NOT NULL,
                    total_questions INTEGER NOT NULL,
                    answers TEXT,
                    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
                )
            """)
            
            # Create quiz indexes
            cursor.execute("CREATE INDEX idx_quizzes_document_id ON quizzes(document_id)")
            cursor.execute("CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id)")
            cursor.execute("CREATE INDEX idx_quiz_questions_order ON quiz_questions(question_order)")
            cursor.execute("CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id)")
            cursor.execute("CREATE INDEX idx_quiz_attempts_completed_at ON quiz_attempts(completed_at)")
            
            print("Quiz tables created successfully!")
        
        # Check if chat tables already exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'")
        if cursor.fetchone():
            print("Chat tables already exist, skipping chat migration...")
        else:
            # Create chat tables
            print("Creating chat tables...")
            
            cursor.execute("""
                CREATE TABLE chat_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                CREATE TABLE chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    sources TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
                )
            """)
            
            # Create chat indexes
            cursor.execute("CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id)")
            cursor.execute("CREATE INDEX idx_chat_sessions_last_activity ON chat_sessions(last_activity)")
            cursor.execute("CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id)")
            cursor.execute("CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at)")
            
            print("Chat tables created successfully!")
        
        conn.commit()
        conn.close()
        
        print("Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error during migration: {e}")
        return False

if __name__ == '__main__':
    if migrate_database():
        print("Database migration successful!")
        sys.exit(0)
    else:
        print("Database migration failed!")
        sys.exit(1)