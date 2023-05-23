const mongoose = require('mongoose');

const User = require('../models/user');

const models = { User };

const ConnectDB = async (fastify, options) => {
    try {
        mongoose.connection.on('connected', () => {
            fastify.log.info({ actor: 'MongoDB' }, 'connected');
        });
        mongoose.connection.on('disconnected', () => {
            fastify.log.error({ actor: 'MongoDB' }, 'disconnected');
        });

        await mongoose.connect(options.uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });

        fastify.decorate('db', { models });
    } catch (error) {
        console.error(error);
    }
};

module.exports = ConnectDB;
