from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def hello():
    return '''
    <html>
    <head><title>Test Server</title></head>
    <body>
        <h1>🎉 Server ทำงานแล้ว!</h1>
        <p>หากเห็นข้อความนี้ แสดงว่า Flask server ทำงานปกติ</p>
        <p>Current directory: {}</p>
        <p>Files in KB folder:</p>
        <ul>
        {}
        </ul>
    </body>
    </html>
    '''.format(
        os.getcwd(),
        ''.join([f'<li>{f}</li>' for f in os.listdir('.')])
    )

if __name__ == '__main__':
    print("Starting simple test server...")
    print("Current directory:", os.getcwd()) 
    print("Open: http://localhost:8080")
    print("Press Ctrl+C to stop")
    app.run(host='127.0.0.1', port=8080, debug=True)