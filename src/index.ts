import express, { Request, Response } from "express";
import mongoose from "mongoose";
import TransportReservation from "./reservation.model"; 
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
    const { userId, transportId, nbPerson, date, luggage,duration } = req.body;

    const newTransportBooking = new TransportReservation({
      userId,
      transportId,
      nbPerson,
      date,
      luggage,
      duration,
      status: "en attente"
    });

    const existingReservation = await TransportReservation.findOne({ userId: userId, transportId: transportId });

    if (existingReservation) {
      res.status(400).json('L\'utilisateur a déjà réservé ce transport.');
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

app.delete('/cancelBooking/:id', async (req:any, res:any) => {
  try {
    const transportReservation = await TransportReservation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking deleted successfully', data: transportReservation });
} catch (error) {
    res.status(500).json({ message: 'Error deleting booking' });
}
});


app.delete('/deleteByTransportId/:id', async (req: any, res: any) => {
  try {

    const result = await TransportReservation.deleteMany({ transportId: req.params.id });

    res.json({ message: 'Bookings deleted successfully', data: result });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting bookings' });
  }
});

app.put('/updateBooking', async (req:any, res:any) => {
  try {
    
    const transportReservation = await TransportReservation.findByIdAndUpdate(req.body._id, req.body, { new: true });
    res.json({ message: 'Booking updated successfully', data: transportReservation });
} catch (error) {
    res.status(500).json({ message: 'Error updating Booking'});
}
});


app.get('/UserTransportBookings', keycloak.protect('realm:client'), async (req, res) => {

  const id = req.query.id as string;

  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.size as string) || 10;

  try {
    const transportReservation = await TransportReservation.paginate(
      { userId: id },
      { page: page, limit: pageSize }
    );

    res.send(transportReservation);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transport Reservation', error: error });
  }
});
app.get('/transportBookings', keycloak.protect('realm:admin'), async (req:any, res:any) => {
  
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.size as string) || 10;

  try {
    const transportReservation = await TransportReservation.paginate(
      { status:"en attente"},
      { page: page, limit: pageSize }
    );

    res.send(transportReservation);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transport Reservation', error: error });
  }});

app.get('/transportBookings/:id', async (req:any, res:any) => {
  try {
    const transportReservation = await TransportReservation.find({_id:req.params.id}).exec();
    res.json(transportReservation);
} catch (error) {
    res.status(500).json({ message: 'Error fetching transport Reservation' });
}
});


app.post('/send-email', (req:any, res:any) => {
  try {
      const { transport,transportBooking,user } = req.body;

      const mailOptions = {
          from: 'teamflyware@gmail.com',
          to: [user.email],
          subject: "FlyWare Transport Reservation",
          html: `
          <h3 style="font-size: 17px;">Hi ${user.username},</h3>
          <p style="font-size: 14px;">Thank you for your booking. We're pleased to tell you that your reservation at FlyWare agency has been received and confirmed.</p>
      
          <h3 style="font-size: 17px;">Transport details</h3>
          <ul style="font-size: 14px;">
            <li>Transport matricule: ${transport._id}</li>
            <li>Mark : ${transport.mark}</li>
            <li>Adress :${transport.location}</li>
            <li>Price: ${transport.price} $</li> 
            <li>max seats: ${transport.nbPerson}</li>
            <li>max luggage: ${transport.nbLuggage}</li>         
         
            </ul>
      
          <h3 style="font-size: 17px;">Reservation details</h3>
          <ul style="font-size: 14px;">
            <li>Reservation number: ${transportBooking._id}</li>
            <li>Date :  ${new Date(transportBooking.date).toISOString().split('T')[0]}</li>
            <li>Duration: ${transportBooking.duration}</li>
            <li>Class: ${transportBooking.type}</li>
          </ul>
      
          <p style="font-size: 14px;">Please contact us if you have any questions about your booking.</p>
          <p style="font-size: 14px;">We're looking forward to seeing you!</p>
      
          <p style="font-size: 14px;">FlyWare Team</p>
          <p style="font-size: 14px;">+216 55 666 777</p>
          <p style="font-size: 14px;">teamflyware@gmail.com</p>

        `
        };
      transporter.sendMail(mailOptions, (error:any, info:any) => {
          if (error) {
              console.log(error);
              res.status(500).json({ message: 'Error sending email' });
          } else {
              console.log('Email sent:', info.response);
              res.json({ message: 'Email sent successfully' });
          }
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});
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
