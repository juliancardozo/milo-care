import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ParaVeterinariasPage from '../pages/ParaVeterinariasPage';
import ParaPartnersPage from '../pages/ParaPartnersPage';

describe('Páginas de marketing', () => {
  it('Para Veterinarias renderiza y tiene CTA de registro', () => {
    render(<MemoryRouter><ParaVeterinariasPage /></MemoryRouter>);
    expect(screen.getAllByText(/Registrar mi clínica/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Cuatro pasos para beneficiarte/i)).toBeTruthy();
  });
  it('Para Partners renderiza y pide la API key', () => {
    render(<MemoryRouter><ParaPartnersPage /></MemoryRouter>);
    expect(screen.getAllByText(/Pedir mi API key/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Autenticación, API de partners y webhooks/i)).toBeTruthy();
  });
});
