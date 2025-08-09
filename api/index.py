from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return {"message": "Hello from Knowledge Base API!", "status": "success"}

@app.route('/api/test')
def test():
    return {"test": "API is working", "status": "ok"}

if __name__ == '__main__':
    app.run()