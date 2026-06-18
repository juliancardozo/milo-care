import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DogContextHeader from '../components/DogContextHeader';
import { I18nProvider } from '../i18n/I18nProvider';
import * as api from '../services/api';

// El Health Score embebido pega a la API: lo silenciamos (render nulo).
vi.spyOn(api, 'getHealthScore').mockRejectedValue(new Error('skip'));

const DOGS = [
  { id: 'd1', name: 'Milo', breed: 'Border Collie', ageDisplay: '2 años' },
  { id: 'd2', name: 'Indio', breed: 'Mestizo', ageDisplay: '4 años' },
];

function renderHeader(props = {}) {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <DogContextHeader dogs={DOGS} activeDogId="d1" onSelect={() => {}} {...props} />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('DogContextHeader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra el switcher con todos los perros y la identidad del activo', () => {
    renderHeader();
    // Switcher: ambos nombres presentes
    expect(screen.getAllByText('Milo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Indio')).toBeInTheDocument();
    // Identidad del activo: raza · edad
    expect(screen.getByText(/Border Collie · 2 años/)).toBeInTheDocument();
  });

  it('al hacer click en otro perro llama onSelect con su id', async () => {
    const onSelect = vi.fn();
    renderHeader({ onSelect });
    await userEvent.click(screen.getByText('Indio'));
    expect(onSelect).toHaveBeenCalledWith('d2');
  });

  it('no muestra el switcher con un solo perro', () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <DogContextHeader dogs={[DOGS[0]]} activeDogId="d1" onSelect={() => {}} />
        </I18nProvider>
      </MemoryRouter>
    );
    // Sólo aparece "Milo" una vez (identidad), sin chip de switcher
    expect(screen.getAllByText('Milo')).toHaveLength(1);
  });
});
