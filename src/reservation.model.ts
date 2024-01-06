import mongoose, { Document } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

interface TransportReservationModel extends Document {
  userId: string;
  transportId: string;
  nbPerson: number;
  date: number;
  luggage: number;
  status: string;
}

const transportReservationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  transportId: { type: String, required: true },
  nbPerson: { type: Number, required: true },
  date: { type: Number, required: true },
  luggage: { type: Number, required: true },
  status: { type: String, required: true },
});

transportReservationSchema.plugin(mongoosePaginate);

const TransportReservation = mongoose.model<TransportReservationModel>(
  "TransportReservation",
  transportReservationSchema
);

export default TransportReservation;
