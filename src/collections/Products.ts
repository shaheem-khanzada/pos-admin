import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'price',
      type: 'number',
      required: true,
    },
    {
      name: 'description',
      type: 'text',
      required: true,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'size',
      type: 'select',
      options: ['small', 'medium', 'large'],
    },
    {
      name: 'cogs',
      type: 'number',
    },
    {
      name: 'category',
      type: 'select',
      options: ['food', 'drink', 'clothes', 'makeup', 'other'],
    },
    {
      name: 'stock',
      type: 'number',
      required: true,
    },
  ],
}
