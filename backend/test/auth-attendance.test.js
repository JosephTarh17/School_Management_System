import request from 'supertest'
import { expect } from 'chai'
import app from '../src/app.js'

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'teacher1@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'password123'

describe('Backend API', () => {
  let token

  it('should return health status', async () => {
    const res = await request(app).get('/health')
    expect(res.status).to.equal(200)
    expect(res.body).to.have.property('status', 'ok')
  }).timeout(5000)

  it('should reject login without credentials', async () => {
    const res = await request(app).post('/auth/login').send({})
    expect(res.status).to.equal(400)
    expect(res.body).to.have.property('error')
  })

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })

    expect(res.status).to.equal(200)
    expect(res.body).to.have.property('token')
    token = res.body.token
  }).timeout(10000)

  it('should fail to access attendance without token', async () => {
    const res = await request(app).get('/attendance')
    expect(res.status).to.equal(401)
    expect(res.body).to.have.property('error')
  })

  it('should access attendance with valid token', async () => {
    const res = await request(app)
      .get('/attendance')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).to.equal(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.be.an('array')
  }).timeout(10000)
})
