import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import { sendcloudConfig } from './src/config/sendcloud.config.js';

dotenv.config();

const getAuthToken = () => {
    return Buffer.from(`${sendcloudConfig.publicKey}:${sendcloudConfig.secretKey}`).toString('base64');
};

const sendcloudApi = axios.create({
    baseURL: sendcloudConfig.apiUrl,
    headers: {
        'Authorization': `Basic ${getAuthToken()}`,
        'Content-Type': 'application/json'
    }
});

async function run() {
    try {
        const response = await sendcloudApi.get('/parcels/627725680');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error("Error:", e.response?.data || e.message);
    } finally {
        process.exit(0);
    }
}

run();
