import fastify from 'fastify';
import cookie from 'fastify-cookie';
import env from 'dotenv';

import db from './config/index';
import users from './routes/users';

env.config();

const uri = process.env.MONGODB_URI;

const app = fastify({ logger: true });

app.register(db, { uri });
app.register(users);
app.register(cookie, {
    secret: process.env.COOKIE_SECRET,
    parseOptions: {}
});

const start = async () => {
    try {
        await app.listen(process.env.PORT || 5000, '0.0.0.0');
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
