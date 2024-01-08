"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const mongoose_paginate_1 = __importDefault(require("mongoose-paginate"));
const transportReservationSchema = new mongoose_1.default.Schema({
    userId: { type: String, required: true },
    transportId: { type: String, required: true },
    nbPerson: { type: Number, required: true },
    date: { type: Date, required: true },
    luggage: { type: Number, required: true },
    duration: { type: Number, required: true },
    status: { type: String, required: true },
});
transportReservationSchema.plugin(mongoose_paginate_1.default);
const TransportReservation = mongoose_1.default.model("TransportReservation", transportReservationSchema);
exports.default = TransportReservation;
