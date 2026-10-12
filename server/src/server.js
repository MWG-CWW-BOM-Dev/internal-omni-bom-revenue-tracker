import dotenv from 'dotenv';
import app from './app.js';
import { connectDb } from './db.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDb(process.env.MONGO_URI)
  .then(async () => {
    // Seed super admin user
    const superUsername = process.env.SUPERADMIN_USERNAME;
    const superPassword = process.env.SUPERADMIN_PASSWORD;

    if (superUsername && superPassword) {
      const existingSuperAdmin = await User.findOne({ username: superUsername.toLowerCase() });
      if (!existingSuperAdmin) {
        console.log('Seeding superadmin user...');
        const hashedPassword = await bcrypt.hash(superPassword, 10);
        const superAdmin = new User({
          username: superUsername.toLowerCase(),
          password: hashedPassword,
          plainPassword: superPassword,
          role: 'superadmin',
          permissions: [] // Superadmin has access to everything by default in frontend
        });
        await superAdmin.save();
        console.log('Superadmin user created successfully.');
      } else if (!existingSuperAdmin.plainPassword) {
        existingSuperAdmin.plainPassword = superPassword;
        await existingSuperAdmin.save();
      }
    }

    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
