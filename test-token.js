import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NzlmOWIwY2QwNTM2OGI0NzMzOWViYSIsImlhdCI6MTc2OTYwMTQ5OSwiZXhwIjoxNzcyMTkzNDk5fQ.GT-7G51sexe37azPXt2G9jJJ7ZsvbLcwOBhFLNdccwo";

console.log('Testing Token Verification...');
console.log('Secret:', process.env.JWT_SECRET);

try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token is valid!');
    console.log('Decoded:', decoded);
} catch (error) {
    console.error('❌ Token Verification Failed:');
    console.error(error.message);
}
