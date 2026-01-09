from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
import os

app = Flask(__name__)

# ===== CRITICAL JWT Configuration =====
app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-key-change-in-production'
app.config['JWT_ALGORITHM'] = 'HS256'
app.config['JWT_DECODE_LEEWAY'] = 10
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# ===== Database Configuration (ONLY CHANGE) =====
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    'sqlite:///tracker.db'  # Local dev fallback
)

# Fix Render PostgreSQL URL format
if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ===== CORS Configuration for Multiple Devices =====
CORS(app,
    origins=["http://localhost:3000",
             "http://localhost:5173",
             "http://10.148.140.21:3000",
             "http://10.148.140.21:5173",
             "http://127.0.0.1:3000",
             "https://habit-tracker-1-whp5.onrender.com"],
    supports_credentials=True,
    allow_headers=['Content-Type', 'Authorization'],
    methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
)

from models import db, User, Habit, HabitCheckIn, Workout

db.init_app(app)
jwt = JWTManager(app)

# JWT error handlers
@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': 'Invalid token', 'message': str(error)}), 422

@jwt.unauthorized_loader
def unauthorized_callback(error):
    return jsonify({'error': 'Missing authorization header'}), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token expired'}), 401

with app.app_context():
    db.create_all()

# ============= AUTH ROUTES =============
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    
    # FIX: Pass user.id as string
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'User created successfully',
        'access_token': access_token,
        'user': user.to_dict()
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # FIX: Pass user.id as string
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200

# ============= HABITS ROUTES =============
@app.route('/api/habits', methods=['GET', 'POST'])
@jwt_required()
def habits():
    user_id = int(get_jwt_identity())
    
    if request.method == 'GET':
        habits = Habit.query.filter_by(user_id=user_id).all()
        return jsonify({'habits': [h.to_dict() for h in habits]}), 200
    
    if request.method == 'POST':
        data = request.get_json()
        
        if not data or not data.get('name'):
            return jsonify({'error': 'Habit name is required'}), 400
        
        habit = Habit(
            user_id=user_id,
            name=data['name'],
            description=data.get('description', '')
        )
        
        db.session.add(habit)
        db.session.commit()
        
        return jsonify({'message': 'Habit created', 'habit': habit.to_dict()}), 201

