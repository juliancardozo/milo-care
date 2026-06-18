// Avatar del perro: foto si existe, si no la inicial sobre un círculo.
// `className` permite variantes de tamaño (ej. en el switcher vs la identidad).
export default function DogAvatar({ dog, className = '' }) {
  if (dog?.photoUrl) {
    return <img src={dog.photoUrl} alt={dog.name} className={`dog-avatar-img ${className}`} />;
  }
  return (
    <div className={`dog-avatar-placeholder ${className}`}>
      {(dog?.name || '?').charAt(0).toUpperCase()}
    </div>
  );
}
