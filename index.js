import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cloudinary from 'cloudinary';
import { dbConnect } from './db/dbConnect.js';
import authRouter from './routes/authRoute.js';
import userRouter from './routes/userRoute.js';
import contestRouter from './routes/contestRoute.js';
import { authenticateToken } from './utils/commonFunc.js';

// env vars
const PORT = process.env.PORT;
const CLOUD_NAME = process.env.CLOUD_NAME;
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const corsOptions = {
  origin: ALLOWED_ORIGIN, // specify the allowed origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // specify the allowed HTTP methods
  credentials: true, // allow cookies and credentials
  optionsSuccessStatus: 204, // handle preflight requests properly
};

// initialization
dotenv.config();
const app = express();
dbConnect();

app.use(cors(corsOptions));

// cloudinary middleware
cloudinary.v2.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

app.use(express.json()); // like a body parser

app.use('/api/auth', authRouter);
// app.use('/api/user', authenticateToken, userRouter);
app.use('/api/user', userRouter);
app.use('/api/contest', contestRouter);
// make separate routes for admin

app.listen(PORT, (req, res) => {
  console.log(`Server listening at port ${PORT}`);
});
