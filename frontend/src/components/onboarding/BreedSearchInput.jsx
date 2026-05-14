import { useMemo, useState } from 'react';

const BREEDS = [
  'Labrador Retriever',
  'German Shepherd',
  'French Bulldog',
  'Golden Retriever',
  'Mixed',
  'Border Collie',
  'Poodle',
  'Dachshund',
  'Beagle',
];

export default function BreedSearchInput({ value, onChange, id = 'breed-input' }) {
  const [query, setQuery] = useState(value || '');
  const options = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return BREEDS;
    return BREEDS.filter((item) => item.toLowerCase().includes(term)).slice(0, 5);
  }, [query]);

  function pick(nextValue) {
    setQuery(nextValue);
    onChange(nextValue);
  }

  return (
    <div className="field">
      <label htmlFor={id}>Breed</label>
      <input
        id={id}
        type="text"
        list={`${id}-list`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
      />
      <datalist id={`${id}-list`}>
        {options.map((item) => (
          <option key={item} value={item} onClick={() => pick(item)} />
        ))}
      </datalist>
    </div>
  );
}
