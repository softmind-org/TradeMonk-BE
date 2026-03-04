import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const API_URL = 'http://localhost:5000/api/v1';

async function runTest() {
    try {
        console.log("--- Starting Admin APIs Test ---");

        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        
        const admin = await db.collection('users').findOne({ email: 'admin@trademonk.com' });
        
        if (!admin || admin.role !== 'admin') {
            console.error("Admin user not found. Please seed admin first.");
            process.exit(1);
        }
        
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Save token to DB for session check
        await db.collection('users').updateOne(
            { _id: admin._id }, 
            { $set: { accessToken: token } }
        );
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log("✅ Admin Token Generated");

        // ----------------------------------------
        // TEST CATEGORIES API
        // ----------------------------------------
        console.log("\n--- Testing Categories API ---");
        
        console.log("Creating a new category...");
        const createCatRes = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: "Test Category " + Date.now(),
                slug: "test-category-" + Date.now(),
                description: "This is a test category"
            })
        });
        
        const newCat = await createCatRes.json();
        if (createCatRes.ok) {
            console.log("✅ Created Category:", newCat.data.name);
        } else {
            console.error("❌ Failed to create category:", newCat);
        }

        console.log("Fetching all categories...");
        const getCatsRes = await fetch(`${API_URL}/categories`);
        const catsData = await getCatsRes.json();
        if (getCatsRes.ok && catsData.data.length > 0) {
            console.log(`✅ Fetched ${catsData.data.length} categories`);
        } else {
            console.error("❌ Failed to fetch categories");
        }

        // ----------------------------------------
        // TEST USERS API
        // ----------------------------------------
        console.log("\n--- Testing Users API ---");

        console.log("Fetching all users...");
        const getUsersRes = await fetch(`${API_URL}/users`, { headers });
        const usersData = await getUsersRes.json();
        
        if (getUsersRes.ok) {
            console.log(`✅ Fetched ${usersData.count} users`);
            
            // Find a non-admin user to test status toggle
            const nonAdmin = usersData.data.find(u => u.role !== 'admin');
            if (nonAdmin) {
                console.log(`Getting details for user: ${nonAdmin.email}`);
                const getDetailRes = await fetch(`${API_URL}/users/${nonAdmin._id}`, { headers });
                const detailData = await getDetailRes.json();
                
                if (getDetailRes.ok && detailData.data.stats) {
                    console.log(`✅ User details fetched. Trust Score: ${detailData.data.stats.trustScore}`);
                    
                    console.log(`Suspending user...`);
                    const suspendRes = await fetch(`${API_URL}/users/${nonAdmin._id}/status`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify({ status: 'suspended' })
                    });
                    
                    if (suspendRes.ok) {
                        console.log("✅ User successfully suspended!");
                        
                        // Restore status
                        await fetch(`${API_URL}/users/${nonAdmin._id}/status`, {
                            method: 'PATCH',
                            headers,
                            body: JSON.stringify({ status: 'active' })
                        });
                        console.log("✅ User successfully restored to active.");
                        
                    } else {
                        console.error("❌ Failed to suspend user:", await suspendRes.json());
                    }
                } else {
                    console.error("❌ Failed to get user details");
                }
            } else {
                console.log("⚠️ No non-admin users found to test status toggle.");
            }
        } else {
            console.error("❌ Failed to fetch users");
        }

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runTest();
