import { expect } from 'chai'
import { datesForWeekday, occurrenceAt, plannedMinutes } from '../src/lib/timetable.js'

describe('timetable calculations', () => {
  it('calculates planned minutes for a valid lesson', () => {
    expect(plannedMinutes('08:00:00', '10:00:00')).to.equal(120)
  })

  it('rejects an end time before the start time', () => {
    expect(() => plannedMinutes('10:00:00', '08:00:00')).to.throw('end_time must be later than start_time')
  })

  it('generates Monday-first weekly dates', () => {
    expect(datesForWeekday('2026-09-07', '2026-09-20', 1)).to.deep.equal(['2026-09-07', '2026-09-14'])
    expect(datesForWeekday('2026-09-07', '2026-09-20', 7)).to.deep.equal(['2026-09-13', '2026-09-20'])
  })

  it('constructs UTC occurrence bounds from a school date and local times', () => {
    expect(occurrenceAt('2026-09-07', '08:00:00', '10:00:00')).to.deep.equal({
      start_at: '2026-09-07T08:00:00.000Z',
      end_at: '2026-09-07T10:00:00.000Z',
    })
  })
})
