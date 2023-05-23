const fastify = require('fastify');
const env = require('dotenv');

const db = require('./config/dbconnector.js');
const users = require('./routes/users');

env.config();

const app = fastify({ logger: true });

app.register(db, { uri: process.env.DB_URI });
app.register(users);

const handler = async (req, res) => {
    try {
        await app.ready();
        app.server.emit('request', req, res);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
};

exports.app = functions.https.onRequest(handler);
