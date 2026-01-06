import prisma from '../../../shared/config/database';
import { CreateStorageLocationDto, UpdateStorageLocationDto } from '../types';
import { AppError } from '../../../shared/middleware/error-handler.middleware';

class StorageLocationService {
    async create(data: CreateStorageLocationDto) {
        // Check for duplicate name within same pharmacy
        const existing = await prisma.storageLocation.findUnique({
            where: {
                pharmacyId_name: {
                    pharmacyId: data.pharmacyId,
                    name: data.name,
                },
            },
        });

        if (existing) {
            throw new AppError('Storage location with this name already exists', 409, 'DUPLICATE_ENTRY');
        }

        return prisma.storageLocation.create({
            data: {
                name: data.name,
                description: data.description,
                pharmacyId: data.pharmacyId,
            },
        });
    }

    async findAll(pharmacyId: string) {
        return prisma.storageLocation.findMany({
            where: { pharmacyId },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { inventoryItems: true },
                },
            },
        });
    }

    async findById(id: string, pharmacyId: string) {
        const location = await prisma.storageLocation.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { inventoryItems: true },
                },
            },
        });

        if (!location || location.pharmacyId !== pharmacyId) {
            throw new AppError('Storage location not found', 404, 'NOT_FOUND');
        }

        return location;
    }

    async update(id: string, pharmacyId: string, data: UpdateStorageLocationDto) {
        // Verify ownership
        const location = await this.findById(id, pharmacyId);

        // Check name uniqueness if name is changing
        if (data.name && data.name !== location.name) {
            const existing = await prisma.storageLocation.findUnique({
                where: {
                    pharmacyId_name: {
                        pharmacyId,
                        name: data.name,
                    },
                },
            });

            if (existing) {
                throw new AppError('Storage location with this name already exists', 409, 'DUPLICATE_ENTRY');
            }
        }

        return prisma.storageLocation.update({
            where: { id },
            data,
        });
    }

    async delete(id: string, pharmacyId: string) {
        const location = await this.findById(id, pharmacyId);

        // Check if location contains inventory
        if (location._count.inventoryItems > 0) {
            throw new AppError('Cannot delete location containing inventory items', 400, 'INVALID_OPERATION');
        }

        await prisma.storageLocation.delete({ where: { id } });
        return { message: 'Storage location deleted successfully' };
    }
}

export default new StorageLocationService();
