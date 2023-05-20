import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    salt: {
        type: String,
        required: true
    },
    tokens: [
        {
            token: {
                type: String,
                required: true
            }
        }
    ]
});

userSchema.pre('save', async function(next) {
    const user = this;

    if (user.isModified('password')) {
        const salt = await bcrypt.genSalt(32);

        user.password = await bcrypt.hash(user.password.concat(salt), 8);
        user.salt = salt;
    }

    next();
});

userSchema.methods.generateToken = async function() {
    const user = this;

    const token = jwt.sign(
        { _id: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '240h' }
    );

    user.tokens = user.tokens.concat({ token });
    await user.save();

    return token;
};

userSchema.statics.findByToken = async function(token) {
    const User = this;
    let decoded;

    try {
        if (!token) return new Error('Error: missing token header');

        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return error;
    }

    return await User.findOne({
        _id: decoded._id,
        'tokens.token': token
    });
};

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error('Error: Unable to login (wrong email)');

    const isPasswordMatching = await bcrypt.compare(password.concat(user.salt), user.password);
    if (!isPasswordMatching) throw new Error('Error: Unable to login (wrong password)');

    return user;
};

const User = mongoose.model('user', userSchema);

export default User;
