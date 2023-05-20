import FastifyAuth from 'fastify-auth';

import User from '../models/user';

export default async (fastify) => {
    fastify
        .decorate('_verify', async (request, reply) => {
            try {
                const token = request.cookies.token;
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

                        reply.cookie('token', token);
                        reply.status(201).send({ user });
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
                    const token = await req.user.generateToken();

                    reply.cookie('token', token);
                    reply.send({ status: 'Success: logged in', user: req.user });
                }
            });
            fastify.route({
                method: ['GET', 'HEAD'],
                url: '/me',
                logLevel: 'warn',
                preHandler: fastify.auth([ fastify._verify ]),
                handler: async (req, reply) => {
                    reply.send({ status: 'Success: authenticated', user: req.user });
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

                        reply.clearCookie('token');
                        reply.send({ status: 'You are logged out!', user: loggedOutUser });
                    } catch (e) {
                        res.status(500).send();
                    }
                }
            });
        });
};
