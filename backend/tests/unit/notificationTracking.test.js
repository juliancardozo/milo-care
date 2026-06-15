'use strict';

jest.mock('../../src/models/Event', () => ({ findOne: jest.fn() }));
jest.mock('../../src/services/analyticsService', () => ({ track: jest.fn() }));

const Event = require('../../src/models/Event');
const analytics = require('../../src/services/analyticsService');
const { recordConversion } = require('../../src/services/notificationTracking');
const { validateEvent } = require('../../src/core/events/catalog');

// Chain helper: soporta tanto findOne().sort().lean() como findOne().lean().
function chain(value) {
  return { sort: () => ({ lean: () => Promise.resolve(value) }), lean: () => Promise.resolve(value) };
}

describe('catalog: notification.* events', () => {
  it('valida payloads correctos', () => {
    expect(validateEvent('notification.sent', { campaign: 'vaccination', channel: 'push' }).ok).toBe(true);
    expect(validateEvent('notification.clicked', { campaign: 'overdue', channel: 'email' }).ok).toBe(true);
    expect(validateEvent('notification.converted', { campaign: 'reengagement' }).ok).toBe(true);
  });
  it('rechaza campaña fuera del enum', () => {
    expect(validateEvent('notification.sent', { campaign: 'ventas', channel: 'push' }).ok).toBe(false);
  });
});

describe('notificationTracking.recordConversion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('emite converted si hubo un sent reciente y no hay converted previo', async () => {
    Event.findOne
      .mockReturnValueOnce(chain({ payload: { campaign: 'vaccination' }, ts: new Date() })) // sent
      .mockReturnValueOnce(chain(null)); // already? no

    await recordConversion('u1', 'd1', ['vaccination', 'overdue']);

    expect(analytics.track).toHaveBeenCalledWith('notification_converted', {
      userId: 'u1', dogId: 'd1', meta: { campaign: 'vaccination' },
    });
  });

  it('no emite si no hubo notificación reciente', async () => {
    Event.findOne.mockReturnValueOnce(chain(null));
    await recordConversion('u1', 'd1', ['vaccination']);
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('no recuenta si ya hay una conversión para ese sent', async () => {
    Event.findOne
      .mockReturnValueOnce(chain({ payload: { campaign: 'reengagement' }, ts: new Date() }))
      .mockReturnValueOnce(chain({ _id: 'already' }));
    await recordConversion('u1', 'd1', ['reengagement']);
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('no hace nada sin userId o sin campañas', async () => {
    await recordConversion(null, 'd1', ['vaccination']);
    await recordConversion('u1', 'd1', []);
    expect(Event.findOne).not.toHaveBeenCalled();
  });
});
