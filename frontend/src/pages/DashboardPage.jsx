import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearCredentials } from '../store/authSlice';
import { getDogs, logout } from '../services/api';
import OfflineIndicator from '../components/OfflineIndicator';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [dogs, setDogs] = useState([]);
  const [activeDogId, setActiveDogId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDogs()
      .then(({ data }) => {
        setDogs(data.dogs);
        if (data.dogs.length > 0) setActiveDogId(data.dogs[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    try { await logout(); } catch { /* ignore */ }
    dispatch(clearCredentials());
    navigate('/login');
  }

  const activeDog = dogs.find((d) => d.id === activeDogId);

  if (loading) return <div className="page"><p>Loading dashboard…</p></div>;

  if (dogs.length === 0) {
    return (
      <div className="page">
        <OfflineIndicator />
        <h1>Welcome to Milo Care</h1>
        <p>You don't have any dog profiles yet.</p>
        <Link to="/dogs/new" className="btn-primary">Add your first dog</Link>
        <button onClick={handleLogout} className="btn-secondary">Log out</button>
      </div>
    );
  }

  return (
    <div className="page">
      <OfflineIndicator />
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <button onClick={handleLogout} className="btn-secondary">Log out</button>
      </header>

      {/* Dog switcher */}
      {dogs.length > 1 && (
        <nav className="dog-switcher">
          {dogs.map((d) => (
            <button key={d.id} onClick={() => setActiveDogId(d.id)} className={d.id === activeDogId ? 'active' : ''}>
              {d.name}
            </button>
          ))}
        </nav>
      )}

      {activeDog && (
        <section className="dog-summary">
          <h2>{activeDog.name}</h2>
          <p>{activeDog.breed} · {activeDog.ageYears} yr{activeDog.ageYears !== 1 ? 's' : ''} old</p>
        </section>
      )}

      {/* Health record navigation */}
      <nav className="health-nav">
        <Link to={`/dogs/${activeDogId}/vaccinations`}>Vaccinations</Link>
        <Link to={`/dogs/${activeDogId}/medications`}>Medications</Link>
        <Link to={`/dogs/${activeDogId}/appointments`}>Appointments</Link>
        <Link to={`/dogs/${activeDogId}/symptoms`}>Symptoms</Link>
        <Link to={`/dogs/${activeDogId}/history`}>Full History</Link>
      </nav>

      <div className="quick-links">
        <Link to="/dogs">Manage dogs</Link>
        <Link to="/settings/notifications">Notification preferences</Link>
      </div>
    </div>
  );
}
