const express = require('express');
const http = require('http');
const connectDB = require('./db');
const cors = require('cors');
const setupSocket = require("./sockets/chatSocket");
const cookieParser = require("cookie-parser");
require('dotenv').config();

// Connect to database before initializing app
connectDB().then(() => {
  console.log("Database connected successfully");
}).catch(err => {
  console.error("Database connection error:", err);
  process.exit(1); 
});

const app = express();
const server = http.createServer(app);
const io = setupSocket(server); 

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL, 
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
};
console.log(process.env.FRONTEND_URL)

// Storing io instances
app.set("io", io);
app.set("users", io.users); 

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); 
app.use(cookieParser());

// Add basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Routes
app.use("/", require("./routes/refreshToken"));
app.use("/", require("./routes/publicRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/chats", require("./routes/chatsRoute"));
app.use("/profile", require("./routes/profileRoutes"));


// Default route
app.get('/', (req, res) => {
  res.status(200).send("API is running");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

