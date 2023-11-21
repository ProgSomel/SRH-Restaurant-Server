const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

const secret = process.env.JWT_SECRET || "defaultSecret";

//! middlewires
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dzik2b9.mongodb.net/?retryWrites=true&w=majority`;

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
    // Send a ping to confirm a successful connection

    const usersCollection = client.db("SRHRestaurant").collection("users");

    const foodsCollection = client.db("SRHRestaurant").collection("foods");

    const ordersCollection = client.db("SRHRestaurant").collection("orders");

    //! Auth
    app.post("/api/v1/create-token", async (req, res) => {
      const user = req.body;
      console.log(user.email);
      const token = jwt.sign(user, secret, { expiresIn: 60 * 60 });
      console.log(token);
      res
        .cookie("token", token, {
          httpOnly: true,
          // secure: false,
          // sameSite: 'none',
        })
        .send({ success: true });
    });

    //! Users
    app.post("/api/v1/users", async (req, res) => {
      const user = req.body.user;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //! Foods
    app.get("/api/v1/all-foods-items", async (req, res) => {
      let query = {};
      const page = Number(req.query.page);
      const limit = Number(req.query.limit);
      const skip = (page - 1) * limit;

      const foodName = req.query.foodName;
      if (foodName) {
        query.name = { $regex: new RegExp(foodName, "i") };
      }

      const cursor = foodsCollection.find(query).skip(skip).limit(limit);

      const result = await cursor.toArray();
      const total = await foodsCollection.countDocuments();
      console.log(total);
      res.send({ total, result });
    });

    app.get("/api/v1/all-foods-items/:foodId", async (req, res) => {
      const id = req.params.foodId;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });

    //! Orders
    app.post("/api/v1/create-order", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    app.get("/api/v1/orders", async (req, res) => {
      
     
     
      const cursor = ordersCollection.find();
      const result = await cursor.toArray();
      
      res.send(result);
    });

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
  res.send("SRH Restaurant is Running");
});

app.listen(port, (req, res) => {
  console.log(`SRH Restaurant is running on port ${port}`);
});
