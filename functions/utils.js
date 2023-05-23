const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const IdentityUtils = (db) => {
    return {
        collection: db.collection('users'),
        createUser: async function(email, password) {
            const { collection } = this;
            const isAlreadyExists = await this.getUserByEmail(email);

            if (isAlreadyExists) throw new Error('User already exists');

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password.concat(salt), 8);

            const user = {
                email: email,
                password: hashedPassword,
                salt: salt,
                tokens: []
            };

            const newUserRef = await collection.add(user);

            return newUserRef.id;
        },
        generateToken: async function(userId) {
            const { collection } = this;

            const token = jwt.sign(
                { userId: userId },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '240h' }
            );

            const docRef = collection.doc(userId);
            const doc = await docRef.get();

            if (doc.exists) {
                const tokens = doc.data().tokens || [];
                tokens.push(token);

                await docRef.update({ tokens });
            }

            return token;
        },
        getUserByEmail: async function(email) {
            const { collection } = this;

            const querySnapshot = await collection.where('email', '==', email).get();

            if (querySnapshot.empty) {
                return null;
            }

            const user = querySnapshot.docs[0].data();
            return {
                id: querySnapshot.docs[0].id,
                ...user
            };
        },
        getUserByToken: async function(token) {
            const { collection } = this;

            const querySnapshot = await collection.where('tokens', 'array-contains', token).get();

            if (querySnapshot.empty) {
                return null;
            }

            const user = querySnapshot.docs[0].data();
            return {
                id: querySnapshot.docs[0].id,
                ...user
            };
        },
        comparePassword: async (password, hashedPassword) => {
            return await bcrypt.compare(password, hashedPassword);
        }
    };
}

module.exports = IdentityUtils;
