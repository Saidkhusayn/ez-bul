const express = require('express');
const http = require('http');
const connectDB = require('./db');
const cors = require('cors');
const setupSocket = require("./sockets/chatSocket");
const cookieParser = require("cookie-parser");
require('dotenv').config();

connectDB();

const app = express();
const server = http.createServer(app);
const io = setupSocket(server); 

const corsOptions = {
    origin: "http://localhost:5173", // Frontend URL
    credentials: true, // Allow cookies and authentication headers
  };

// Store io instance in the app (for use in routes)
app.set("io", io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/", require("./routes/refreshToken"));
app.use("/", require("./routes/publicRoutes"))
app.use("/chats", require("./routes/chatsRoute"));
app.use("/profile", require("./routes/profileRoutes"));

app.get('/', async (req, res) => {
 res.send("Hello World!")
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

