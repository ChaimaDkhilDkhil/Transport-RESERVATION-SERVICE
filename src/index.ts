import express, { Request, Response } from "express";
import mongoose from "mongoose";
import TransportReservation from "./reservation.model"; // Assuming reservation.model exports the model
import bodyParser from "body-parser";

const nodemailer = require('nodemailer');
const cors = require('cors');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const memoryStore = new session.MemoryStore();

const kcConfig = {
  clientId: 'flyware-client',
  bearerOnly: true,
  serverUrl: 'http://localhost:8080',
  realm: 'Flyware-Realm',
  publicClient: true
};

const keycloak = new Keycloak({ store: memoryStore }, kcConfig);
const app = express();
app.use(cors());
app.use(session({
  secret: 'my-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
}));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: 'teamflyware@gmail.com',
      pass: 'otac ngky ijkj cpcn'
  }
});

app.use(keycloak.middleware()); 

const PORT = process.env.PORT || 3005;

const eurekaHelper = require('./eureka-helper');
eurekaHelper.registerWithEureka('transport-reservation-server', PORT);

app.use(bodyParser.json());

const uri = "mongodb://127.0.0.1:27017/Flyware";
mongoose.connect(uri, (err) => {
  if (err) console.log(err);
  else console.log("Mongo Database connected successfully");
});

app.post('/reserve', async (req: Request, res: Response) => {
  try {
    const { userId, transportId, nbPerson, date, luggage } = req.body;

    const newTransportBooking = new TransportReservation({
      userId,
      transportId,
      nbPerson,
      date,
      luggage,
      status: "en attente"
    });

    const existingReservation = await TransportReservation.findOne({ userId: userId, transportId: transportId });

    if (existingReservation) {
      res.status(400).json('L\'utilisateur a déjà réservé ce vol.');
    } else {
      newTransportBooking.save((err, savedTransportBooking) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement de la réservation.' });
        }
        res.status(201).json(savedTransportBooking);
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error reserving transport', error: error });
  }
});

app.put('/setStatus/:id', async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id;
    const existingBooking = await TransportReservation.findById(bookingId).exec();

    if (!existingBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const { status } = req.body;
    const updatedBooking = await TransportReservation.findByIdAndUpdate(bookingId, { status: status }, { new: true });

    res.status(201).json({ message: 'Booking status updated successfully', updatedBooking });

    const userId = (updatedBooking as { userId?: string }).userId;
    const transportId = (updatedBooking as { transportId?: string }).transportId;

    if (status === "accepted") {
      socket.emit('notification', { userId, message: 'Your transport booking request number ' + transportId + ' is accepted.' });
    } else if (status === "refused") {
      socket.emit('notification', { userId, message: 'Your transport booking request number ' + transportId + ' is refused.' });
    } else if (status === "soldout") {
      socket.emit('notification', { userId, message: 'The transport number ' + transportId + ' is sold out.' });
    } else {
      socket.emit('notification', { userId, message: 'Your transport booking request number ' + transportId + ' is expired.' });
    }

  } catch (error) {
    res.status(500).json({ message: 'Error updating booking status', error: error });
  }
});

// ... (remaining routes)

app.get("/", (req: Request, resp: Response) => {
  resp.send("Reservation-Transport-Server");
});

const server = app.listen(PORT, () => {
  console.log("Transport-reservation-server on 3005");
});

const socket = require('socket.io')(server);

socket.on('connection', () => {
  console.log('Socket: client connected');
});