@app.route('/api/habits/<int:habit_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def habit_detail(habit_id):
    user_id = int(get_jwt_identity())
    habit = Habit.query.filter_by(id=habit_id, user_id=user_id).first()
    
    if not habit:
        return jsonify({'error': 'Habit not found'}), 404
    
    if request.method == 'GET':
        return jsonify({'habit': habit.to_dict()}), 200
    
    if request.method == 'PUT':
        data = request.get_json()
        habit.name = data.get('name', habit.name)
        habit.description = data.get('description', habit.description)
        db.session.commit()
        return jsonify({'message': 'Habit updated', 'habit': habit.to_dict()}), 200
    
    if request.method == 'DELETE':
        db.session.delete(habit)
        db.session.commit()
        return jsonify({'message': 'Habit deleted'}), 200

# ============= HABIT CHECK-INS =============
@app.route('/api/habits/<int:habit_id>/checkins', methods=['GET', 'POST'])
@jwt_required()
def habit_checkins(habit_id):
    user_id = int(get_jwt_identity())
    habit = Habit.query.filter_by(id=habit_id, user_id=user_id).first()
    
    if not habit:
        return jsonify({'error': 'Habit not found'}), 404
    
    if request.method == 'GET':
        checkins = HabitCheckIn.query.filter_by(habit_id=habit_id).all()
        return jsonify({'checkins': [c.to_dict() for c in checkins]}), 200
    
    if request.method == 'POST':
        data = request.get_json()
        checkin_date = date.fromisoformat(data.get('date', str(date.today())))
        
        existing = HabitCheckIn.query.filter_by(habit_id=habit_id, date=checkin_date).first()
        
        if existing:
            existing.completed = data.get('completed', True)
            db.session.commit()
            return jsonify({'message': 'Check-in updated', 'checkin': existing.to_dict()}), 200
        
        checkin = HabitCheckIn(
            habit_id=habit_id,
            date=checkin_date,
            completed=data.get('completed', True)
        )
        
        db.session.add(checkin)
        db.session.commit()
        
        return jsonify({'message': 'Check-in created', 'checkin': checkin.to_dict()}), 201

# ============= WORKOUTS ROUTES =============
@app.route('/api/workouts', methods=['GET', 'POST'])
@jwt_required()
def workouts():
    user_id = int(get_jwt_identity())
    
    if request.method == 'GET':
        workouts = Workout.query.filter_by(user_id=user_id).order_by(Workout.date.desc()).all()
        return jsonify({'workouts': [w.to_dict() for w in workouts]}), 200
    
    if request.method == 'POST':
        data = request.get_json()
        
        if not data or not data.get('exercise'):
            return jsonify({'error': 'Exercise name is required'}), 400
        
        workout = Workout(
            user_id=user_id,
            date=date.fromisoformat(data.get('date', str(date.today()))),
            exercise=data['exercise'],
            muscle_group=data.get('muscle_group'),
            sets=data.get('sets'),
            reps=data.get('reps'),
            weight=data.get('weight'),
            notes=data.get('notes', '')
        )
        
        db.session.add(workout)
        db.session.commit()
        
        return jsonify({'message': 'Workout logged', 'workout': workout.to_dict()}), 201

@app.route('/api/workouts/<int:workout_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def workout_detail(workout_id):
    user_id = int(get_jwt_identity())
    workout = Workout.query.filter_by(id=workout_id, user_id=user_id).first()
    
    if not workout:
        return jsonify({'error': 'Workout not found'}), 404
    
    if request.method == 'GET':
        return jsonify({'workout': workout.to_dict()}), 200
    
    if request.method == 'PUT':
        data = request.get_json()
        workout.exercise = data.get('exercise', workout.exercise)
        workout.muscle_group = data.get('muscle_group', workout.muscle_group)
        workout.sets = data.get('sets', workout.sets)
        workout.reps = data.get('reps', workout.reps)
        workout.weight = data.get('weight', workout.weight)
        workout.notes = data.get('notes', workout.notes)
        
        if data.get('date'):
            workout.date = date.fromisoformat(data['date'])
        
        db.session.commit()
        return jsonify({'message': 'Workout updated', 'workout': workout.to_dict()}), 200
    
    if request.method == 'DELETE':
        db.session.delete(workout)
        db.session.commit()
        return jsonify({'message': 'Workout deleted'}), 200

# ============= STATS/DASHBOARD =============
@app.route('/api/stats/dashboard', methods=['GET'])
@jwt_required()
def dashboard_stats():
    user_id = int(get_jwt_identity())
    
    habits = Habit.query.filter_by(user_id=user_id).all()
    today = date.today()
    
    habits_data = []
    for habit in habits:
        today_checkin = HabitCheckIn.query.filter_by(habit_id=habit.id, date=today).first()
        habits_data.append({
            **habit.to_dict(),
            'checked_today': today_checkin.completed if today_checkin else False
        })
    
    week_ago = today - timedelta(days=7)
    recent_workouts = Workout.query.filter(
        Workout.user_id == user_id,
        Workout.date >= week_ago
    ).order_by(Workout.date.desc()).all()
    
    month_ago = today - timedelta(days=30)
    muscle_stats = db.session.query(
        Workout.muscle_group,
        db.func.count(Workout.id).label('count')
    ).filter(
        Workout.user_id == user_id,
        Workout.date >= month_ago,
        Workout.muscle_group.isnot(None)
    ).group_by(Workout.muscle_group).all()
    
    return jsonify({
        'habits': habits_data,
        'recent_workouts': [w.to_dict() for w in recent_workouts],
        'muscle_group_stats': [{'muscle_group': m[0], 'count': m[1]} for m in muscle_stats]
    }), 200

# ============= RUN =============
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
