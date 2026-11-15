// npm run seed:radiation — refresh ONLY the simulated radiation record so its dates line up with today
// (e.g. on demo day). Nothing else in the database is read for writing or changed.
import { prisma } from '../src/db/client.js';
import { refreshSimulatedRadiation } from './radiation-data.js';

async function main() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const first = await prisma.astronaut.findFirst({ where: { missionStart: { not: null } }, orderBy: { missionStart: 'asc' }, select: { missionStart: true } });
  const missionStart = first?.missionStart ?? new Date(Date.now() - 89 * 86400000);
  const created = await refreshSimulatedRadiation(missionStart, today);
  console.log(`Radiation: ${created} simulated records refreshed (mission start ${missionStart.toISOString().slice(0, 10)}).`);
}

main()
  .catch((error) => {
    console.error('Radiation seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
