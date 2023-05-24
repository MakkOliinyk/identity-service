const FastifyAuth = require('fastify-auth');

module.exports = async (fastify) => {
    fastify
        .decorate('_verify', async (request, reply) => {
            try {
                const token = request.headers.authorization;

                if (!token) throw new Error('Bad request: no token was sent');

                const authToken = token.split(' ')[1];

                const user = await fastify.Identity.getUserByToken(authToken);
                if (!user) throw new Error('Authentication failed: token is expired or incorrect');

                request.user = user;
                request.token = authToken;
            } catch (error) {
                reply.code(401).send(error);
            }
        })
        .decorate('verifyCredentials', async (request, reply) => {
            try {
                if (!request.body) throw new Error('Authentication failed: email and password are required');

                const user = await fastify.Identity.getUserByEmail(request.body.email);
                if (!user) throw new Error('Authentication failed: user does not exist');

                const isPasswordMatching = await fastify.Identity.comparePassword(request.body.password.concat(user.salt), user.password);
                if (!isPasswordMatching) throw new Error('Authentication failed: invalid password');

                request.user = user;
            } catch (error) {
                reply.code(400).send(error);
            }
        })
        .register(FastifyAuth)
        .after(() => {
            fastify.route({
                method: ['POST'],
                url: '/register',
                logLevel: 'warn',
                handler: async (req, reply) => {
                    try {
                        const userId = await fastify.Identity.createUser(req.body.email, req.body.password);

                        const token = await fastify.Identity.generateToken(userId);

                        reply.status(201).send({ user: { id: userId, email: req.body.email }, token });
                    } catch (error) {
                        reply.status(400).send(error);
                    }
                }
            });
            fastify.route({
                method: ['POST', 'HEAD'],
                url: '/login',
                logLevel: 'warn',
                preHandler: fastify.auth([fastify.verifyCredentials]),
                handler: async (req, reply) => {
                    try {
                        const token = await fastify.Identity.generateToken(req.user.id);

                        reply.send({ user: req.user, token });
                    } catch (error) {
                        reply.status(400).send(error);
                    }
                }
            });
            fastify.route({
                method: ['GET', 'HEAD'],
                url: '/me',
                logLevel: 'warn',
                preHandler: fastify.auth([ fastify._verify ]),
                handler: async (req, reply) => {
                    reply.send({ user: req.user, token: fastify.Identity.generateToken() });
                }
            });
            fastify.route({
                method: ['POST', 'HEAD'],
                url: '/logout',
                logLevel: 'warn',
                preHandler: fastify.auth([fastify._verify]),
                handler: async (req, reply) => {
                    try {
                        req.user.tokens = req.user.tokens.filter((token) => token !== req.token);
                        await fastify.Identity.collection.doc(req.user.id).update({
                            tokens: req.user.tokens
                        });

                        reply.send({ user: req.user });
                    } catch (error) {
                        reply.status(500).send();
                    }
                }
            });
        });
};
