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

  // Create Chatter Manager
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@creatoradvisor.it' },
    update: {},
    create: {
      email: 'manager@creatoradvisor.it',
      password: managerPassword,
      name: 'Chatter Manager',
      role: 'CHATTER_MANAGER',
      commissionPercent: 20,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });

  console.log('✅ Created manager user:', manager.email);

  // Create multiple chatter users for testing
  const chatterPassword = await bcrypt.hash('chatter123', 10);
  const chatters = [];
  
  const chatterNames = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Williams', 'Carol Brown'];
  for (let i = 0; i < chatterNames.length; i++) {
    const chatter = await prisma.user.upsert({
      where: { email: `chatter${i + 1}@creatoradvisor.it` },
      update: {},
      create: {
        email: `chatter${i + 1}@creatoradvisor.it`,
        password: chatterPassword,
        name: chatterNames[i],
        role: 'CHATTER',
        commissionPercent: i < 2 ? 15 : 18, // Mix of commission rates
        emailVerified: true,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });
    chatters.push(chatter);
  }

  console.log(`✅ Created ${chatters.length} chatter users`);

  // Create multiple creators
  const creators = [];
  const creatorData = [
    { name: 'MELISA', compensationType: 'PERCENTAGE' as const, revenueSharePercent: 50 },
    { name: 'BIANCA', compensationType: 'SALARY' as const, fixedSalaryCost: 1000 },
    { name: 'SOPHIA', compensationType: 'PERCENTAGE' as const, revenueSharePercent: 45 },
    { name: 'EMMA', compensationType: 'SALARY' as const, fixedSalaryCost: 1500 },
    { name: 'OLIVIA', compensationType: 'PERCENTAGE' as const, revenueSharePercent: 40 },
  ];

  for (const creatorInfo of creatorData) {
    const creator = await prisma.creator.upsert({
      where: { name: creatorInfo.name },
      update: {},
      create: {
        name: creatorInfo.name,
        compensationType: creatorInfo.compensationType,
        revenueSharePercent: creatorInfo.revenueSharePercent || null,
        fixedSalaryCost: creatorInfo.fixedSalaryCost || null,
        isActive: true,
      },
    });
    creators.push(creator);
  }

  console.log(`✅ Created ${creators.length} creators`);

  // Create sample sales for current month, previous month, and January 2026
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const sales = [];
  
  // Generate sales for January 2026 (for testing - cover most of the month)
  const jan2026Month = 0; // January (0-indexed)
  const jan2026Year = 2026;
  const jan2026DaysInMonth = new Date(jan2026Year, jan2026Month + 1, 0).getDate();
  
  for (let i = 0; i < 20; i++) {
    const dayOfMonth = Math.min(i + 1, jan2026DaysInMonth);
    const saleDate = new Date(jan2026Year, jan2026Month, dayOfMonth, 10 + (i % 8), Math.floor(Math.random() * 60), 0);
    
    // Create 2-5 sales per day, distributed across chatters
    const salesPerDay = Math.floor(Math.random() * 4) + 2;
    for (let j = 0; j < salesPerDay; j++) {
      const creator = creators[Math.floor(Math.random() * creators.length)];
      const chatter = chatters[Math.floor(Math.random() * chatters.length)];
      const saleTypes = ['CAM', 'TIP', 'PPV', 'INITIAL', 'CUSTOM'];
      const saleType = saleTypes[Math.floor(Math.random() * saleTypes.length)];
      const amount = Math.floor(Math.random() * 500) + 50; // €50-€550

      sales.push({
        userId: chatter.id,
        creatorId: creator.id,
        amount: amount,
        saleType: saleType,
        status: i < 3 ? 'ONLINE' : 'OFFLINE', // Recent sales are ONLINE
        saleDate: new Date(saleDate.getTime() + j * 3600000), // Spread throughout the day
        note: `Sale for ${creator.name} by ${chatter.name}`,
      });
    }
  }

  // Generate sales for current month (last 15 days)
  for (let i = 0; i < 15; i++) {
    const saleDate = new Date(currentYear, currentMonth, daysInMonth - i, 10 + (i % 8), Math.floor(Math.random() * 60), 0);
    
    // Create 2-5 sales per day, distributed across chatters
    const salesPerDay = Math.floor(Math.random() * 4) + 2;
    for (let j = 0; j < salesPerDay; j++) {
      const creator = creators[Math.floor(Math.random() * creators.length)];
      const chatter = chatters[Math.floor(Math.random() * chatters.length)];
      const saleTypes = ['CAM', 'TIP', 'PPV', 'INITIAL', 'CUSTOM'];
      const saleType = saleTypes[Math.floor(Math.random() * saleTypes.length)];
      const amount = Math.floor(Math.random() * 500) + 50; // €50-€550

      sales.push({
        userId: chatter.id,
        creatorId: creator.id,
        amount: amount,
        saleType: saleType,
        status: i < 3 ? 'ONLINE' : 'OFFLINE', // Recent sales are ONLINE
        saleDate: new Date(saleDate.getTime() + j * 3600000), // Spread throughout the day
        note: `Sale for ${creator.name} by ${chatter.name}`,
      });
    }
  }

  // Generate sales for previous month
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevDaysInMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = 0; i < 10; i++) {
    const saleDate = new Date(prevYear, prevMonth, prevDaysInMonth - i, 10 + (i % 8), Math.floor(Math.random() * 60), 0);
    
    const salesPerDay = Math.floor(Math.random() * 3) + 2;
    for (let j = 0; j < salesPerDay; j++) {
      const creator = creators[Math.floor(Math.random() * creators.length)];
      const chatter = chatters[Math.floor(Math.random() * chatters.length)];
      const saleTypes = ['CAM', 'TIP', 'PPV', 'INITIAL'];
      const saleType = saleTypes[Math.floor(Math.random() * saleTypes.length)];
      const amount = Math.floor(Math.random() * 400) + 50;

      sales.push({
        userId: chatter.id,
        creatorId: creator.id,
        amount: amount,
        saleType: saleType,
        status: 'OFFLINE',
        saleDate: new Date(saleDate.getTime() + j * 3600000),
        note: `Previous month sale`,
      });
    }
  }

  // Create sales in bulk
  await prisma.sale.createMany({
    data: sales,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${sales.length} sample sales`);

  // Create monthly financials for creators based on actual sales
  // Calculate gross revenue from sales, then add costs
  const monthlyFinancials = [];
  
  // Function to calculate gross revenue from sales for a creator in a specific month
  const calculateCreatorRevenue = async (creatorId: string, year: number, month: number) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const sales = await prisma.sale.findMany({
      where: {
        creatorId,
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
      },
    });
    
    return sales.reduce((sum, sale) => sum + sale.amount, 0);
  };
  
  // Calculate and create monthly financials for each creator
  for (const creator of creators) {
    // January 2026 financials
    const jan2026GrossRevenue = await calculateCreatorRevenue(creator.id, 2026, 1);
    if (jan2026GrossRevenue > 0) {
      monthlyFinancials.push({
        creatorId: creator.id,
        year: 2026,
        month: 1, // January
        grossRevenue: jan2026GrossRevenue,
        marketingCosts: Math.floor(jan2026GrossRevenue * 0.1),
        toolCosts: Math.floor(jan2026GrossRevenue * 0.05),
        otherCosts: Math.floor(jan2026GrossRevenue * 0.03),
      });
    }

    // Current month financials
    const currentGrossRevenue = await calculateCreatorRevenue(creator.id, currentYear, currentMonth + 1);
    if (currentGrossRevenue > 0) {
      monthlyFinancials.push({
        creatorId: creator.id,
        year: currentYear,
        month: currentMonth + 1,
        grossRevenue: currentGrossRevenue,
        marketingCosts: Math.floor(currentGrossRevenue * 0.1),
        toolCosts: Math.floor(currentGrossRevenue * 0.05),
        otherCosts: Math.floor(currentGrossRevenue * 0.03),
      });
    }

    // Previous month financials
    const prevGrossRevenue = await calculateCreatorRevenue(creator.id, prevYear, prevMonth + 1);
    if (prevGrossRevenue > 0) {
      monthlyFinancials.push({
        creatorId: creator.id,
        year: prevYear,
        month: prevMonth + 1,
        grossRevenue: prevGrossRevenue,
        marketingCosts: Math.floor(prevGrossRevenue * 0.1),
        toolCosts: Math.floor(prevGrossRevenue * 0.05),
        otherCosts: Math.floor(prevGrossRevenue * 0.03),
      });
    }
  }

  await prisma.monthlyFinancial.createMany({
    data: monthlyFinancials,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${monthlyFinancials.length} monthly financial records`);

  // Create sample shifts for current week and next week
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday of current week
  weekStart.setHours(0, 0, 0, 0);

  const shifts = [];
  const shiftTimes = [
    { start: '09:00', end: '14:30' },
    { start: '14:30', end: '20:00' },
    { start: '20:00', end: '01:00' },
  ];

  // Create shifts for current week
  for (let day = 0; day < 7; day++) {
    const shiftDate = new Date(weekStart);
    shiftDate.setDate(weekStart.getDate() + day);
    
    // Monday-Friday: more shifts
    // Saturday-Sunday: fewer shifts
    const isWeekend = day === 5 || day === 6;
    const shiftsPerDay = isWeekend ? 2 : 4;
    
    // Distribute chatters across shifts
    const shuffledChatters = [...chatters].sort(() => Math.random() - 0.5);
    let chatterIndex = 0;
    
    for (let s = 0; s < shiftsPerDay; s++) {
      const shiftTime = shiftTimes[Math.floor(Math.random() * shiftTimes.length)];
      // Skip evening shifts on weekends
      if (isWeekend && shiftTime.start === '20:00') continue;
      
      const chatter = shuffledChatters[chatterIndex % shuffledChatters.length];
      shifts.push({
        userId: chatter.id,
        date: shiftDate,
        startTime: shiftTime.start,
        endTime: shiftTime.end,
        createdBy: admin.id,
      });
      chatterIndex++;
    }
  }

  // Create shifts for next week (fewer, for testing)
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(weekStart.getDate() + 7);
  
  for (let day = 0; day < 5; day++) { // Monday to Friday only
    const shiftDate = new Date(nextWeekStart);
    shiftDate.setDate(nextWeekStart.getDate() + day);
    
    const shiftsPerDay = 3;
    const shuffledChatters = [...chatters].sort(() => Math.random() - 0.5);
    let chatterIndex = 0;
    
    for (let s = 0; s < shiftsPerDay; s++) {
      const shiftTime = shiftTimes[Math.floor(Math.random() * shiftTimes.length)];
      const chatter = shuffledChatters[chatterIndex % shuffledChatters.length];
      shifts.push({
        userId: chatter.id,
        date: shiftDate,
        startTime: shiftTime.start,
        endTime: shiftTime.end,
        createdBy: admin.id,
      });
      chatterIndex++;
    }
  }

  await prisma.shift.createMany({
    data: shifts,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${shifts.length} sample shifts`);

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Default credentials:');
  console.log('   Admin Email: admin@creatoradvisor.it');
  console.log('   Admin Password: admin123');
  console.log('   Manager Email: manager@creatoradvisor.it');
  console.log('   Manager Password: manager123');
  console.log('   Chatter Emails: chatter1@creatoradvisor.it - chatter5@creatoradvisor.it');
  console.log('   Chatter Password: chatter123');
  console.log('\n⚠️  Please change passwords after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
