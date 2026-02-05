import prisma from '../config/database';

/**
 * Create a tenant-aware Prisma client extension
 * This ensures all queries for tenant data include pharmacyId filter
 */
export const createTenantPrisma = (pharmacyId: string) => {
  return prisma.$extends({
    query: {
      pharmacyInventory: {
        async findMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId, isDeleted: false };
          return query(args);
        },
        async findUnique({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId, isDeleted: false };
          return query(args);
        },
        async findFirst({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId, isDeleted: false };
          return query(args);
        },
        async count({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId, isDeleted: false };
          return query(args);
        },
        async update({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async updateMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async delete({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async deleteMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async upsert({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
      },
      pharmacyOrder: {
        async findMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async findUnique({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async findFirst({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async count({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async update({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async delete({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
      },
      pharmacyInvoice: {
        async findMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async findUnique({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async findFirst({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async count({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async update({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
      },
      pharmacyStaff: {
        async findMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async findUnique({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async findFirst({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async update({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async delete({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
      },
      storageLocation: {
        async findMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async findUnique({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async update({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async delete({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
      },
      pharmacyAnalytics: {
        async findMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async findUnique({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async upsert({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
      },
      staffNotification: {
        async findMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async update({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async updateMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async deleteMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
      },
      purchaseInvoice: {
        async findMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async findUnique({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
        async update({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, pharmacyId };
          return query(args);
        },
      },
    },
  });
};

export default prisma;

