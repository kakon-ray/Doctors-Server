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
      const qury = {};
      const cursor = servicesCollection.find(qury);
      const result = await cursor.toArray();
      res.send(result);
    });
  } catch {}
}

run();
