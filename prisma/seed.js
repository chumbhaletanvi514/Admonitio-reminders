const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('tanvi@123', 10);

  // Seed coordinator with access to both WATER_COOLER and FIRE_EXTINGUISHER
  const coordinator = await prisma.coordinator.upsert({
    where: { username: 'tanvi@123' },
    update: {
      password: hashedPassword,
      categories: ['WATER_COOLER', 'FIRE_EXTINGUISHER'],
    },
    create: {
      username: 'tanvi@123',
      notificationEmail: 'admonitiotest@gmail.com',
      password: hashedPassword,
      name: 'Tanvi',
      categories: ['WATER_COOLER', 'FIRE_EXTINGUISHER'],
      roleTitle: 'Campus Safety & Facility Coordinator',
    },
  });

  // Seed Water Coolers
  const waterCoolers = [
    {
      deviceCode: 'WC-A1-010',
      name: 'WC-A1',
      category: 'WATER_COOLER',
      location: 'Block A · 1st Floor Hallway',
      model: 'V-80L',
      filterHealth: 80,
    },
    {
      deviceCode: 'WC-A2-025',
      name: 'WC-A2',
      category: 'WATER_COOLER',
      location: 'Block A · 2nd Floor Near Labs',
      model: 'V-80L',
      filterHealth: 12,
    },
    {
      deviceCode: 'WC-A3-042',
      name: 'WC-A3',
      category: 'WATER_COOLER',
      location: 'Block A · 3rd Floor (Opp Lab 302)',
      model: 'Aquaguard Superio',
      filterHealth: 64,
    },
  ];

  for (const dev of waterCoolers) {
    await prisma.device.upsert({
      where: { deviceCode: dev.deviceCode },
      update: dev,
      create: dev,
    });
  }

  // Seed Fire Extinguishers (Setting initial expiry dates for demonstration)
  // FE-A1: Expiring in 15 days (triggers 15-day reminder)
  const dateIn15Days = new Date();
  dateIn15Days.setDate(dateIn15Days.getDate() + 15);

  // FE-A2: Expiring in 5 days (triggers 5-day escalation)
  const dateIn5Days = new Date();
  dateIn5Days.setDate(dateIn5Days.getDate() + 5);

  // FE-A3: Certified for 1 year
  const dateIn1Year = new Date();
  dateIn1Year.setFullYear(dateIn1Year.getFullYear() + 1);

  const fireExtinguishers = [
    {
      deviceCode: 'FE-A1-101',
      name: 'FE-A1',
      category: 'FIRE_EXTINGUISHER',
      location: 'Block A · Ground Floor Main Reception',
      model: 'Ceasefire Pro',
      capacity: '6 KG',
      extinguisherType: 'ABC Dry Powder',
      expiryDate: dateIn15Days,
    },
    {
      deviceCode: 'FE-A2-204',
      name: 'FE-A2',
      category: 'FIRE_EXTINGUISHER',
      location: 'Block A · 2nd Floor Chemistry Wing',
      model: 'Safex CO2-4',
      capacity: '4.5 KG',
      extinguisherType: 'Carbon Dioxide (CO2)',
      expiryDate: dateIn5Days,
    },
    {
      deviceCode: 'FE-A3-305',
      name: 'FE-A3',
      category: 'FIRE_EXTINGUISHER',
      location: 'Block A · 3rd Floor Server Room',
      model: 'Kanex Clean Agent',
      capacity: '4 KG',
      extinguisherType: 'Clean Agent / Halotron',
      expiryDate: dateIn1Year,
    },
  ];

  for (const fe of fireExtinguishers) {
    await prisma.device.upsert({
      where: { deviceCode: fe.deviceCode },
      update: fe,
      create: fe,
    });
  }

  console.log('✅ Seeded Coordinator:', coordinator.username);
  console.log('✅ Seeded Water Coolers and Fire Extinguishers successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });