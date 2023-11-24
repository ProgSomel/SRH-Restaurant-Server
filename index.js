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
app.use(express.json());
app.use(cookieParser());

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

    const reviewsCollection = client.db("SRHRestaurant").collection("reviews");

    //! verify token and GrantAccess
    const verifyToken = (req, res, next) => {
      const token = req.cookies.token;

      if (!token) {
        return res
          .status(401)
          .send({ message: "You are not authorized to access this" });
      }

      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          return res
            .status(401)
            .send({ message: "You are not authorized to access this" });
        }

        req.user = decoded;
        next();
      });
    };

    //! Auth
    app.post("/api/v1/create-token", async (req, res) => {
      const user = req.body;
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
      res.send({ total, result });
    });

    app.get(
      "/api/v1/all-foods-items/:foodId",
      verifyToken,

      async (req, res) => {
        const id = req.params.foodId;
        const query = { _id: new ObjectId(id) };
        const result = await foodsCollection.findOne(query);
        res.send(result);
      }
    );

    app.post("/api/v1/all-foods-items", async (req, res) => {
      const food = req.body;
      const result = await foodsCollection.insertOne(food);
      console.log(food);
      res.send(result);
    });

    app.patch("/api/v1/all-foods-items/:id", async (req, res) => {
      const id = req.params.id;
      const updateFood = req.body;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          totalSell: updateFood.totalSold,
          quantity: updateFood.quantity,
        },
      };

      const updateResult = await foodsCollection.updateOne(filter, updateDoc);
      res.send(updateResult);
    });

    app.put("/api/v1/all-foods-items/:id", async (req, res) => {
      const id = req.params.id;
      const updateFood = req.body;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          name: updateFood.foodName,

          image: updateFood.foodImage,

          category: updateFood.foodCategory,

          price: updateFood.price,

          description: updateFood.foodDescription,

          origin: updateFood.foodOrigin,
          madeBy: updateFood.madeBy,
        },
      };

      const updateResult = await foodsCollection.updateOne(filter, updateDoc);
      res.send(updateResult);
    });

    app.get("/api/v1/top-selling-foods", async (req, res) => {
      const cursor = foodsCollection.find().sort({ totalSell: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    //! Orders
    app.post("/api/v1/create-order", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    app.get("/api/v1/orders", async (req, res) => {
      const queryEmail = req.query.email;

      let query = {};

      if (queryEmail) {
        query = { buyerEmail: queryEmail };
      }
      const cursor = ordersCollection.find(query);
      const result = await cursor.toArray();

      res.send(result);
    });

    app.delete("/api/v1/orders", async (req, res) => {
      const food = req.query.foodName;
      let query = {};
      if (food) {
        query = { foodName: food };
      }
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });

    //! My Profile
    app.get("/api/v1/myAddedFoodItems", verifyToken, async (req, res) => {
      const queryEmail = req.query.email;
      const tokenEmail = req.user.email;
      if (queryEmail !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { "addedBy.email": queryEmail };
      const cursor = foodsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //! Reviews
    //! Reviews
    app.get("/api/v1/reviews", async (req, res) => {
      const cursor = reviewsCollection.find();
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
