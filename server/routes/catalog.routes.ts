import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { guard } from '../shared/middleware/guard.middleware.js';
import { maskCostData } from '../serializers/mask-cost.serializer.js';
import { createRecipeSnapshot } from '../domain/recipe/snapshot.js';

export const catalogRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 1. GET /api/pos/catalog - POS Catalog without cost data (§13.4, §17.6)
  fastify.get(
    '/pos/catalog',
    {
      preHandler: [guard({ roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'KASIR', 'BARISTA'] })],
    },
    async (request, reply) => {
      const tenantId = request.sessionContext?.tenantId;
      const role = request.sessionContext?.role;

      if (!tenantId) {
        return reply.code(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Tenant ID tidak ditemukan pada sesi.',
        });
      }

      const menus = await prisma.menu.findMany({
        where: { tenantId, isActive: true },
        include: {
          recipes: {
            where: {
              OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
            },
            include: {
              details: {
                include: {
                  item: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      let maxMenuVersion = 1;
      for (const m of menus) {
        if (m.recipes && m.recipes.length > 0) {
          const v = m.recipes[0].version;
          if (v > maxMenuVersion) maxMenuVersion = v;
        }
      }

      // Hash active presets
      const presetString = 'preset-v1-default';
      const presetVersionHash = crypto.createHash('sha256').update(presetString).digest('hex').slice(0, 16);

      const formattedMenus = menus.map((m) => {
        const activeRecipe = m.recipes[0];
        return {
          id: m.id,
          name: m.name,
          category: m.category,
          price: m.price,
          status: m.isActive ? 'active' : 'inactive',
          recipeVersion: activeRecipe ? activeRecipe.version : 1,
          costPrice: 0, // Stripped by maskCostData for KASIR/BARISTA
        };
      });

      const responsePayload = {
        menus: formattedMenus,
        menuVersion: maxMenuVersion,
        presetVersionHash,
      };

      return reply.code(200).send({
        success: true,
        data: maskCostData(responsePayload, role),
      });
    }
  );

  // 2. GET /api/menus - List menus (§13.4)
  fastify.get(
    '/menus',
    {
      preHandler: [guard({ roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'KASIR', 'BARISTA'] })],
    },
    async (request, reply) => {
      const tenantId = request.sessionContext?.tenantId;
      const role = request.sessionContext?.role;

      if (!tenantId) {
        return reply.code(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Tenant ID tidak ditemukan pada sesi.',
        });
      }

      const menus = await prisma.menu.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      });

      return reply.code(200).send({
        success: true,
        data: maskCostData(menus, role),
      });
    }
  );

  // 3. POST /api/menus - Create Menu (§13.4)
  fastify.post(
    '/menus',
    {
      preHandler: [guard({ roles: ['SUPER_ADMIN', 'OWNER'] })],
    },
    async (request, reply) => {
      const tenantId = request.sessionContext?.tenantId;
      const body = request.body as {
        name: string;
        price: number;
        category?: string;
        description?: string;
      };

      if (!tenantId) {
        return reply.code(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Tenant ID tidak ditemukan pada sesi.',
        });
      }

      if (!body.name || body.price === undefined) {
        return reply.code(400).send({
          success: false,
          error: 'VAL-001',
          message: 'Nama menu dan harga jual wajib diisi.',
        });
      }

      const menu = await prisma.menu.create({
        data: {
          tenantId,
          name: body.name,
          price: Number(body.price),
          category: body.category || 'Coffee',
          description: body.description || '',
          isActive: true,
        },
      });

      return reply.code(201).send({
        success: true,
        data: menu,
      });
    }
  );

  // 4. GET /api/items - Raw materials & packaging (§13.4)
  fastify.get(
    '/items',
    {
      preHandler: [guard({ roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'BARISTA'] })],
    },
    async (request, reply) => {
      const tenantId = request.sessionContext?.tenantId;
      const role = request.sessionContext?.role;

      if (!tenantId) {
        return reply.code(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Tenant ID tidak ditemukan pada sesi.',
        });
      }

      const items = await prisma.item.findMany({
        where: { tenantId },
        include: {
          unit: true,
        },
        orderBy: { name: 'asc' },
      });

      return reply.code(200).send({
        success: true,
        data: maskCostData(items, role),
      });
    }
  );

  // 5. POST /api/items - Create item (§13.4)
  fastify.post(
    '/items',
    {
      preHandler: [guard({ roles: ['SUPER_ADMIN', 'OWNER'] })],
    },
    async (request, reply) => {
      const tenantId = request.sessionContext?.tenantId;
      const body = request.body as {
        name: string;
        sku?: string;
        category?: string;
        unitId?: string;
        price?: number;
        minStock?: number;
      };

      if (!tenantId) {
        return reply.code(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Tenant ID tidak ditemukan pada sesi.',
        });
      }

      if (!body.name) {
        return reply.code(400).send({
          success: false,
          error: 'VAL-001',
          message: 'Nama bahan baku wajib diisi.',
        });
      }

      // Ensure a unit exists
      let unitId = body.unitId;
      if (!unitId) {
        const defaultUnit = await prisma.unit.findFirst({
          where: { tenantId },
        });
        if (defaultUnit) {
          unitId = defaultUnit.id;
        } else {
          const newUnit = await prisma.unit.create({
            data: {
              tenantId,
              name: 'Gram',
              symbol: 'g',
            },
          });
          unitId = newUnit.id;
        }
      }

      const item = await prisma.item.create({
        data: {
          tenantId,
          name: body.name,
          sku: body.sku || `SKU-${Date.now()}`,
          category: body.category || 'RAW',
          unitId,
          price: Number(body.price || 0),
          minStock: Number(body.minStock || 0),
          status: 'ACTIVE',
        },
      });

      return reply.code(201).send({
        success: true,
        data: item,
      });
    }
  );

  // 6. PUT /api/menus/:id/recipe - Update recipe and create RecipeVersionSnapshot (§17.6)
  fastify.put(
    '/menus/:id/recipe',
    {
      preHandler: [guard({ roles: ['SUPER_ADMIN', 'OWNER'] })],
    },
    async (request, reply) => {
      const tenantId = request.sessionContext?.tenantId;
      const { id: menuId } = request.params as { id: string };
      const body = request.body as {
        components: Array<{
          componentType: 'MATERIAL' | 'PACKAGING' | 'MODIFIER';
          itemId: string;
          itemName: string;
          quantity: number;
          unit: string;
          wastePercent: number;
        }>;
      };

      if (!tenantId) {
        return reply.code(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Tenant ID tidak ditemukan pada sesi.',
        });
      }

      const menu = await prisma.menu.findUnique({
        where: { id: menuId },
        include: { recipes: { orderBy: { version: 'desc' }, take: 1 } },
      });

      if (!menu || menu.tenantId !== tenantId) {
        return reply.code(404).send({
          success: false,
          error: 'RES-001',
          message: 'Menu tidak ditemukan.',
        });
      }

      const currentVersion = menu.recipes[0]?.version || 1;
      const nextVersion = currentVersion + 1;

      // Create snapshot
      const snapshot = createRecipeSnapshot({
        tenantId,
        menuId,
        menuName: menu.name,
        version: nextVersion,
        components: body.components || [],
      });

      // Update or create recipe
      const recipe = await prisma.recipe.create({
        data: {
          tenantId,
          menuId,
          version: nextVersion,
          effectiveFrom: new Date(),
        },
      });

      if (body.components && body.components.length > 0) {
        const itemIds = body.components.map((c) => c.itemId);
        const existingItems = await prisma.item.findMany({
          where: { id: { in: itemIds }, tenantId },
          select: { id: true, unitId: true },
        });
        const itemMap = new Map(existingItems.map((it) => [it.id, it.unitId]));

        const detailsData = body.components
          .filter((c) => itemMap.has(c.itemId))
          .map((c) => ({
            tenantId,
            recipeId: recipe.id,
            itemId: c.itemId,
            unitId: itemMap.get(c.itemId)!,
            quantity: Number(c.quantity),
          }));

        if (detailsData.length > 0) {
          await prisma.recipeDetail.createMany({
            data: detailsData,
          });
        }
      }

      return reply.code(200).send({
        success: true,
        data: {
          menuId,
          recipeId: recipe.id,
          version: nextVersion,
          recipeHash: snapshot.recipeHash,
          snapshotJson: snapshot.snapshotJson,
        },
      });
    }
  );
};
