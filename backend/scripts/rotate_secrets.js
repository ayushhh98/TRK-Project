const crypto = require('crypto');

/**
 * JWT Secret Rotation Script
 * Run this to generate new secure hex strings for your .env file.
 * 
 * Usage: node scripts/rotate_secrets.js
 */

console.log('\n🔐 TRK SECURITY: JWT SECRET ROTATION\n');
console.log('Generating new secure random keys...\n');

const accessSecret = crypto.randomBytes(64).toString('hex');
const refreshSecret = crypto.randomBytes(64).toString('hex');

console.log('--------------------------------------------------');
console.log('STRICT: UPDATE YOUR .ENV FILE WITH THESE VALUES');
console.log('--------------------------------------------------\n');

console.log('JWT_ACCESS_SECRET=' + accessSecret + '\n');
console.log('JWT_REFRESH_SECRET=' + refreshSecret + '\n');

console.log('--------------------------------------------------');
console.log('⚠️ WARNING: Changing these will log out ALL users.');
console.log('Ensure you perform this during maintenance windows.');
console.log('--------------------------------------------------\n');
