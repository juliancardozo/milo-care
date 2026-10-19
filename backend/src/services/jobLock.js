'use strict';

/**
 * Lock en memoria por job.
 *
 * Los jobs periódicos pueden dispararse por dos caminos dentro del MISMO proceso:
 *   1. node-cron in-process (server.js → start*Job).
 *   2. El cron externo (GitHub Actions → POST /api/internal/cron/:job), que existe
 *      porque Render free duerme el proceso por inactividad y node-cron no corre.
 *
 * Si ambos coinciden, dos corridas leerían los mismos documentos User antes de que
 * la otra haga `save()` y mandarían el mismo email dos veces. Este lock garantiza
 * a lo sumo UNA corrida por job a la vez dentro del proceso. No protege entre
 * procesos distintos (ver docs/devops/ENVIRONMENTS.md → "Crons").
 */

const running = new Map(); // jobName → Promise de la corrida en curso

function isRunning(name) {
  return running.has(name);
}

/**
 * Ejecuta `fn` si no hay otra corrida de `name` en curso.
 * @returns {{ started: boolean, promise: Promise|null }}
 *   started=false si ya había una corrida (no se ejecuta `fn`).
 */
function runExclusive(name, fn) {
  if (running.has(name)) return { started: false, promise: running.get(name) };
  const promise = Promise.resolve()
    .then(fn)
    .catch((err) => {
      console.error(`[jobLock] ${name} failed: ${err && err.message}`);
    })
    .finally(() => {
      running.delete(name);
    });
  running.set(name, promise);
  return { started: true, promise };
}

/** Solo para tests. */
function _reset() {
  running.clear();
}

module.exports = { runExclusive, isRunning, _reset };
