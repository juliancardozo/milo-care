'use strict';

const mockSend = jest.fn().mockResolvedValue({ error: null });
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

process.env.RESEND_API_KEY = 're_test';
const EmailService = require('../../src/services/EmailService');

beforeEach(() => mockSend.mockClear());

describe('isUndeliverableAddress', () => {
  it.each([
    'ana@barrio-demo.test',
    'beto@companion-demo.test',
    'x@foo.example',
    'x@foo.invalid',
    'x@localhost',
    'x@example.com',
    'X@EXAMPLE.ORG',
    'Ana <ana@barrio-demo.test>',
  ])('marca %s como no entregable', (addr) => {
    expect(EmailService.isUndeliverableAddress(addr)).toBe(true);
  });

  it.each([
    'ana@gmail.com',
    'x@udesa.edu.ar',
    'x@milocare.org',
    'x@contest.com',
    'x@example.com.ar',
    'x@testing.io',
  ])('deja pasar %s', (addr) => {
    expect(EmailService.isUndeliverableAddress(addr)).toBe(false);
  });
});

describe('envío con dominios reservados', () => {
  it('no llama a Resend si el único destinatario es reservado', async () => {
    await EmailService.sendReengagement({ to: 'ana@barrio-demo.test', userName: 'Ana', dogName: 'Luna' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('envía normal a un destinatario real', async () => {
    await EmailService.sendReengagement({ to: 'ana@gmail.com', userName: 'Ana', dogName: 'Luna' });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].to).toBe('ana@gmail.com');
  });
});
