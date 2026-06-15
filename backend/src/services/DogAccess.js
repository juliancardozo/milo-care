'use strict';

const User = require('../models/User');

/**
 * Resuelve un perro accesible por el usuario (dueño O co-tutor) y devuelve SIEMPRE
 * el documento del dueño (`owner`) para que los writes sigan yendo al lugar
 * canónico vía `owner.save()`. Nunca expone el User completo a quien consume:
 * solo el perro y el rol.
 *
 * @returns {Promise<{ owner: import('mongoose').Document, dog: any, role: 'owner'|'cotutor' } | null>}
 */
async function resolveDog(requesterId, dogId) {
  if (!requesterId || !dogId) return null;

  // 1) Dueño: el perro está en mi propio documento.
  const me = await User.findById(requesterId);
  if (me) {
    const dog = me.dogs.id(dogId);
    if (dog) return { owner: me, dog, role: 'owner' };
  }

  // 2) Co-tutor: el perro está en otro documento y yo soy caregiver del MISMO perro.
  //    $elemMatch garantiza que ambas condiciones apliquen al mismo subdoc.
  const owner = await User.findOne({
    dogs: { $elemMatch: { _id: dogId, 'caregivers.userId': requesterId } },
  });
  if (owner) {
    const dog = owner.dogs.id(dogId);
    if (dog && dog.caregivers.some((c) => String(c.userId) === String(requesterId))) {
      return { owner, dog, role: 'cotutor' };
    }
  }

  return null;
}

/**
 * Express helper de conveniencia: resuelve el perro de `req.params.dogId` para
 * `req.user.id` y responde 404 si no hay acceso. Devuelve el objeto resuelto o
 * `null` (en cuyo caso ya se respondió). Permite migrar rutas con un cambio mínimo:
 *
 *   const found = await DogAccess.loadForRequest(req, res);
 *   if (!found) return;
 *   const { owner, dog } = found;
 */
async function loadForRequest(req, res) {
  const found = await resolveDog(req.user.id, req.params.dogId);
  if (!found) {
    res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });
    return null;
  }
  return found;
}

module.exports = { resolveDog, loadForRequest };
