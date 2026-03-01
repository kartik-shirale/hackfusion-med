---
trigger: always_on
---

## Comments

- Keep short and clear
- Only use for Work In Progress: `// WIP: ...`

## Server Actions

`tsconst action = async (data: FormData) => {
  try {
    // logic
    return { success: true }
  } catch (error) {
    return { error: 'UNAUTHORIZED', status: 401 }
  }
}`

- Always arrow functions
- Always try/catch
- Return status codes (401, 403, etc.), not strings

## State Management

- **Zustand** for global/local state
- **Custom hooks** for complex component state

`ts// Instead of useState in component
const useComplexForm = () => { /* logic */ }`

## Forms (Structured)

`textcomponents/forms/[feature]/
├── [FormName].tsx
├── schema.ts (Zod schema)
└── use[FormName].ts (if complex)`

- Always **Zod** validation
- **Steepper** from shadcn for multi-step
- Use **new shadcn InputGroup** with icons

## Hooks Organization

`texthooks/forms/[feature]/[hook].ts
hooks/optimistic/useOptimistic.ts
hooks/auth/usePermissions.ts`

## Auth & Permissions

- Dynamic roles/actions in auth metadata
- Check permissions in:
    - UI (hide/show based on metadata)
    - Server actions (enforce authority)

## File Storage

`textProfiles/Avatars/Banners: PostgreSQL bytea
Attachments: Separate table + bytea (for now)`

## Prisma

- Use generated types from Prisma schema

Add to follow-up

## Documentation 
- https://ai-sdk.dev/docs/introduction   and always use the 
latest v6 version .

- https://elements.ai-sdk.dev/docs   use this elements for the ui of application. 
this will help you to build working fast. 