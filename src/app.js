import dotenv from 'dotenv'
dotenv.config({ path: `.env.${process.env.NODE_ENV.trim() || 'dev'}` })

import logger from './helpers/logger.js';
// logger.info({ path: `.env.${process.env.NODE_ENV.trim() || 'dev'}` })

import db, { User } from './models';

import express from 'express';
import Boom from 'boom';
import cors from 'cors';
import limiter from './rate-limiter';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 8080;

const whiteList = ['localhost:3000', '127.0.0.1:3000', '172.17.160.1:3000', '192.168.1.254:8080']
// if (process.env.NODE_ENV.trim() == 'dev') {
//   whiteList.push('chrome-extension://coohjcphdfgbiolnekdpbcijmhambjff');
// }

const corsOptions = {
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  origin: (origin, callback) => {
    // console.log(origin)
    if (whiteList.indexOf(origin?.replace(/^https?:\/\//, '')) !== -1 || !origin) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  optionsSuccessStatus: 200,
  credentials: true
}

// reflect (enable) the requested origin in the CORS response or disable CORS for this request
// const corsOptions = (req, callback) => callback(null, { origin: whiteList.indexOf(req.header('Origin')) !== -1 });
app.use(cors(corsOptions))

app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routes);

app.use((req, res, next) => {
  return next(Boom.notFound('This route does not exist.'));
});

app.use((err, req, res, next) => {
  logger.error(err)
  if (err) {
    if (err.output) {
      return res.status(err.output.statusCode || 500).json(err.output.payload);
    }

    return res.status(500).json(err);
  }
});

; (async () => {
  try {
    await db.connected()
    await User.sync()

    app.listen(PORT, () => console.log(`${PORT} Server is up!`))
  } catch (error) {
    console.error(error)
  }
})();