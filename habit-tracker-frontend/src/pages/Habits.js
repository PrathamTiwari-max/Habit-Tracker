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
  const [newHabit, setNewHabit] = useState({ name: '', description: '' });
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
            `http://localhost:5000/api/habits/${habit.id}/checkins`,
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
        `http://localhost:5000/api/habits/${habitId}/checkins`,
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
          <div style={styles.skeletonTitle} />
          <div style={styles.skeletonHeatmap} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div style={styles.header}>
        <h1 style={styles.title}>Habits</h1>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowModal(true)}
          style={styles.addButton}
        >
          + New Habit
        </motion.button>
      </div>

      {habits.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>✓</div>
          <h3 style={styles.emptyTitle}>No habits yet</h3>
          <p style={styles.emptyText}>Create your first habit to start tracking!</p>
        </div>
      ) : (
        <>
          <div style={styles.heatmapSection}>
            <h2 style={styles.sectionTitle}>Activity Heatmap (Last 90 Days)</h2>
            <div style={styles.heatmapContainer}>
              <div style={styles.weekLabels}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} style={styles.weekLabel}>{day}</div>
                ))}
              </div>
              <div style={styles.heatmap}>
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} style={styles.week}>
                    {week.map((date, dayIdx) => {
                      const level = date ? getCompletionLevel(date) : 0;
                      const color = date ? getColor(level) : 'transparent';
                      return (
                        <motion.div
                          key={dayIdx}
                          style={{
                            ...styles.day,
                            backgroundColor: color,
                            cursor: date ? 'pointer' : 'default'
                          }}
                          whileHover={date ? { scale: 1.2 } : {}}
                          onClick={() => date && handleDateClick(date)}
                          onMouseEnter={() => date && setHoveredDate(date)}
                          onMouseLeave={() => setHoveredDate(null)}
                        >
                          {hoveredDate && date && 
                           hoveredDate.toISOString() === date.toISOString() && (
                            <div style={styles.tooltip}>
                              <div style={styles.tooltipDate}>{formatDate(date)}</div>
                              <div style={styles.tooltipLevel}>{level}% complete</div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.habitsSection}>
            <h2 style={styles.sectionTitle}>Your Habits</h2>
            <div style={styles.habitsList}>
              {habits.map(habit => (
                <motion.div
                  key={habit.id}
                  style={styles.habitCard}
                  whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)' }}
                  transition={{ duration: 0.2 }}
                >
                  <div>
                    <h3 style={styles.habitName}>{habit.name}</h3>
                    {habit.description && (
                      <p style={styles.habitDesc}>{habit.description}</p>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleDelete(habit.id)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}

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
              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Habit Name</label>
                  <input
                    type="text"
                    value={newHabit.name}
                    onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Description (Optional)</label>
                  <textarea
                    value={newHabit.description}
                    onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                    style={{ ...styles.input, ...styles.textarea }}
                    rows="3"
                  />
                </div>
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    style={styles.submitButton}
                  >
                    Create Habit
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {formatFullDate(new Date(selectedDate + 'T00:00:00'))}
              </h2>
              <div style={styles.habitCheckList}>
                {habits.map(habit => (
                  <motion.div
                    key={habit.id}
                    style={styles.habitCheckItem}
                    whileHover={{ backgroundColor: 'rgba(102, 126, 234, 0.05)' }}
                  >
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={dateCheckins[habit.id] || false}
                        onChange={() => handleHabitToggle(habit.id)}
                        style={styles.checkbox}
                      />
                      <span style={styles.habitCheckName}>{habit.name}</span>
                    </label>
                  </motion.div>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowDateModal(false)}
                style={styles.closeButton}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
    marginBottom: '3.5rem',
  },
  title: {
    color: '#e6edf3',
    fontSize: '2.5rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  addButton: {
    background: '#667eea',
    color: '#ffffff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
  sectionTitle: {
    color: 'rgba(230, 237, 243, 0.95)',
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em',
  },
  heatmapSection: {
    marginBottom: '5rem',
  },
  heatmapContainer: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    padding: '2rem',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  weekLabels: {
    display: 'flex',
    marginBottom: '0.5rem',
    paddingLeft: '0',
  },
  weekLabel: {
    width: '20px',
    fontSize: '0.75rem',
    color: 'rgba(230, 237, 243, 0.6)',
    textAlign: 'center',
    marginRight: '4px',
  },
  heatmap: {
    display: 'flex',
    gap: '4px',
  },
  week: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  day: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    position: 'relative',
    transition: 'transform 0.2s ease',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(10, 10, 15, 0.95)',
    color: '#ffffff',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    marginBottom: '8px',
    pointerEvents: 'none',
    zIndex: 1000,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  tooltipDate: {
    fontWeight: '600',
    marginBottom: '2px',
  },
  tooltipLevel: {
    color: 'rgba(230, 237, 243, 0.8)',
  },
  habitsSection: {
    marginBottom: '3rem',
  },
  habitsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  habitCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.04)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  habitName: {
    color: '#0d1117',
    fontSize: '1.2rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    lineHeight: '1.3',
  },
  habitDesc: {
    color: '#57606a',
    fontSize: '0.9rem',
  },
  deleteButton: {
    background: '#cf222e',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(207, 34, 46, 0.2)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  modalTitle: {
    color: '#0d1117',
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    color: '#0d1117',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  input: {
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #d0d7de',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  textarea: {
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  cancelButton: {
    background: '#f6f8fa',
    color: '#0d1117',
    border: '1px solid #d0d7de',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitButton: {
    background: '#667eea',
    color: '#ffffff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
  closeButton: {
    background: '#667eea',
    color: '#ffffff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '1rem',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  },
  habitCheckList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  habitCheckItem: {
    padding: '0.75rem',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  habitCheckName: {
    color: '#0d1117',
    fontSize: '1rem',
    fontWeight: '500',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    opacity: 0.3,
  },
  emptyTitle: {
    color: '#e6edf3',
    fontSize: '1.2rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  emptyText: {
    color: 'rgba(139, 148, 158, 0.8)',
    fontSize: '0.95rem',
  },
  skeletonContainer: {
    width: '100%',
  },
  skeletonTitle: {
    height: '40px',
    width: '200px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    marginBottom: '3rem',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonHeatmap: {
    height: '300px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

export default Habits;
