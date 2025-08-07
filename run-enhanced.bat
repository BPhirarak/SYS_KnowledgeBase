@echo off
echo Starting Enhanced Knowledge Base Server...
echo.
echo Installing/updating requirements...
pip install -r requirements.txt

echo.
echo Initializing database if needed...
python database/init_db.py

echo.
echo Starting server at http://localhost:8080
echo Press Ctrl+C to stop the server
echo.
python server_enhanced.py

pause