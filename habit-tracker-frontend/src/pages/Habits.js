import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHabits, createHabit, deleteHabit } from '../services/api';

const Habits = () => {
  const [habits, setHabits] = useState([]);
  const [allCheckins, setAllCheckins] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: ''
  });
  const [dateCheckins, setDateCheckins] = useState({});

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const response = await getHabits();
      const habitsData = response.data.habits || [];
      setHabits(habitsData);

      const checkinsMap = {};
      for (const habit of habitsData) {
        try {
          const checkinResponse = await fetch(
            `https://habit-tracker-v75t.onrender.com/api/habits/${habit.id}/checkins`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          const checkinData = await checkinResponse.json();
          checkinsMap[habit.id] = checkinData.checkins || [];
        } catch (error) {
          console.error(`Error loading checkins for habit ${habit.id}:`, error);
          checkinsMap[habit.id] = [];
        }
      }

      setAllCheckins(checkinsMap);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createHabit(newHabit);
      setNewHabit({ name: '', description: '' });
      setShowModal(false);
      loadHabits();
    } catch (error) {
      console.error('Error creating habit:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      try {
        await deleteHabit(id);
        loadHabits();
      } catch (error) {
        console.error('Error deleting habit:', error);
      }
    }
  };

  const handleDateClick = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setShowDateModal(true);

    const checkinsForDate = {};
    habits.forEach(habit => {
      const habitCheckins = allCheckins[habit.id] || [];
      const checkin = habitCheckins.find(c => c.date === dateStr);
      checkinsForDate[habit.id] = checkin ? checkin.completed : false;
    });
    setDateCheckins(checkinsForDate);
  };

  const handleHabitToggle = async (habitId) => {
    try {
      const newState = !dateCheckins[habitId];
      const response = await fetch(
        `https://habit-tracker-v75t.onrender.com/api/habits/${habitId}/checkins`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: selectedDate,
            completed: newState
          })
        }
      );

      await response.json();

      setDateCheckins(prev => ({
        ...prev,
        [habitId]: newState
      }));

      setAllCheckins(prev => {
        const updated = { ...prev };
        const habitCheckins = updated[habitId] || [];
        const existingIndex = habitCheckins.findIndex(c => c.date === selectedDate);

        if (existingIndex >= 0) {
          habitCheckins[existingIndex].completed = newState;
        } else {
          habitCheckins.push({
            date: selectedDate,
            completed: newState,
            habit_id: habitId
          });
        }

        updated[habitId] = habitCheckins;
        return updated;
      });

      loadHabits();
    } catch (error) {
      console.error('Error updating checkin:', error);
    }
  };

  const generateDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const days = generateDays();

  const getWeekStartDate = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const weeks = [];
  const weekMap = {};

  days.forEach(day => {
    const weekStart = getWeekStartDate(new Date(day));
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = [];
    }
    weekMap[weekKey].push(day);
  });

  Object.keys(weekMap).sort().forEach(weekKey => {
    const week = Array(7).fill(null);
    weekMap[weekKey].forEach(day => {
      const dayOfWeek = day.getDay();
      week[dayOfWeek] = day;
    });
    weeks.push(week);
  });

  const getCompletionLevel = (date) => {
    if (!date) return 0;
    const dateStr = date.toISOString().split('T')[0];
    if (habits.length === 0) return 0;

    let completed = 0;
    habits.forEach(habit => {
      const habitCheckins = allCheckins[habit.id] || [];
      const checkin = habitCheckins.find(c => c.date === dateStr && c.completed);
      if (checkin) {
        completed++;
      }
    });

    return Math.round((completed / habits.length) * 100);
  };

  const getColor = (level) => {
    if (level === 0) return '#161b22';
    if (level < 25) return '#3d1f47';
    if (level < 50) return '#5a3564';
    if (level < 75) return '#774c82';
    return '#667eea';
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFullDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.skeletonContainer}>
          <div style={styles.skeletonCard} />
          <div style={styles.skeletonCard} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Habits</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          style={styles.newButton}
        >
          + New Habit
        </motion.button>
      </div>

      {habits.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>✓</div>
          <p style={styles.emptyText}>Create your first habit to start tracking!</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            style={styles.createButton}
          >
            Create Habit
          </motion.button>
        </div>
      ) : (
        <>
          {/* Habits List */}
          <div style={styles.habitsList}>
            {habits.map(habit => (
              <motion.div
                key={habit.id}
                style={styles.habitCard}
                whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div>
                  <h3 style={styles.habitName}>{habit.name}</h3>
                  {habit.description && (
                    <p style={styles.habitDesc}>{habit.description}</p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(habit.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </motion.button>
              </motion.div>
            ))}
          </div>

          {/* Activity Heatmap */}
          <motion.div
            style={styles.heatmapCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 style={styles.heatmapTitle}>Activity Heatmap</h2>
            <div style={styles.heatmapContainer}>
              <div style={styles.heatmapWrapper}>
                <div style={styles.dayLabels}>
                  <div style={styles.dayLabel}>Sun</div>
                  <div style={styles.dayLabel}>Mon</div>
                  <div style={styles.dayLabel}>Tue</div>
                  <div style={styles.dayLabel}>Wed</div>
                  <div style={styles.dayLabel}>Thu</div>
                  <div style={styles.dayLabel}>Fri</div>
                  <div style={styles.dayLabel}>Sat</div>
                </div>
                <div style={styles.heatmapGrid}>
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} style={styles.week}>
                      {week.map((day, dayIndex) => (
                        <motion.div
                          key={dayIndex}
                          onClick={() => day && handleDateClick(day)}
                          onMouseEnter={() => day && setHoveredDate(day)}
                          onMouseLeave={() => setHoveredDate(null)}
                          whileHover={day ? { scale: 1.2 } : {}}
                          style={{
                            ...styles.day,
                            backgroundColor: day ? getColor(getCompletionLevel(day)) : 'transparent',
                            cursor: day ? 'pointer' : 'default'
                          }}
                          title={day ? formatDate(day) : ''}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.legend}>
              <span style={styles.legendText}>Less</span>
              {[0, 25, 50, 75, 100].map(level => (
                <div
                  key={level}
                  style={{
                    ...styles.legendBox,
                    backgroundColor: getColor(level)
                  }}
                />
              ))}
              <span style={styles.legendText}>More</span>
            </div>
          </motion.div>
        </>
      )}

      {/* New Habit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              style={styles.modal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={styles.modalTitle}>Create New Habit</h2>
              <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name</label>
                  <input
                    type="text"
                    value={newHabit.name}
                    onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    value={newHabit.description}
                    onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                    style={styles.textarea}
                    rows="3"
                  />
                </div>
                <div style={styles.modalButtons}>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={styles.submitButton}
                  >
                    Create
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setShowModal(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Checkins Modal */}
      <AnimatePresence>
        {showDateModal && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDateModal(false)}
          >
            <motion.div
              style={styles.modal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={styles.modalTitle}>
                {formatFullDate(new Date(selectedDate))}
              </h2>
              <div style={styles.habitCheckList}>
                {habits.map(habit => (
                  <div key={habit.id} style={styles.habitCheckItem}>
                    <span style={styles.habitCheckName}>{habit.name}</span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleHabitToggle(habit.id)}
                      style={{
                        ...styles.checkButton,
                        backgroundColor: dateCheckins[habit.id] ? '#22c55e' : '#e5e7eb'
                      }}
                    >
                      {dateCheckins[habit.id] ? '✓ Done' : 'Mark Done'}
                    </motion.button>
                  </div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDateModal(false)}
                style={styles.closeButton}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '3rem 2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '3rem',
  },
  title: {
    color: '#e6edf3',
    fontSize: '2.5rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  newButton: {
    background: '#667eea',
    color: '#ffffff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
  habitsList: {
    display: 'grid',
    gap: '1.5rem',
    marginBottom: '3rem',
  },
  habitCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  habitName: {
    color: '#0d1117',
    fontSize: '1.3rem',
    fontWeight: '600',
    margin: 0,
    marginBottom: '0.5rem',
  },
  habitDesc: {
    color: '#57606a',
    fontSize: '0.95rem',
    margin: 0,
  },
  deleteButton: {
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1.25rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  heatmapCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  heatmapTitle: {
    color: '#0d1117',
    fontSize: '1.3rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
  },
  heatmapContainer: {
    overflowX: 'auto',
  },
  heatmapWrapper: {
    display: 'flex',
    gap: '0.5rem',
    minWidth: 'fit-content',
  },
  dayLabels: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    justifyContent: 'space-around',
    paddingRight: '0.5rem',
  },
  dayLabel: {
    color: '#57606a',
    fontSize: '0.75rem',
    height: '14px',
    display: 'flex',
    alignItems: 'center',
  },
  heatmapGrid: {
    display: 'flex',
    gap: '0.25rem',
  },
  week: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  day: {
    width: '14px',
    height: '14px',
    borderRadius: '2px',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1.5rem',
  },
  legendText: {
    color: '#57606a',
    fontSize: '0.85rem',
  },
  legendBox: {
    width: '14px',
    height: '14px',
    borderRadius: '2px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    opacity: 0.3,
  },
  emptyText: {
    color: '#57606a',
    fontSize: '1.1rem',
    marginBottom: '2rem',
  },
  createButton: {
    background: '#667eea',
    color: '#ffffff',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    color: '#0d1117',
    fontSize: '1.8rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    color: '#0d1117',
    fontSize: '0.95rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '1rem',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  modalButtons: {
    display: 'flex',
    gap: '1rem',
  },
  submitButton: {
    flex: 1,
    background: '#667eea',
    color: '#ffffff',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelButton: {
    flex: 1,
    background: '#e5e7eb',
    color: '#0d1117',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  habitCheckList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  habitCheckItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '8px',
  },
  habitCheckName: {
    color: '#0d1117',
    fontSize: '1rem',
    fontWeight: '600',
  },
  checkButton: {
    border: 'none',
    padding: '0.5rem 1.25rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#ffffff',
  },
  closeButton: {
    width: '100%',
    background: '#e5e7eb',
    color: '#0d1117',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  skeletonContainer: {
    display: 'grid',
    gap: '1.5rem',
  },
  skeletonCard: {
    height: '200px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

export default Habits;
