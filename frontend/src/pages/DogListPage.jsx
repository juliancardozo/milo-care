import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDogs, deleteDog } from '../services/api';

export default function DogListPage() {
  const navigate = useNavigate();
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDogs()
      .then(({ data }) => setDogs(data.dogs))
      .catch(() => setError('Failed to load dogs.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(dogId, name) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteDog(dogId);
      setDogs((prev) => prev.filter((d) => d.id !== dogId));
    } catch {
      setError('Failed to delete dog profile.');
    }
  }

  if (loading) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Your dogs</h1>
        <Link to="/dogs/new" className="btn-primary">+ Add dog</Link>
      </header>
      {error && <p className="server-error">{error}</p>}
      {dogs.length === 0 ? (
        <p>No dogs yet. <Link to="/dogs/new">Add your first dog</Link></p>
      ) : (
        <ul className="dog-list">
          {dogs.map((dog) => (
            <li key={dog.id} className="dog-list-item">
              {dog.photoUrl && <img src={dog.photoUrl} alt={dog.name} className="dog-photo" />}
              <div className="dog-info">
                <strong>{dog.name}</strong>
                <span>{dog.breed}</span>
                <span>{dog.ageYears} yr{dog.ageYears !== 1 ? 's' : ''} old</span>
              </div>
              <div className="dog-actions">
                <button onClick={() => navigate(`/dogs/${dog.id}/vaccinations`)}>View records</button>
                <button onClick={() => handleDelete(dog.id, dog.name)} className="btn-danger">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link to="/dashboard">← Dashboard</Link>
    </div>
  );
}
