import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

async function main() {
  const hash = await bcrypt.hash('admin123', 10);

  await prisma.usuario.upsert({
    where: { email: 'admin@pos.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Dueño',
      email: 'admin@pos.com',
      password: hash,
      rol: 'ADMIN',
    },
  });

  console.log('Seed completado');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });