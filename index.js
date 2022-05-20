const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
const ObjectId = require("mongodb").ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const doctorCollection = client.db("doctorPortal").collection("doctor");

    // create verify admin middlewhite

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.roll == "admin") {
        next();
      } else {
        res.status(404).send({ message: "Forbedden Access" });
      }
    };

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

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { roll: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
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

    // get api all services only name
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query).project({ name: 1 });
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

    // get all doctor api

    app.get("/doctor", verifyJWT, verifyAdmin, async (req, res) => {
      const alldoctor = await doctorCollection.find().toArray();
      res.send(alldoctor);
    });

    // add doctor api
    app.post("/doctor", verifyJWT, verifyAdmin, async (req, res) => {
      const doctor = req.body;
      const result = await doctorCollection.insertOne(doctor);
      res.send(result);
    });

    // delete doctor api
    app.delete("/doctor/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await doctorCollection.deleteOne(query);
      res.send(result);
    });

    // ==================== Payment Method ==========================

    // get data specific id
    app.get("/appointment/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await appointmentCollection.findOne(query);
      res.send(result);
    });

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
  } catch {}
}

run();
