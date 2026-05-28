const crypto = require('crypto');

const TOKEN_SECRET = process.env.JWT_SECRET || 'change-this-secret';

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  const candidate = hashPassword(password, salt).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
};

const signToken = (payload) => {
  const encodedPayload = Buffer.from(JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
};

const verifyToken = (token) => {
  if (!token || !token.includes('.')) return null;
  const [encodedPayload, signature] = token.split('.');
  const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('base64url');
  if (signature !== expectedSignature) return null;

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Date.now()) return null;
  return payload;
};

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken
};
