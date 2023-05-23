const fastify = require('fastify');
const functions = require('firebase-functions');

const { getFirestoreInstance } = require('./config/dbconnector.js');
const users = require('./routes/users');
const getIdentityUtils = require('./utils');

let requestHandler = null;

const app = fastify({
    logger: true,
    serverFactory: (handler) => {
        requestHandler = handler;
        return require('http').createServer();
    },
});

app.addContentTypeParser('application/json', {}, (req, body, done) => {
    done(null, body.body);
});

app.decorate('db', getFirestoreInstance());
app.decorate('Identity', getIdentityUtils(app.db));
app.register(users);

exports.app = functions.https.onRequest((req, res) => {
    app.ready((err) => {
        if (err) throw err;
        requestHandler(req, res);
    });
});
