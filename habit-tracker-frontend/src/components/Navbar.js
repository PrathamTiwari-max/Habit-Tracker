import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoIcon}></span>
          <span>Habit Tracker</span>
        </Link>
        {token ? (
          <div style={styles.links}>
            <Link to="/" style={styles.link}>Dashboard</Link>
            <Link to="/habits" style={styles.link}>Habits</Link>
            <Link to="/workouts" style={styles.link}>Workouts</Link>
            <div style={styles.userSection}>
              <span style={styles.username}>{username}</span>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.links}>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={styles.linkRegister}>Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    background: 'rgba(22, 27, 34, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #30363d',
    padding: '1rem 0',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2rem',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#c9d1d9',
    fontSize: '1.3rem',
    fontWeight: 'bold',
    textDecoration: 'none',
    transition: 'color 0.3s ease',
  },
  logoIcon: {
    fontSize: '1.5rem',
  },
  links: {
    display: 'flex',
    gap: '2rem',
    alignItems: 'center',
  },
  link: {
    color: '#8b949e',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.95rem',
    transition: 'color 0.3s ease',
    ':hover': {
      color: '#667eea',
    },
  },
  linkRegister: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    fontWeight: '600',
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    fontSize: '0.95rem',
    transition: 'all 0.3s ease',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginLeft: '1rem',
    paddingLeft: '1rem',
    borderLeft: '1px solid #30363d',
  },
  username: {
    color: '#c9d1d9',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  logoutBtn: {
    background: '#30363d',
    color: '#c9d1d9',
    border: '1px solid #484f58',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};

export default Navbar;
