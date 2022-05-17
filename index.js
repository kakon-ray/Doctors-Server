const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
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
  console.log(`Doctor Portal server is Running ${port}`);
});

// Verify JWT Token

function verifyJWT(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    // console.log("decoded", decoded);
    req.decoded = decoded;
    next();
  });
}

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
    // nice ei appointment er abailable appointment api create kora ace
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

    app.get("/myappointment", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email === decodedEmail) {
        const query = { email: email };
        const appointment = await appointmentCollection.find(query).toArray();
        res.send(appointment);
      } else {
        res.status(404).send({ message: "Forbedden Access" });
      }
    });

    // user admin ache kina saita check korar api

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.roll == "admin";
      res.send({ admin: isAdmin });
    });

    // user ke admin korar api

    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.roll == "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { roll: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // save user info database and create jwt token and send jwt token client side

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      // upsert true dile social account diye login korrar somoy ekbar er besi email add hobe na
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);

      // send jwt token client side
      var token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10day",
      });
      res.send({ result, token });
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
      // console.log(date);
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

    // get all users api use admin

    app.get("/allusers", verifyJWT, async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
  } catch {}
}

run();
