@echo off
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Starting Knowledge Base Web App...
echo.
echo The app will be available at: http://localhost:8080
echo Press Ctrl+C to stop the server
echo.

python server.py

pause