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

    app.post("/appointment", (req, res) => {
      const user = req.body;
      const result = appointmentCollection.insertOne(user);
      res.send(result);
    });
  } catch {}
}

run();
