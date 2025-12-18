import { Hono } from 'hono'
import brightRoute from './routes/bright.route'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/', brightRoute)

const port = 5000

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 60,
}
