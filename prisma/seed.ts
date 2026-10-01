import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import {
  EstadoCaja,
  EstadoOrden,
  EstadoVenta,
  MetodoPago,
  Prisma,
  PrismaClient,
  Rol,
} from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

async function crearUsuario(data: {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: Rol;
}) {
  const hash = await bcrypt.hash(data.password, 10);
  return prisma.usuario.upsert({
    where: { email: data.email },
    update: {},
    create: { ...data, password: hash },
  });
}

async function main() {
  // ─── 1. Usuarios de los 3 roles ───
  await crearUsuario({ nombre: 'Admin', apellido: 'Dueño', email: 'admin@pos.com', password: 'admin123', rol: Rol.ADMIN });
  const ana = await crearUsuario({ nombre: 'Ana', apellido: 'Gómez', email: 'ana@pos.com', password: 'cajero123', rol: Rol.CAJERO });
  const lucia = await crearUsuario({ nombre: 'Lucía', apellido: 'Fernández', email: 'lucia@mail.com', password: 'cliente123', rol: Rol.CLIENTE });

  const cliente = await prisma.cliente.upsert({
    where: { usuarioId: lucia.id },
    update: {},
    create: {
      usuarioId: lucia.id,
      telefono: '3415551234',
      carrito: { create: {} },
      direcciones: {
        create: { calle: 'Córdoba 1234', ciudad: 'Rosario', referencias: 'Portón negro, timbre 2B' },
      },
    },
  });

  // Si ya hay productos, el resto ya fue sembrado: no duplicar
  if ((await prisma.producto.count()) > 0) {
    console.log('El catálogo ya existe: se omiten productos, ventas y órdenes.');
    return;
  }

  // ─── 2. Categorías ───
  const categorias: Record<string, { id: number }> = {};
  for (const nombre of ['Llaveros', 'Soportes', 'Figuras', 'Decoración']) {
    categorias[nombre] = await prisma.categoria.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  // ─── 3. Productos (uno con stock 0 para mostrar que se oculta) ───
  const productosData = [
    { key: 'llavero', nombre: 'Llavero personalizado', descripcion: 'PLA, 6 cm', costo: 1200, precioVenta: 3000, stock: 25, categoria: 'Llaveros' },
    { key: 'llaveroNombre', nombre: 'Llavero con nombre', descripcion: 'PLA, letras en relieve', costo: 900, precioVenta: 2500, stock: 0, categoria: 'Llaveros' },
    { key: 'soporteCelular', nombre: 'Soporte de celular', descripcion: 'PETG negro', costo: 1500, precioVenta: 3500, stock: 18, categoria: 'Soportes' },
    { key: 'soporteBici', nombre: 'Soporte bicicleta', descripcion: 'PETG negro', costo: 2000, precioVenta: 4000, stock: 9, categoria: 'Soportes' },
    { key: 'soporteAuris', nombre: 'Soporte de auriculares', descripcion: 'PLA mate', costo: 2200, precioVenta: 4500, stock: 6, categoria: 'Soportes' },
    { key: 'dragon', nombre: 'Figura de dragón', descripcion: 'PLA blanco, 12 cm', costo: 3000, precioVenta: 6500, stock: 4, categoria: 'Figuras' },
    { key: 'busto', nombre: 'Busto decorativo', descripcion: 'PLA gris, 15 cm', costo: 3500, precioVenta: 7000, stock: 2, categoria: 'Figuras' },
    { key: 'maceta', nombre: 'Maceta geométrica', descripcion: 'PLA, 10 cm', costo: 1800, precioVenta: 3800, stock: 12, categoria: 'Decoración' },
  ];

  const productos: Record<string, { id: number; precioVenta: Prisma.Decimal }> = {};
  for (const { key, categoria, ...data } of productosData) {
    productos[key] = await prisma.producto.create({
      data: { ...data, categoriaId: categorias[categoria].id },
    });
  }

  const armarDetalles = (items: { key: string; cantidad: number }[]) => {
    const detalles = items.map((i) => ({
      productoId: productos[i.key].id,
      cantidad: i.cantidad,
      precioUnitario: productos[i.key].precioVenta,
    }));
    const total = detalles.reduce(
      (acc, d) => acc.plus(d.precioUnitario.mul(d.cantidad)),
      new Prisma.Decimal(0),
    );
    return { detalles, total };
  };

  // ─── 4. Caja cerrada del 01/10 con ventas completadas ───
  const cajaCerrada = await prisma.caja.create({
    data: {
      usuarioId: ana.id,
      montoInicial: 5000,
      estado: EstadoCaja.CERRADA,
      abiertaEn: new Date('2026-10-01T09:00:00-03:00'),
      cerradaEn: new Date('2026-10-01T18:00:00-03:00'),
    },
  });

  const ventasData = [
    { hora: '10:15', metodo: MetodoPago.EFECTIVO, items: [{ key: 'llavero', cantidad: 2 }, { key: 'soporteCelular', cantidad: 1 }] },
    { hora: '12:40', metodo: MetodoPago.TARJETA, items: [{ key: 'dragon', cantidad: 1 }] },
    { hora: '15:05', metodo: MetodoPago.TRANSFERENCIA_QR, items: [{ key: 'soporteBici', cantidad: 1 }, { key: 'maceta', cantidad: 2 }] },
    { hora: '17:30', metodo: MetodoPago.EFECTIVO, items: [{ key: 'soporteAuris', cantidad: 1 }] },
  ];

  let efectivo = new Prisma.Decimal(0);
  for (const v of ventasData) {
    const { detalles, total } = armarDetalles(v.items);
    await prisma.venta.create({
      data: {
        cajaId: cajaCerrada.id,
        cajeroId: ana.id,
        fecha: new Date(`2026-10-01T${v.hora}:00-03:00`),
        metodoPago: v.metodo,
        estado: EstadoVenta.COMPLETADA,
        total,
        detalles: { create: detalles },
      },
    });
    if (v.metodo === MetodoPago.EFECTIVO) efectivo = efectivo.plus(total);
  }

  // El cajero declaró exactamente lo esperado: la caja CUADRA
  await prisma.caja.update({
    where: { id: cajaCerrada.id },
    data: { montoFinalDeclarado: cajaCerrada.montoInicial.plus(efectivo) },
  });

  // Caja abierta: Ana puede vender apenas inicia sesión
  await prisma.caja.create({ data: { usuarioId: ana.id, montoInicial: 5000 } });

  // ─── 5. Órdenes en todos los estados ───
  const contactoLucia = {
    nombreContacto: 'Lucía Fernández',
    telefonoContacto: '3415551234',
    direccionEnvio: 'Córdoba 1234, Rosario',
    referencias: 'Portón negro, timbre 2B',
  };

  const ordenesData = [
    { estado: EstadoOrden.PENDIENTE, clienteId: cliente.id, contacto: contactoLucia, items: [{ key: 'soporteCelular', cantidad: 1 }] },
    { estado: EstadoOrden.PAGADO, clienteId: cliente.id, contacto: contactoLucia, items: [{ key: 'busto', cantidad: 1 }] },
    { estado: EstadoOrden.EN_CAMINO, clienteId: cliente.id, contacto: contactoLucia, items: [{ key: 'llavero', cantidad: 3 }] },
    { estado: EstadoOrden.ENTREGADO, clienteId: cliente.id, contacto: contactoLucia, items: [{ key: 'maceta', cantidad: 1 }, { key: 'soporteBici', cantidad: 1 }] },
    {
      estado: EstadoOrden.PAGADO,
      clienteId: null,
      contacto: { nombreContacto: 'Marta López', telefonoContacto: '3416667788', direccionEnvio: 'Oroño 900, Rosario', referencias: 'Venta por Marketplace' },
      items: [{ key: 'llavero', cantidad: 1 }],
    },
    {
      estado: EstadoOrden.CANCELADO,
      clienteId: null,
      contacto: { nombreContacto: 'Carlos Ruiz', telefonoContacto: '3415556677', direccionEnvio: 'San Martín 500, Rosario', referencias: null },
      items: [{ key: 'dragon', cantidad: 1 }],
    },
  ];

  for (const o of ordenesData) {
    const { detalles, total } = armarDetalles(o.items);
    await prisma.orden.create({
      data: {
        ...o.contacto,
        estado: o.estado,
        clienteId: o.clienteId,
        total,
        detalles: { create: detalles },
      },
    });
  }

  console.log('Seed completo: usuarios, catálogo, ventas, cajas y órdenes.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });