'use strict';

// Tests puros de alertas locales estacionales.

const { getActiveLocalAlerts } = require('../../src/services/localAlertsService');
const User = require('../../src/models/User');

// Fechas dentro de la TZ por defecto (America/Argentina/Buenos_Aires).
const NOV = new Date('2026-11-15T12:00:00.000Z'); // garrapatas AR
const JAN = new Date('2026-01-15T12:00:00.000Z'); // verano (calor) AR
const JUN = new Date('2026-06-15T12:00:00.000Z'); // invierno, sin alertas

function userWithLocation(loc) {
  return { location: loc, notificationPreferences: {} };
}

describe('getActiveLocalAlerts', () => {
  test('sin location → sin alertas', () => {
    expect(getActiveLocalAlerts(userWithLocation(null), [], NOV)).toEqual([]);
  });

  test('mes de temporada de garrapatas → alerta tick', () => {
    const alerts = getActiveLocalAlerts(userWithLocation({ country: 'AR', region: 'Buenos Aires', city: 'La Plata' }), [{ name: 'Milo', breed: 'Mestizo' }], NOV);
    expect(alerts.map((a) => a.type)).toContain('tick');
  });

  test('invierno → sin alertas', () => {
    const alerts = getActiveLocalAlerts(userWithLocation({ country: 'AR', region: 'Buenos Aires' }), [{ name: 'Milo', breed: 'Mestizo' }], JUN);
    expect(alerts).toEqual([]);
  });

  test('calor solo para braquicéfalos', () => {
    const loc = userWithLocation({ country: 'AR', region: 'Córdoba' });
    const mestizo = getActiveLocalAlerts(loc, [{ name: 'Milo', breed: 'Mestizo' }], JAN);
    expect(mestizo.map((a) => a.type)).not.toContain('heat');

    const bulldog = getActiveLocalAlerts(loc, [{ name: 'Lola', breed: 'Bulldog Francés' }], JAN);
    expect(bulldog.map((a) => a.type)).toContain('heat');
  });

  test('el mensaje interpola la zona', () => {
    const alerts = getActiveLocalAlerts(userWithLocation({ country: 'AR', region: 'Mendoza', city: 'Godoy Cruz' }), [{ name: 'Milo', breed: 'Mestizo' }], NOV);
    expect(alerts[0].message).toContain('Godoy Cruz');
  });
});

describe('invariante: el schema de User no persiste coordenadas', () => {
  test('lat/lng en location se descartan (strict mode)', () => {
    const u = new User({
      email: 'x@test.com',
      passwordHash: 'h',
      name: 'X',
      location: { country: 'AR', region: 'Salta', city: 'Salta', lat: -24.7, lng: -65.4 },
    });
    const loc = u.location.toObject();
    expect(loc.lat).toBeUndefined();
    expect(loc.lng).toBeUndefined();
    expect(loc.country).toBe('AR');
  });
});
