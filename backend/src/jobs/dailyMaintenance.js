import dotenv from 'dotenv'
import { runAccountLifecycleMaintenance } from '../lib/accountLifecycle.js'

dotenv.config()

try {
  const result = await runAccountLifecycleMaintenance()
  console.log(JSON.stringify({ job: 'daily-maintenance', status: 'completed', ...result }))
  process.exitCode = 0
} catch (error) {
  console.error('Daily maintenance job failed', error)
  process.exitCode = 1
}
