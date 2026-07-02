import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import LandingPage from '../pages/LandingPage';
import { I18nProvider } from '../i18n/I18nProvider';

describe('LandingPage render', () => {
  it('renderiza sin tirar y muestra secciones clave', () => {
    render(<I18nProvider><MemoryRouter><LandingPage /></MemoryRouter></I18nProvider>);
    expect(screen.getAllByText(/Empezar gratis/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no debería depender de tu memoria/i)).toBeTruthy();
    expect(screen.getByText(/Milo Care nació de una mudanza/i)).toBeTruthy();
  });

  it('no muestra el contenido B2B que se movió a páginas dedicadas', () => {
    render(<I18nProvider><MemoryRouter><LandingPage /></MemoryRouter></I18nProvider>);
    expect(screen.queryByText(/API-first/i)).toBeNull();
    expect(screen.queryByText(/Founder Plan/i)).toBeNull();
  });
});
