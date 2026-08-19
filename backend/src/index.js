import app from './app.js'
import { startDailyTimetableMaintenance } from './lib/timetable.js'

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`SMS backend listening on port ${port}`)
  startDailyTimetableMaintenance()
})
