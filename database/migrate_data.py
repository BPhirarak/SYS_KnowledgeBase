#!/usr/bin/env python3
"""
Data migration script to import existing knowledge cache into new database structure
"""

import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path

def migrate_existing_data(cache_file='knowledge_cache.json', db_path='database/knowledge_base.db'):
    """Migrate data from knowledge_cache.json to SQLite database"""
    
    if not os.path.exists(cache_file):
        print(f"Cache file not found: {cache_file}")
        return False
    
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}. Please run init_db.py first.")
        return False
    
    # Load existing cache data
    with open(cache_file, 'r', encoding='utf-8') as f:
        cache_data = json.load(f)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        for filename, data in cache_data.items():
            # Determine file path based on whether it's in docs/ folder
            if filename.lower().endswith(('.pdf', '.txt', '.csv', '.docx')):
                file_path = f"docs/{filename}"
                file_type = filename.split('.')[-1].upper()
                
                # Insert document
                cursor.execute("""
                    INSERT OR REPLACE INTO documents 
                    (filename, original_filename, title, file_type, file_path,
                     summary_en, summary_th, detailed_summary_en, detailed_summary_th,
                     insights_en, insights_th, created_at, modified_at, processed_at,
                     is_processed, groq_processed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    filename,
                    data.get('filename', filename),
                    data.get('title', ''),
                    file_type,
                    file_path,
                    data.get('summary', {}).get('en', {}).get('short', ''),
                    data.get('summary', {}).get('th', {}).get('short', ''),
                    data.get('summary', {}).get('en', {}).get('detailed', ''),
                    data.get('summary', {}).get('th', {}).get('detailed', ''),
                    json.dumps(data.get('insights', {}).get('en', [])),
                    json.dumps(data.get('insights', {}).get('th', [])),
                    datetime.now().isoformat(),
                    datetime.now().isoformat(),
                    data.get('processed_at', datetime.now().isoformat()),
                    True,
                    True
                ))
                
                document_id = cursor.lastrowid
                
                # Check if there's an associated podcast file
                podcast_filename = data.get('podcast_file')
                if podcast_filename:
                    podcast_path = f"podcasts/{podcast_filename}"
                    podcast_type = podcast_filename.split('.')[-1].upper()
                    
                    # Insert podcast
                    cursor.execute("""
                        INSERT OR REPLACE INTO podcasts
                        (filename, original_filename, title, file_type, file_path,
                         document_id, created_at, modified_at, is_processed)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        podcast_filename,
                        podcast_filename,
                        data.get('title', '') + ' (Audio)',
                        podcast_type,
                        podcast_path,
                        document_id,
                        datetime.now().isoformat(),
                        datetime.now().isoformat(),
                        True
                    ))
                
                # Auto-assign tags based on content
                auto_tags = determine_auto_tags(data)
                for tag_name in auto_tags:
                    # Get or create tag
                    cursor.execute("SELECT id FROM tags WHERE name = ?", (tag_name,))
                    tag_row = cursor.fetchone()
                    if tag_row:
                        tag_id = tag_row[0]
                        # Link document to tag
                        cursor.execute("""
                            INSERT OR IGNORE INTO document_tags (document_id, tag_id)
                            VALUES (?, ?)
                        """, (document_id, tag_id))
                
                print(f"Migrated: {filename}")
        
        conn.commit()
        print(f"Successfully migrated {len(cache_data)} files to database")
        return True
        
    except sqlite3.Error as e:
        print(f"Database error during migration: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def determine_auto_tags(data):
    """Determine appropriate tags for a document based on its content"""
    tags = []
    filename = data.get('filename', '').lower()
    title = data.get('title', '').lower()
    summary = data.get('summary', {}).get('en', {}).get('detailed', '').lower()
    insights = ' '.join(data.get('insights', {}).get('en', [])).lower()
    
    content = f"{filename} {title} {summary} {insights}"
    
    # AI/ML related
    if any(term in content for term in ['ai', 'machine learning', 'neural', 'algorithm', 'data mining']):
        tags.append('AI/Machine Learning')
    
    # Manufacturing related
    if any(term in content for term in ['manufacturing', 'industrial', 'production', 'steel', 'ladle']):
        tags.append('Manufacturing')
    
    # Quality control
    if any(term in content for term in ['quality', 'defect', 'contamination', 'control']):
        tags.append('Quality Control')
    
    # Process optimization
    if any(term in content for term in ['optimization', 'efficiency', 'process', 'improvement']):
        tags.append('Process Optimization')
    
    # Research documents
    if any(term in content for term in ['research', 'study', 'analysis', 'investigation']):
        tags.append('Research')
    
    # Technical documentation
    if any(term in content for term in ['technical', 'documentation', 'guide', 'manual']):
        tags.append('Technical Documentation')
    
    # Steel industry specific
    if any(term in content for term in ['steel', 'ladle', 'casting', 'metallurg']):
        tags.append('Steel Industry')
    
    # Sensor related
    if any(term in content for term in ['sensor', 'detection', 'monitoring']):
        tags.append('Sensors')
    
    # Temperature control
    if any(term in content for term in ['temperature', 'thermal', 'heating']):
        tags.append('Temperature Control')
    
    # Predictive maintenance
    if any(term in content for term in ['predictive', 'maintenance', 'failure', 'prediction']):
        tags.append('Predictive Maintenance')
    
    return tags

if __name__ == "__main__":
    success = migrate_existing_data()
    exit(0 if success else 1)