const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin@123', 10);

  const coordinator = await prisma.coordinator.upsert({
    where: { username: '2024-COORD-07' },
    update: {},
    create: {
      username: '2024-COORD-07',
      password: hashedPassword,
      name: 'Ashok Kumar',
      category: 'WATER_COOLER',
      roleTitle: 'Block A Water Cooler Coordinator',
    },
  });

  const devices = [
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

  for (const dev of devices) {
    await prisma.device.upsert({
      where: { deviceCode: dev.deviceCode },
      update: {},
      create: dev,
    });
  }

  console.log('Seeded Coordinator:', coordinator.username, `(${coordinator.category})`);
  console.log('Seeded Devices for category WATER_COOLER successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });