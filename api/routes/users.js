const FastifyAuth = require('fastify-auth');

const User = require('../models/user');

module.exports = async (fastify) => {
    fastify
        .decorate('_verify', async (request, reply) => {
            try {
                const { token } = request.query;
                if (!token) throw new Error('Bad request: no token was sent');

                const user = await User.findByToken(token);
                if (!user) throw new Error('Authentication failed: token is expired or incorrect');

                request.user = user;
                request.token = token;
            } catch (error) {
                reply.code(401).send(error);
            }
        })
        .decorate('verifyCredentials', async (request, reply) => {
            try {
                if (!request.body) throw new Error('Authentication failed: username and password are required');

                request.user = await User.findByCredentials(request.body.email, request.body.password);
            } catch (error) {
                reply.code(400).send(error);
            }
        })
        .register(FastifyAuth)
        .after(() => {
            fastify.route({
                method: ['POST', 'HEAD'],
                url: '/register',
                logLevel: 'warn',
                handler: async (req, reply) => {
                    const user = new User(req.body);

                    try {
                        await user.save();
                        const token = await user.generateToken();

                        reply.status(201).send({ user, token });
                    } catch (error) {
                        reply.status(400).send(error);
                    }
                }
            });
            fastify.route({
                method: ['POST', 'HEAD'],
                url: '/login',
                logLevel: 'warn',
                preHandler: fastify.auth([ fastify.verifyCredentials ]),
                handler: async (req, reply) => {
                    reply.send({ status: 'Success: logged in', user: req.user, token: req.user.generateToken() });
                }
            });
            fastify.route({
                method: ['GET', 'HEAD'],
                url: '/me',
                logLevel: 'warn',
                preHandler: fastify.auth([ fastify._verify ]),
                handler: async (req, reply) => {
                    reply.send({ status: 'Success: authenticated', user: req.user, token: req.user.getToken() });
                }
            });
            fastify.route({
                method: ['POST', 'HEAD'],
                url: '/logout',
                logLevel: 'warn',
                preHandler: fastify.auth([ fastify._verify ]),
                handler: async (req, reply) => {
                    try {
                        req.user.tokens = req.user.tokens.filter((token) => token.token !== req.token);
                        const loggedOutUser = await req.user.save();

                        reply.send({ status: 'You are logged out!', user: loggedOutUser });
                    } catch (e) {
                        res.status(500).send();
                    }
                }
            });
        });
};
