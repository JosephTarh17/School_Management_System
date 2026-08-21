import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const migration = fs.readFileSync(path.join(root, 'backend/db/migrations/031_atomic_role_account_creation.sql'), 'utf8')
const usersRoute = fs.readFileSync(path.join(root, 'backend/src/routes/users.js'), 'utf8')
const api = fs.readFileSync(path.join(root, 'frontend/src/api.js'), 'utf8')
const accountPage = fs.readFileSync(path.join(root, 'frontend/src/pages/AccountManagement.vue'), 'utf8')
const conception = fs.readFileSync(path.join(root, 'docs/Account Creation Conception.md'), 'utf8')

const checks = [
  ['migration creates the role-profile function', migration.includes('CREATE OR REPLACE FUNCTION create_role_account_with_profile')],
  ['migration restricts supported roles', migration.includes("p_role NOT IN ('student', 'guardian', 'administrator')")],
  ['migration creates first-login password change', migration.includes('must_change_password)') && migration.includes('true)')],
  ['migration creates all three linked profiles', ['INSERT INTO student', 'INSERT INTO guardian', 'INSERT INTO administrator'].every((value) => migration.includes(value))],
  ['migration is service-role only', migration.includes('REVOKE ALL ON FUNCTION') && migration.includes('GRANT EXECUTE ON FUNCTION')],
  ['backend endpoint is administrator-only', usersRoute.includes("router.post('/register-with-profile', requireRole('administrator')")],
  ['backend generates temporary password', usersRoute.includes('const temporaryPassword = generateTemporaryPassword()')],
  ['backend calls atomic function', usersRoute.includes("supabase.rpc('create_role_account_with_profile'")],
  ['backend audits creation without password metadata', usersRoute.includes("action: 'POST /users/register-with-profile'") && usersRoute.includes('created_role: role')],
  ['frontend calls the new endpoint', api.includes("requestJson('/users/register-with-profile'")],
  ['frontend exposes all supported account types', ['value="student"', 'value="guardian"', 'value="administrator"'].every((value) => accountPage.includes(value))],
  ['frontend keeps teacher creation in Staff Management', accountPage.includes('Teacher accounts remain under Staff Management')],
  ['conception records atomicity and credential rules', conception.includes('atomic') && conception.includes('temporary password')],
  ['no credential-shaped literals were added', ![migration, usersRoute, api, accountPage].join('\n').match(/password\d{2,}|[A-Za-z0-9._%+-]+@example\.com|service_role_key/i)],
]

const failed = checks.filter(([, passed]) => !passed)
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'}  ${label}`)
if (failed.length) process.exit(1)
console.log(`ACCOUNT_CREATION_STATIC_VALIDATION_PASS (${checks.length} checks)`)
