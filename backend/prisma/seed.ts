import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash password for admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@creatoradvisor.it' },
    update: {},
    create: {
      email: 'admin@creatoradvisor.it',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Default credentials:');
  console.log('   Admin Email: admin@creatoradvisor.it');
  console.log('   Admin Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
