import {defineField, defineType} from 'sanity'

export const incompatibilityType = defineType({
  name: 'incompatibility',
  title: 'Incompatibility Rule',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'modules',
      title: 'Modules involved',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'module'}]}],
      validation: (r) => r.min(2),
    }),
    defineField({
      name: 'severity',
      title: 'Severity',
      type: 'string',
      options: {list: ['hard', 'soft', 'advisory']},
      initialValue: 'hard',
    }),
    defineField({
      name: 'reason',
      title: 'Reason',
      type: 'text',
      validation: (r) => r.required(),
    }),
    defineField({name: 'sourceNote', title: 'Source / citation note', type: 'string'}),
  ],
})
