const errors       = require('@feathersjs/errors');
const uuid         = require('uuid/v4');
const logger       = require('winston');

const dbtimestamp  = require('../../hooks/dbtimestamp');
const internalOnly = require('../../hooks/internalonly');

module.exports = {
  before: {
    all: [
    ],
    find: [
      internalOnly
    ],
    get: [
      internalOnly
    ],
    create: [
      /* We must have a curve in order to handle the public key
       */
      (hook) => {
        if (!hook.data.curve) {
          throw new errors.BadRequest('Client must provide a curve with the request');
        }
      },

      dbtimestamp('createdAt'),

      (hook) => {
        hook.data.uuid = uuid();
        logger.debug('Generating uuid for registration.create', hook.data);
        return hook;
      }
    ],
    update: [
      internalOnly
    ],
    patch: [
      internalOnly
    ],
    remove: [
      internalOnly
    ],
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
