'use strict';

const User = require('../models/User');
const { resolveDogAccess } = require('../services/dogAccessPolicy');

/**
 * Middleware factory: resuelve acceso al perro y lo adjunta a `req`.
 *
 * Uso:
 *   router.get('/', authenticate, requireDogAccess('dog.read'), handler)
 *
 * Tras este middleware están disponibles:
 *   req.dogOwnerUser  — documento User propietario del perro
 *   req.dog           — subdocumento dog
 *   req.dogAccess     — { role, allowed }
 *
 * @param {string} action - clave de acción ('dog.read', 'dog.write', ...)
 */
function requireDogAccess(action) {
  return async function dogAccessMiddleware(req, res, next) {
    try {
      const { dogId } = req.params;
      if (!dogId) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'dogId is required.' });

      // Localizar el User propietario del perro (por ahora los perros son subdocs de User).
      const ownerUser = await User.findOne({ 'dogs._id': dogId });
      if (!ownerUser) {
        return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });
      }
      const dog = ownerUser.dogs.id(dogId);
      if (!dog) {
        return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });
      }

      const { allowed, role, reason } = await resolveDogAccess({
        actorUserId: req.user.id,
        dogId,
        action,
        ownerUserId: ownerUser._id,
      });

      if (!allowed) {
        const status = reason === 'no_membership' ? 404 : 403;
        const code   = reason === 'no_membership' ? 'DOG_NOT_FOUND' : 'FORBIDDEN';
        // Para evitar enumeración de IDs se devuelve 404 si no hay membresía.
        return res.status(status).json({ code, message: 'Access denied.' });
      }

      req.dogOwnerUser = ownerUser;
      req.dog = dog;
      req.dogAccess = { role };
      return next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireDogAccess };
