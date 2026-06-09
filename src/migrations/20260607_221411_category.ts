import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  await payload.db.collections.products.collection.updateMany(
    { categories: { $exists: true } },
    [
      {
        $set: {
          category: {
            $cond: [
              { $isArray: '$categories' },
              { $arrayElemAt: ['$categories', 0] },
              '$categories',
            ],
          },
        },
      },
      { $unset: 'categories' },
    ],
    { session },
  )
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  await payload.db.collections.products.collection.updateMany(
    { category: { $exists: true } },
    [
      {
        $set: {
          categories: {
            $cond: [{ $isArray: '$category' }, '$category', ['$category']],
          },
        },
      },
      { $unset: 'category' },
    ],
    { session },
  )
}
