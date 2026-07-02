import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import LandingPage from '../pages/LandingPage';
import { I18nProvider } from '../i18n/I18nProvider';

describe('LandingPage v2 render', () => {
  it('renderiza sin tirar y muestra secciones clave', () => {
    render(<I18nProvider><MemoryRouter><LandingPage /></MemoryRouter></I18nProvider>);
    expect(screen.getAllByText(/Empezar gratis/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/La salud de tu perro toca a muchos/i)).toBeTruthy();
    expect(screen.getByText(/Milo Care nació de una mudanza/i)).toBeTruthy();
  });
});
