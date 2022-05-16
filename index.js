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
  res.send("Running Doctor Portal server");
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
    const userCollection = client.db("doctorPortal").collection("user");

    // add api . add appointed qury
    app.post("/appointment", async (req, res) => {
      const appointment = req.body;
      // console.log(appointment);
      const query = {
        tretmentName: appointment.tretmentName,
        date: appointment.date,
        email: appointment.email,
      };

      const exist = await appointmentCollection.findOne(query);

      if (exist) {
        return res.send({ success: false, appointment: exist });
      }

      const result = await appointmentCollection.insertOne(appointment);
      return res.send({ success: true, result });
    });

    // create api in dashboart doctor appointment

    app.get("/myappointment", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const appointment = await appointmentCollection.find(query).toArray();
      res.send(appointment);
    });

    // user update api create

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      // upsert true dile social account diye login korrar somoy ekbar er besi email add hobe na
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = userCollection.updateOne(filter, updateDoc, options);

      res.send(result);
    });

    // get api all services
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // abailable slots in the appointment

    app.get("/abailable", async (req, res) => {
      const date = req.query.date;
      console.log(date);
      const services = await servicesCollection.find().toArray();
      const query = { date: date };
      const booking = await appointmentCollection.find(query).toArray();

      services.forEach((service) => {
        const serviceBooking = booking.filter(
          (b) => b.tretmentName == service.name
        );
        const booked = serviceBooking.map((item) => item.slots);
        const abailable = service.slots.filter(
          (item) => !booked.includes(item)
        );
        service.slots = abailable;
      });
      res.send(services);
    });
  } catch {}
}

run();
