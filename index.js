const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
const ObjectId = require("mongodb").ObjectId;

// username: doctorsadmin
// password: bB2ZSGRjGNoTmzV1

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Running ginius server");
});

// db users
app.listen(port, () => {
  console.log(`CROUD server is Running ${port}`);
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.BD_PASS}@cluster0.enqc8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const appointmentCollection = client
      .db("doctorPortal")
      .collection("appointmentCollection");
    const servicesCollection = client.db("doctorPortal").collection("services");

    // add api . add appointed qury
    app.post("/appointment", async (req, res) => {
      const appointment = req.body;
      // console.log(appointment);
      const query = {
        tretmentName: appointment.tretmentName,
        data: appointment.data,
        name: appointment.name,
      };

      const exist = await appointmentCollection.findOne(query);

      if (exist) {
        return res.send({ success: false, appointment: exist });
      }

      const result = await appointmentCollection.insertOne(appointment);
      return res.send({ success: true, result });
    });

    // get api all services
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/abailable", async (req, res) => {
      const date = req.query.data || "May 15, 2022";
      const services = await servicesCollection.find().toArray();
      const query = { date: date };
      const booking = await appointmentCollection.find(query).toArray();

      services.forEach((service) => {
        const serviceBooking = booking.filter(
          (b) => b.tretmentName === service.name
        );
        const booked = serviceBooking.map((item) => item.slot);
        const abailable = service.slots.filter(
          (item) => !booked.includes(item)
        );
        service.abailable = abailable;
      });
      res.send(services);
    });
  } catch {}
}

run();
