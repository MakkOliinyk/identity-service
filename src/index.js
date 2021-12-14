import fastify from 'fastify';
import cookie from 'fastify-cookie';
import env from 'dotenv';

import db from './config/index';
import users from './routes/users';

env.config();

const Port = process.env.PORT;
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
        await app.listen(Port);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
