'use strict';

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

const User = require('../../src/models/User');
const DogAccess = require('../../src/services/DogAccess');

function dog(id, caregivers = []) {
  return { _id: id, name: 'Milo', caregivers };
}

function userWithDogs(dogs) {
  return { _id: 'owner-1', name: 'Julián', dogs: { id: (id) => dogs.find((d) => String(d._id) === String(id)) || null } };
}

describe('DogAccess.resolveDog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resuelve como owner cuando el perro está en mi documento', async () => {
    User.findById.mockResolvedValue(userWithDogs([dog('dog-1')]));

    const res = await DogAccess.resolveDog('owner-1', 'dog-1');

    expect(res.role).toBe('owner');
    expect(res.dog._id).toBe('dog-1');
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('resuelve como cotutor cuando soy caregiver del perro de otro', async () => {
    // No es mío.
    User.findById.mockResolvedValue(userWithDogs([]));
    // El dueño tiene el perro con mi userId como caregiver.
    User.findOne.mockResolvedValue(userWithDogs([dog('dog-1', [{ userId: 'maca-1' }])]));

    const res = await DogAccess.resolveDog('maca-1', 'dog-1');

    expect(res.role).toBe('cotutor');
    expect(res.dog._id).toBe('dog-1');
    expect(res.owner._id).toBe('owner-1');
  });

  it('devuelve null cuando no soy dueño ni cotutor', async () => {
    User.findById.mockResolvedValue(userWithDogs([]));
    User.findOne.mockResolvedValue(null);

    const res = await DogAccess.resolveDog('rando-1', 'dog-1');

    expect(res).toBeNull();
  });

  it('devuelve null sin requesterId o dogId', async () => {
    expect(await DogAccess.resolveDog(null, 'dog-1')).toBeNull();
    expect(await DogAccess.resolveDog('u', null)).toBeNull();
    expect(User.findById).not.toHaveBeenCalled();
  });
});
