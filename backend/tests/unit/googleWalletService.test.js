'use strict';

const { generateKeyPairSync } = require('crypto');
const jwt = require('jsonwebtoken');

// Genera una keypair RSA de prueba y la inyecta como service account antes de cargar
// el servicio (que lee las credenciales de forma lazy desde process.env).
describe('GoogleWalletService', () => {
  let publicKey;
  let GoogleWalletService;
  const now = new Date('2026-06-08T00:00:00Z');
  const user = { _id: 'user-1', name: 'Ana' };

  beforeAll(() => {
    const keys = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    publicKey = keys.publicKey;

    const sa = { client_email: 'wallet@test.iam.gserviceaccount.com', private_key: keys.privateKey };
    process.env.GOOGLE_WALLET_ISSUER_ID = '3388000000022222228';
    process.env.GOOGLE_WALLET_CLASS_ID = 'milo_dog_card';
    process.env.GOOGLE_WALLET_SA_KEY_B64 = Buffer.from(JSON.stringify(sa)).toString('base64');
    process.env.APP_URL = 'https://app.milocura.com';

    GoogleWalletService = require('../../src/services/GoogleWalletService');
  });

  function buildDog() {
    return {
      _id: 'dog-1',
      name: 'Luna',
      breed: 'Beagle',
      microchipId: '9410000123',
      ownerPhone: '+59899111222',
      veterinarianName: 'Dr. Pérez',
      veterinarianPhone: '+59824800000',
      photoUrl: 'https://img/luna.jpg',
      vaccinations: [
        { vaccineName: 'Rabia', nextDueDate: new Date('2026-07-12'), status: 'upcoming' },
        { vaccineName: 'Vieja', nextDueDate: new Date('2025-01-01'), status: 'completed' }, // pasada → ignorada
      ],
      dewormingHistory: [
        { productName: 'X', nextDueDate: new Date('2026-06-20'), status: 'upcoming' },
      ],
    };
  }

  it('builds a generic object with identity + health fields', () => {
    const obj = GoogleWalletService.buildDogPassObject(user, buildDog(), now);

    expect(obj.classId).toBe('3388000000022222228.milo_dog_card');
    expect(obj.id).toMatch(/^3388000000022222228\.dog-1-/);
    expect(obj.header.defaultValue.value).toBe('Luna');
    expect(obj.subheader.defaultValue.value).toBe('Beagle');
    // QR apunta a la ficha pública (no a la ruta protegida /dogs).
    expect(obj.barcode.value).toBe('https://app.milocura.com/p/dog-1');

    const ids = obj.textModulesData.map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'microchip', 'owner', 'owner_phone', 'vet', 'vet_phone', 'next_vaccine', 'next_deworming',
      ])
    );

    // Botones tappables: ver ficha + llamar al dueño + llamar al vet.
    const uris = obj.linksModuleData.uris.map((u) => u.uri);
    expect(uris).toEqual(
      expect.arrayContaining(['https://app.milocura.com/p/dog-1', 'tel:+59899111222', 'tel:+59824800000'])
    );
  });

  it('omits empty optional fields', () => {
    const obj = GoogleWalletService.buildDogPassObject(
      user,
      { _id: 'd2', name: 'Toby', vaccinations: [], dewormingHistory: [] },
      now
    );

    const ids = obj.textModulesData.map((m) => m.id);
    expect(ids).not.toContain('microchip');
    expect(ids).not.toContain('vet');
    expect(obj.heroImage).toBeUndefined();
    expect(obj.subheader).toBeUndefined();
  });

  it('signs a verifiable save-to-wallet JWT', () => {
    const url = GoogleWalletService.generateSaveUrl(user, buildDog(), now);
    expect(url.startsWith('https://pay.google.com/gp/v/save/')).toBe(true);

    const token = url.replace('https://pay.google.com/gp/v/save/', '');
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    expect(decoded.typ).toBe('savetowallet');
    expect(decoded.aud).toBe('google');
    expect(decoded.payload.genericObjects).toHaveLength(1);
    expect(decoded.payload.genericObjects[0].header.defaultValue.value).toBe('Luna');
  });

  it('soonestDueDate returns earliest future date ignoring cancelled', () => {
    const { soonestDueDate } = GoogleWalletService._internal;
    const d = soonestDueDate(
      [
        { nextDueDate: new Date('2026-09-01'), status: 'upcoming' },
        { nextDueDate: new Date('2026-07-01'), status: 'cancelled' },
        { nextDueDate: new Date('2026-08-01'), status: 'upcoming' },
      ],
      now
    );
    expect(d.toISOString().startsWith('2026-08-01')).toBe(true);
  });
});
