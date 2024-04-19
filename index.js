const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const port = process.env.POST || 4321;

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://career-hub-web.web.app",
      "https://career-hub-web.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());

// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
//   res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   next();
// });

// multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    // await client.connect();

    const jobCollection = client.db("careerHub").collection("jobs");
    const categoryCollection = client.db("careerHub").collection("category");
    const userCollection = client.db("careerHub").collection("user");
    const cartCollection = client.db("careerHub").collection("cart");
    const resumeCollection = client.db("careerHub").collection("resume");
    const categoriesCollection = client
      .db("careerHub")
      .collection("categories");
    const reviewCollection = client.db("careerHub").collection("review");
    const shortlistCollection = client.db("careerHub").collection("shortlist");

    // middleware again
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Access forbidden" });
      }
      next();
    };

    // jwt api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = await jwt.sign(user, process.env.SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // user api
    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/user", async (req, res) => {
      const email = req.query.email;
      let query = {};

      if (email) {
        query.email = email;
      }
      const user = await userCollection.findOne(query);
      let employer = false;
      if (user) {
        employer = user?.role === "employer";
      }
      res.send({ employer });
    });

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Access Unauthorized" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.patch("/user/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/user/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          displayName: item.displayName,
          email: item.email,
          photoUrl: photoUrl,
          phoneNumber: item.phoneNumber,
          location: item.location,
          facebook: item.facebook,
          linkedin: item.linkedin,
          professionalSummary: item.professionalSummary,
          role: item.role,
        },
      };

      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.delete("/user/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/favicon.ico", (req, res) => {
      res.status(204); // No Content
    });

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

    // resume api
    app.post("/resume", upload.single("pdf"), async (req, res) => {
      try {
        const { email } = req.body; // Extract email from request body
        const pdfData = req.file.buffer;

        // Insert email and pdfData into MongoDB
        const result = await resumeCollection.insertOne({
          email,
          pdf: pdfData,
        });

        res.status(201).json({
          message: "Resume uploaded successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error uploading resume:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    app.get("/resume", async (req, res) => {
      try {
        const email = req.query.email;

        // Find all resume documents by email
        const resumes = await resumeCollection.find({ email }).toArray();

        // Check if any resumes exist for the given email
        if (!resumes || resumes.length === 0) {
          return res
            .status(404)
            .json({ error: "No resumes found for this email" });
        }

        // Send all resume files as a response
        const resumeData = resumes.map((resume) => resume.pdf);
        res.setHeader("Content-Type", "application/pdf");
        res.send(resumeData);
      } catch (error) {
        console.error("Error retrieving resumes:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    app.delete("/resume/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // Delete the resume document by its ID
        const result = await resumeCollection.deleteOne({ _id: ObjectId(id) });

        // Check if any resume was deleted
        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Resume not found" });
        }

        res.status(200).json({ message: "Resume deleted successfully" });
      } catch (error) {
        console.error("Error deleting resume:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // cart api
    app.post("/cart", async (req, res) => {
      const bookingItem = req.body;
      const result = await cartCollection.insertOne(bookingItem);
      res.send(result);
    });

    app.get("/cart", async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const admin = req.query.admin;
      let query = {};

      if (email) {
        query.email = email;
      }
      if (admin) {
        query.admin = admin;
      }

      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // category api
    app.get("/category", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    // categories api
    app.get("/categories", async (req, res) => {
      const result = await categoriesCollection.find().toArray();
      res.send(result);
    });

    // review api
    app.post("/review", async (req, res) => {
      const reviewItem = req.body;
      const result = await reviewCollection.insertOne(reviewItem);
      res.send(result);
    });

    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // shortlist api
    app.post("/shortlist", async (req, res) => {
      const shortlistItem = req.body;
      const result = await shortlistCollection.insertOne(shortlistItem);
      res.send(result);
    });

    app.get("/shortlist", async (req, res) => {
      const result = await shortlistCollection.find().toArray();
      res.send(result);
    });

    app.delete("/shortlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await shortlistCollection.deleteOne(query);
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
  res.send("career hub is recruiting");
});

app.listen(port, () => {
  console.log(`career hub server is recruiting through port ${port}`);
});
