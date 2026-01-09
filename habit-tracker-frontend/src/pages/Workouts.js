import { useEffect, useState } from 'react';
import { getWorkouts, createWorkout, updateWorkout, deleteWorkout } from '../services/api';

const Workouts = () => {
  const [workouts, setWorkouts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [formData, setFormData] = useState({
    exercise: '',
    muscle_group: '',
    sets: '',
    reps: '',
    weight: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const response = await getWorkouts();
      setWorkouts(response.data.workouts);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWorkout) {
        await updateWorkout(editingWorkout.id, formData);
      } else {
        await createWorkout(formData);
      }
      setFormData({
        exercise: '',
        muscle_group: '',
        sets: '',
        reps: '',
        weight: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setShowForm(false);
      setEditingWorkout(null);
      loadWorkouts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (workout) => {
    setEditingWorkout(workout);
    setFormData({
      exercise: workout.exercise,
      muscle_group: workout.muscle_group || '',
      sets: workout.sets || '',
      reps: workout.reps || '',
      weight: workout.weight || '',
      date: workout.date,
      notes: workout.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this workout?')) {
      try {
        await deleteWorkout(id);
        loadWorkouts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Workouts</h1>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          {showForm ? 'Cancel' : '+ Log Workout'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Exercise name"
            value={formData.exercise}
            onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
            style={styles.input}
            required
          />
          <input
            type="text"
            placeholder="Muscle group (Chest, Back, Legs, etc.)"
            value={formData.muscle_group}
            onChange={(e) => setFormData({ ...formData, muscle_group: e.target.value })}
            style={styles.input}
          />
          <div style={styles.row}>
            <input
              type="number"
              placeholder="Sets"
              value={formData.sets}
              onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
              style={styles.smallInput}
            />
            <input
              type="number"
              placeholder="Reps"
              value={formData.reps}
              onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
              style={styles.smallInput}
            />
            <input
              type="number"
              step="0.5"
              placeholder="Weight (kg)"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              style={styles.smallInput}
            />
          </div>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            style={styles.input}
          />
          <button type="submit" style={styles.submitBtn}>
            {editingWorkout ? 'Update Workout' : 'Log Workout'}
          </button>
        </form>
      )}

      {workouts.length === 0 ? (
        <p style={styles.empty}>No workouts logged yet. Start tracking!</p>
      ) : (
        <div style={styles.grid}>
          {workouts.map((workout) => (
            <div key={workout.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.exercise}>{workout.exercise}</h3>
                <span style={styles.date}>{new Date(workout.date).toLocaleDateString()}</span>
              </div>
              {workout.muscle_group && (
                <p style={styles.muscle}>{workout.muscle_group}</p>
              )}
              <p style={styles.stats}>
                {workout.sets}x{workout.reps} @ {workout.weight}kg
              </p>
              {workout.notes && <p style={styles.notes}>{workout.notes}</p>}
              <div style={styles.actions}>
                <button onClick={() => handleEdit(workout)} style={styles.editBtn}>
                  Edit
                </button>
                <button onClick={() => handleDelete(workout.id)} style={styles.deleteBtn}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '2rem auto',
    padding: '0 2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    color: '#333',
  },
  addBtn: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  form: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '1rem',
  },
  row: {
    display: 'flex',
    gap: '1rem',
  },
  smallInput: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '1rem',
  },
  submitBtn: {
    padding: '0.75rem',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  exercise: {
    fontSize: '1.3rem',
    color: '#333',
  },
  date: {
    color: '#999',
    fontSize: '0.85rem',
  },
  muscle: {
    color: '#667eea',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  stats: {
    color: '#666',
    fontSize: '1.1rem',
    marginBottom: '0.5rem',
  },
  notes: {
    color: '#888',
    fontSize: '0.9rem',
    fontStyle: 'italic',
    marginBottom: '1rem',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  editBtn: {
    flex: 1,
    padding: '0.5rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  deleteBtn: {
    flex: 1,
    padding: '0.5rem',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: '3rem',
    fontSize: '1.1rem',
  },
};

export default Workouts;
