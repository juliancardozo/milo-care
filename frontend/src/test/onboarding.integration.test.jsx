import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import onboardingReducer from '../store/onboardingSlice';
import DogOnboardingPage from '../pages/DogOnboardingPage';
import * as onboardingApi from '../services/onboardingApi';

describe('Onboarding integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(onboardingApi, 'startOnboarding').mockResolvedValue({
      data: {
        sessionId: 'sess-1',
      },
    });

    vi.spyOn(onboardingApi, 'getOnboardingDraft').mockResolvedValue({
      data: {
        owner: {
          name: '',
          email: '',
          country: 'AR',
          disclaimerAccepted: false,
        },
        dog: {},
        clinical: {},
        lifestyle: {},
        vaccines: [],
        deworming: [],
      },
    });

    vi.spyOn(onboardingApi, 'saveOnboardingStep').mockResolvedValue({
      data: {
        valid: true,
        warnings: [],
      },
    });

    vi.spyOn(onboardingApi, 'getOnboardingSummary').mockResolvedValue({
      data: {
        calendar: {
          missingData: [],
        },
      },
    });

    vi.spyOn(onboardingApi, 'confirmOnboarding').mockResolvedValue({
      data: {
        success: true,
        dog: { id: 'dog-1' },
      },
    });
  });

  function renderPage() {
    const store = configureStore({
      reducer: {
        onboarding: onboardingReducer,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <DogOnboardingPage />
        </MemoryRouter>
      </Provider>
    );

    return store;
  }

  it('blocks owner step when disclaimer is missing', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Dog onboarding')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Name'), 'Owner');
    await user.type(screen.getByLabelText('Email'), 'owner@example.com');
    await user.click(screen.getByRole('button', { name: /Save and continue/i }));

    expect(screen.getByText(/must accept the disclaimer/i)).toBeInTheDocument();
  });

  it('advances to next step when owner step is valid', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Dog onboarding')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Name'), 'Owner');
    await user.type(screen.getByLabelText('Email'), 'owner@example.com');
    await user.selectOptions(screen.getByLabelText('Country'), 'AR');
    await user.click(screen.getByLabelText(/advisory and not a clinical diagnosis/i));
    await user.click(screen.getByRole('button', { name: /Save and continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Dog details')).toBeInTheDocument();
    });
  });
});
