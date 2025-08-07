@echo off
echo ========================================
echo   Groq AI Knowledge Base Setup
echo ========================================
echo.
echo Please enter your Groq API Key from: https://console.groq.com/keys
echo.
set /p GROQ_API_KEY="Enter your GROQ API Key: "

echo.
echo Setting up environment variable...
setx GROQ_API_KEY "%GROQ_API_KEY%"

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Your Groq API Key has been saved.
echo Now restart your command prompt and run:
echo   run-dynamic.bat
echo.
echo The system will automatically use Groq AI to analyze new PDF files!
echo.
pause