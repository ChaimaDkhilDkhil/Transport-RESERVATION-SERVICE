"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const reservation_model_1 = __importDefault(require("./reservation.model")); // Assuming reservation.model exports the model
const body_parser_1 = __importDefault(require("body-parser"));
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
const app = (0, express_1.default)();
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
app.use(body_parser_1.default.json());
const uri = "mongodb://127.0.0.1:27017/Flyware";
mongoose_1.default.connect(uri, (err) => {
    if (err)
        console.log(err);
    else
        console.log("Mongo Database connected successfully");
});
app.post('/reserve', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, transportId, nbPerson, date, luggage } = req.body;
        const newTransportBooking = new reservation_model_1.default({
            userId,
            transportId,
            nbPerson,
            date,
            luggage,
            status: "en attente"
        });
        const existingReservation = yield reservation_model_1.default.findOne({ userId: userId, transportId: transportId });
        if (existingReservation) {
            res.status(400).json('L\'utilisateur a déjà réservé ce vol.');
        }
        else {
            newTransportBooking.save((err, savedTransportBooking) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement de la réservation.' });
                }
                res.status(201).json(savedTransportBooking);
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Error reserving transport', error: error });
    }
}));
app.put('/setStatus/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bookingId = req.params.id;
        const existingBooking = yield reservation_model_1.default.findById(bookingId).exec();
        if (!existingBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        const { status } = req.body;
        const updatedBooking = yield reservation_model_1.default.findByIdAndUpdate(bookingId, { status: status }, { new: true });
        res.status(201).json({ message: 'Booking status updated successfully', updatedBooking });
        const userId = updatedBooking.userId;
        const transportId = updatedBooking.transportId;
        if (status === "accepted") {
            socket.emit('notification', { userId, message: 'Your transport booking request number ' + transportId + ' is accepted.' });
        }
        else if (status === "refused") {
            socket.emit('notification', { userId, message: 'Your transport booking request number ' + transportId + ' is refused.' });
        }
        else if (status === "soldout") {
            socket.emit('notification', { userId, message: 'The transport number ' + transportId + ' is sold out.' });
        }
        else {
            socket.emit('notification', { userId, message: 'Your transport booking request number ' + transportId + ' is expired.' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating booking status', error: error });
    }
}));
// ... (remaining routes)
app.get("/", (req, resp) => {
    resp.send("Reservation-Transport-Server");
});
const server = app.listen(PORT, () => {
    console.log("Transport-reservation-server on 3005");
});
const socket = require('socket.io')(server);
socket.on('connection', () => {
    console.log('Socket: client connected');
});
