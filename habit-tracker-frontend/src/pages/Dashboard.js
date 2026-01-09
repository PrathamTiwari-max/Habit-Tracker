import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const [stats, setStats] = useState({
    habits: [],
    recent_workouts: [],
    muscle_group_stats: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/stats/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      
      // Safety check - ensure all fields have defaults
      setStats({
        habits: data.habits || [],
        recent_workouts: data.recent_workouts || [],
        muscle_group_stats: data.muscle_group_stats || []
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set empty defaults on error
      setStats({
        habits: [],
        recent_workouts: [],
        muscle_group_stats: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHabitDone = async (habitId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `http://localhost:5000/api/habits/${habitId}/checkins`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: today,
            completed: true
          })
        }
      );

      if (response.ok) {
        console.log('Habit checked in successfully');
        loadStats();
      }
    } catch (error) {
      console.error('Error marking habit as done:', error);
    }
  };

  const getUniqueMuscleStats = () => {
    // SAFETY CHECK - return empty array if no data
    if (!stats.muscle_group_stats || !Array.isArray(stats.muscle_group_stats)) {
      return [];
    }

    const grouped = {};
    stats.muscle_group_stats.forEach(stat => {
      // Extra safety - check if muscle_group exists
      if (!stat.muscle_group) return;
      
      const key = stat.muscle_group.toLowerCase();
      if (grouped[key]) {
        grouped[key].count += stat.count;
      } else {
        grouped[key] = {
          muscle_group: stat.muscle_group.charAt(0).toUpperCase() + stat.muscle_group.slice(1).toLowerCase(),
          count: stat.count
        };
      }
    });
    return Object.values(grouped);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.skeletonContainer}>
          <div style={styles.skeletonCard} />
          <div style={styles.skeletonCard} />
          <div style={styles.skeletonCard} />
        </div>
      </div>
    );
  }

  const uniqueMuscleStats = getUniqueMuscleStats();

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <h1 style={styles.title}>Dashboard</h1>

      <div style={styles.grid}>
        {/* Today's Habits */}
        <motion.div
          style={styles.card}
          whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)' }}
          transition={{ duration: 0.2 }}
        >
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Today's Habits</h2>
            <span style={styles.badge}>{stats.habits.length}</span>
          </div>
          
          {stats.habits.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>✓</div>
              <p style={styles.emptyText}>Create your first habit to get started</p>
            </div>
          ) : (
            <div style={styles.habitsList}>
              {stats.habits.map(habit => (
                <motion.div
                  key={habit.id}
                  style={styles.habitItem}
                  whileHover={{ backgroundColor: 'rgba(102, 126, 234, 0.05)' }}
                >
                  <div>
                    <h3 style={styles.habitName}>{habit.name}</h3>
                    {habit.description && (
                      <p style={styles.habitDesc}>{habit.description}</p>
                    )}
                  </div>
                  {!habit.checked_today && (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleHabitDone(habit.id)}
                      style={styles.doneButton}
                    >
                      Done
                    </motion.button>
                  )}
                  {habit.checked_today && (
                    <span style={styles.checkMark}>✓</span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Workouts */}
        <motion.div
          style={styles.card}
          whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)' }}
          transition={{ duration: 0.2 }}
        >
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Recent Workouts</h2>
            <span style={styles.badge}>{stats.recent_workouts.length}</span>
          </div>

          {stats.recent_workouts.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>💪</div>
              <p style={styles.emptyText}>Log your first workout to see it here</p>
            </div>
          ) : (
            <div style={styles.workoutsList}>
              {stats.recent_workouts.slice(0, 5).map(workout => (
                <motion.div
                  key={workout.id}
                  style={styles.workoutItem}
                  whileHover={{ backgroundColor: 'rgba(102, 126, 234, 0.05)' }}
                >
                  <div>
                    <h3 style={styles.workoutName}>{workout.exercise}</h3>
                    <p style={styles.workoutDetails}>
                      {workout.muscle_group && (
                        <span style={styles.muscleTag}>{workout.muscle_group}</span>
                      )}
                      {workout.sets && workout.reps && (
                        <> • {workout.sets}x{workout.reps}</>
                      )}
                      {workout.weight && (
                        <> @ {workout.weight}kg</>
                      )}
                    </p>
                  </div>
                  <span style={styles.dateText}>
                    {new Date(workout.date).toLocaleDateString()}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Muscle Group Stats */}
        <motion.div
          style={styles.card}
          whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)' }}
          transition={{ duration: 0.2 }}
        >
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Muscle Groups (30 Days)</h2>
          </div>

          {uniqueMuscleStats.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <p style={styles.emptyText}>Start logging workouts to see your progress</p>
            </div>
          ) : (
            <div style={styles.statsList}>
              {uniqueMuscleStats.map(stat => (
                <div key={stat.muscle_group} style={styles.statItem}>
                  <span style={styles.statLabel}>{stat.muscle_group}</span>
                  <div style={styles.statBar}>
                    <motion.div
                      style={{
                        ...styles.statBarFill,
                        width: `${(stat.count / Math.max(...uniqueMuscleStats.map(s => s.count))) * 100}%`
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(stat.count / Math.max(...uniqueMuscleStats.map(s => s.count))) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <span style={styles.statCount}>{stat.count}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '3rem 2rem',
  },
  title: {
    color: '#e6edf3',
    fontSize: '2.5rem',
    fontWeight: '700',
    marginBottom: '3rem',
    letterSpacing: '-0.02em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '2rem',
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.04)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  cardTitle: {
    color: '#0d1117',
    fontSize: '1.3rem',
    fontWeight: '600',
    margin: 0,
  },
  badge: {
    background: '#667eea',
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  habitsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  habitItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
  },
  habitName: {
    color: '#0d1117',
    fontSize: '1.05rem',
    fontWeight: '600',
    margin: 0,
    marginBottom: '0.25rem',
  },
  habitDesc: {
    color: '#57606a',
    fontSize: '0.85rem',
    margin: 0,
  },
  doneButton: {
    background: '#667eea',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1.25rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.2)',
  },
  checkMark: {
    color: '#22c55e',
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  workoutsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  workoutItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
  },
  workoutName: {
    color: '#0d1117',
    fontSize: '1.05rem',
    fontWeight: '600',
    margin: 0,
    marginBottom: '0.25rem',
  },
  workoutDetails: {
    color: '#57606a',
    fontSize: '0.85rem',
    margin: 0,
  },
  muscleTag: {
    background: '#667eea',
    color: '#ffffff',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  dateText: {
    color: '#8b949e',
    fontSize: '0.8rem',
  },
  statsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  statLabel: {
    color: '#0d1117',
    fontSize: '0.9rem',
    fontWeight: '600',
    minWidth: '100px',
  },
  statBar: {
    flex: 1,
    height: '8px',
    background: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    background: '#667eea',
    borderRadius: '4px',
  },
  statCount: {
    color: '#57606a',
    fontSize: '0.85rem',
    fontWeight: '600',
    minWidth: '30px',
    textAlign: 'right',
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem 1rem',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
    opacity: 0.3,
  },
  emptyText: {
    color: '#8b949e',
    fontSize: '0.9rem',
  },
  skeletonContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '2rem',
  },
  skeletonCard: {
    height: '300px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

export default Dashboard;
