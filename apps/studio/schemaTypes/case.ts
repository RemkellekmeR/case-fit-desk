import {defineField, defineType} from 'sanity'

export const caseType = defineType({
  name: 'case',
  title: 'Eurorack Case',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'manufacturer', title: 'Manufacturer', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'name'}, validation: (r) => r.required()}),
    defineField({
      name: 'usableHp',
      title: 'Usable HP',
      type: 'number',
      description: 'Total horizontal pitch available across all rows that share this budget, or primary row.',
      validation: (r) => r.required().integer().positive(),
    }),
    defineField({
      name: 'rows',
      title: 'Rows',
      type: 'number',
      description: 'Number of row / rail pairs.',
      validation: (r) => r.integer().positive(),
    }),
    defineField({
      name: 'railClearanceMm',
      title: 'Rail clearance / max module depth (mm)',
      type: 'number',
      description: 'Maximum module depth that clears rails/PSU after mounting.',
      validation: (r) => r.required().positive(),
    }),
    defineField({
      name: 'powerBudgetMa',
      title: 'Power budget (mA)',
      type: 'object',
      fields: [
        defineField({name: 'plus12', title: '+12V mA available', type: 'number', validation: (r) => r.min(0)}),
        defineField({name: 'plus5', title: '+5V mA available', type: 'number', validation: (r) => r.min(0)}),
        defineField({name: 'minus12', title: '-12V mA available', type: 'number', validation: (r) => r.min(0)}),
      ],
      validation: (r) => r.required(),
    }),
    defineField({name: 'formFactor', title: 'Form factor notes', type: 'string'}),
    defineField({name: 'notes', title: 'Notes', type: 'text'}),
  ],
  preview: {
    select: {title: 'name', hp: 'usableHp', depth: 'railClearanceMm'},
    prepare({title, hp, depth}) {
      return {title, subtitle: `${hp ?? '?'} HP · max depth ${depth ?? '?'} mm`}
    },
  },
})
