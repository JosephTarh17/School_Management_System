import { expect } from 'chai'
import { ApiError, ENUMS, asDate, asEnum, asNumber, asUuid, asText, asXafAmount } from '../src/lib/api.js'

describe('API validation helpers', () => {
  it('accepts valid UUIDs and rejects malformed UUIDs', () => {
    expect(asUuid('123e4567-e89b-12d3-a456-426614174000', 'id')).to.equal('123e4567-e89b-12d3-a456-426614174000')
    expect(() => asUuid('not-a-uuid', 'id')).to.throw(ApiError, 'id must be a valid UUID')
  })

  it('validates calendar dates and enum values', () => {
    expect(asDate('2026-08-13', 'date')).to.equal('2026-08-13')
    expect(() => asDate('2026-02-30', 'date')).to.throw(ApiError)
    expect(asEnum('Present', 'status', ENUMS.attendanceStatus)).to.equal('Present')
    expect(() => asEnum('Unknown', 'status', ENUMS.attendanceStatus)).to.throw(ApiError)
  })

  it('validates bounded numbers and text', () => {
    expect(asNumber('12.5', 'amount', { min: 0, max: 20 })).to.equal(12.5)
    expect(() => asNumber(-1, 'amount', { min: 0 })).to.throw(ApiError)
    expect(asText('  Course  ', 'name')).to.equal('Course')
    expect(() => asText('', 'name')).to.throw(ApiError)
  })

  it('accepts whole-number XAF amounts and rejects fractions or invalid signs', () => {
    expect(asXafAmount('75000', 'payment', { positive: true })).to.equal(75000)
    expect(asXafAmount(0, 'balance')).to.equal(0)
    expect(() => asXafAmount('75000.50', 'payment', { positive: true })).to.throw(ApiError, 'payment must be a valid integer')
    expect(() => asXafAmount(0, 'payment', { positive: true })).to.throw(ApiError, 'payment must be at least 1')
    expect(() => asXafAmount(-1, 'balance')).to.throw(ApiError)
  })
})
