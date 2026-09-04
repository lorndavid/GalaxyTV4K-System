import { prisma } from './utils/prisma.js';
import { seedOfficialEmployees } from './services/seedEmployeesService.js';

async function main() {
  console.log('🌱 Starting official data sync...');
  await seedOfficialEmployees(prisma);
  console.log('🎉 Official data verification & sync completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ Data sync error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
