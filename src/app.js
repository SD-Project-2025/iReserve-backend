const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const morgan = require("morgan")
const compression = require("compression")
const rateLimit = require("express-rate-limit")
const swaggerUi = require("swagger-ui-express")
const errorHandler = require("./middleware/errorHandler")
const routes = require("./routes")
const swaggerSpec = require("./config/swagger")
//const logger = require("./utils/logger")

// Initialize express app
const app = express()
app.use(helmet())

app.use(cors())
app.use(express.json({ limit: "1024kb" }))
app.use(express.urlencoded({ extended: true, limit: "1024kb" }))
app.use(compression())

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
}
// Rate limiting - to prevent brute-force attacks and DDoS attacks
const limiter = rateLimit({
  max: 100,
  windowMs: 1 * 60 * 1000,
  message: "Too many requests from this IP, please try again after 1 minute",
})
app.use("/api", limiter)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use("/api/v1", routes)



app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})


app.use((req, res, next) => {
 
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl} on this server!`,
  })
})

app.use(errorHandler)

module.exports = app
