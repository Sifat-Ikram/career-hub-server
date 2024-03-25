const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 4321;
const jwt = require("jsonwebtoken");

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://career-hub-web.web.app"],
    credentials: true,
  })
);
app.use(express.json());

const verifyToken = (req, res, next) => {
  // console.log("inside middleware", req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Access forbidden" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.SECRET_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Access forbidden" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jrqljyn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobCollection = client.db("careerHub").collection("jobs");
    const categoryCollection = client.db("careerHub").collection("category");

    // job api
    app.get("/job", async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    });

    app.post("/job", async (req, res) => {
      const jobItem = req.body;
      const result = await jobCollection.insertOne(jobItem);
      res.send(result);
    });

    // category api
    app.get("/category", async (req, res) => {
        const result = await categoryCollection.find().toArray();
        res.send(result);
      });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("career hub is running");
});

app.listen(port, () => {
  console.log(`career hub server is running through port ${port}`);
});
