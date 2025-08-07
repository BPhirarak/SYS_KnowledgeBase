#!/usr/bin/env python3
"""
Database initialization script for Knowledge Base system
Creates SQLite database and tables from schema
"""

import sqlite3
import os
from pathlib import Path

def init_database(db_path='database/knowledge_base.db'):
    """Initialize the SQLite database with schema"""
    # Ensure database directory exists
    db_dir = os.path.dirname(db_path)
    os.makedirs(db_dir, exist_ok=True)
    
    # Read schema from file
    schema_path = Path(db_dir) / 'schema.sql'
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")
    
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    # Create database and execute schema
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(schema_sql)
        conn.commit()
        print(f"Database initialized successfully: {db_path}")
        
        # Verify tables were created
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Created tables: {', '.join(tables)}")
        
        return True
    except sqlite3.Error as e:
        print(f"Error initializing database: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = init_database()
    exit(0 if success else 1)