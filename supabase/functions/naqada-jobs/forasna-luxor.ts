import { readForasna, scanForasna } from './forasna.ts';

// Keep existing integrations using the Luxor reader on the shared parser.
export const readForasnaLuxor = (html: string, now = Date.now()) =>
  readForasna(html, now).filter((job) => job.governorate === 'الأقصر');

export async function scanForasnaLuxor() {
  const scan = await scanForasna();
  return { ...scan, jobs: scan.jobs.filter((job) => job.governorate === 'الأقصر') };
}
