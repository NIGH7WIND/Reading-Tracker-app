# app.py
from flask import Flask, render_template, request, jsonify, url_for, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from werkzeug.utils import secure_filename
import sys

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///progress.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

if getattr(sys, 'frozen', False):
    # If the app is running as a bundled .exe
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # If the app is running in development
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')

# Ensure the uploads folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

db = SQLAlchemy(app)

class Book(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    current_page = db.Column(db.Integer, default=0)
    total_pages = db.Column(db.Integer, nullable=False)
    reward = db.Column(db.String(200))
    date_added = db.Column(db.DateTime, default=datetime.utcnow)
    cover_image = db.Column(db.String(200))  # Store the filename

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'current_page': self.current_page,
            'total_pages': self.total_pages,
            'reward': self.reward,
            'progress': round((self.current_page / self.total_pages) * 100, 1) if self.total_pages > 0 else 0,
            'cover_image': url_for('get_image', filename=self.cover_image) if self.cover_image else None
        }

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/books', methods=['GET'])
def get_books():
    books = Book.query.all()
    return jsonify([book.to_dict() for book in books])

@app.route('/uploads/<filename>')
def get_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/books', methods=['POST'])
def add_book():
    title = request.form.get('title')
    total_pages = int(request.form.get('total_pages'))
    reward = request.form.get('reward')
    
    # Validate that current_page does not exceed total_pages
    current_page = 0  # Default to 0 when adding a new book
    if current_page > total_pages:
        return jsonify({"error": "Current page cannot exceed total pages."}), 400

    # Handle image upload
    cover_image = None
    if 'cover_image' in request.files:
        file = request.files['cover_image']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Add timestamp to filename to make it unique
            filename = f"{datetime.now().timestamp()}_{filename}"
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            cover_image = filename

    new_book = Book(
        title=title,
        total_pages=total_pages,
        reward=reward,
        cover_image=cover_image
    )
    db.session.add(new_book)
    db.session.commit()
    return jsonify(new_book.to_dict())

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_progress(book_id):
    book = Book.query.get_or_404(book_id)
    data = request.json
    current_page = data['current_page']
    
    # Validate that current_page does not exceed total_pages
    if current_page > book.total_pages:
        return jsonify({"error": "Current page cannot exceed total pages."}), 400

    book.current_page = current_page
    db.session.commit()
    return jsonify(book.to_dict())

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
