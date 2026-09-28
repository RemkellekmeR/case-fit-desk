import {defineArrayMember, defineField, defineType} from 'sanity'

export const moduleType = defineType({
  name: 'module',
  title: 'Eurorack Module',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'manufacturer', title: 'Manufacturer', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'name'}, validation: (r) => r.required()}),
    defineField({
      name: 'hp',
      title: 'Width (HP)',
      type: 'number',
      description: 'Horizontal pitch units. Never invent — leave empty if unknown.',
      validation: (r) => r.required().integer().positive(),
    }),
    defineField({
      name: 'depthMm',
      title: 'Depth (mm)',
      type: 'number',
      description: 'Module depth behind the panel, excluding jacks that stick out front.',
      validation: (r) => r.required().positive(),
    }),
    defineField({
      name: 'powerMa',
      title: 'Power draw (mA)',
      type: 'object',
      fields: [
        defineField({name: 'plus12', title: '+12V mA', type: 'number', validation: (r) => r.min(0)}),
        defineField({name: 'plus5', title: '+5V mA', type: 'number', validation: (r) => r.min(0)}),
        defineField({name: 'minus12', title: '-12V mA', type: 'number', validation: (r) => r.min(0)}),
      ],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'incompatibleWith',
      title: 'Known incompatible neighbors',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'module'}]})],
      description: 'Modules that physically or electrically conflict when placed adjacent.',
    }),
    defineField({name: 'notes', title: 'Notes', type: 'text'}),
    defineField({
      name: 'sources',
      title: 'Citation sources',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'label', type: 'string', title: 'Label'}),
            defineField({name: 'url', type: 'url', title: 'URL'}),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'manufacturer', hp: 'hp'},
    prepare({title, subtitle, hp}) {
      return {title, subtitle: `${subtitle ?? ''} · ${hp ?? '?'} HP`}
    },
  },
})
