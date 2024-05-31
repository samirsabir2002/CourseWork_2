const path = require("path");
const fs = require("fs");
const cors = require("cors");
const express = require("express");
const { ObjectId } = require("mongodb");
const MongoClient = require("mongodb").MongoClient;

const app = express();

app.use(express.json());
app.use(cors());

// Logger middleware
app.use((req, res, next) => {
  console.log("Request IP: " + req.url);
  console.log("Request date: " + new Date());
  next();
});

const uri = "mongodb+srv://hassankhan:3Hfkhan800774256@cluster0.txjv8ql.mongodb.net/CW2?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  
  const db = client.db(CW2);

  console.log("Database connected");

  const Lesson = db.collection("lesson");
  const Order = db.collection("order");

  // Define routes and middleware here

  // Search route with regular expression and case-insensitive matching
  app.get("/collection/lesson/search", (req, res, next) => {
    let query_str = req.query.key_word;
    Lesson.find({
      $or: [
        { subject: { $regex: query_str, $options: "i" } },
        { location: { $regex: query_str, $options: "i" } }
      ]
    }).toArray((err, lessons) => {
      if (err) {
        res.status(500).send("Error retrieving lessons from the database");
      } else {
        res.json(lessons);
      }
    });
  });

  // Add order and update lesson spaces
  app.post("/collection/order/confrimorder", async (req, res) => {
    const order = req.body;

    try {
      // Insert the order into MongoDB
      const result = await Order.insertOne(order);

      // Update lesson spaces
      const lessonsToUpdate = order.cartProduct.map((lesson) => ({
        updateOne: {
          filter: { _id: ObjectId(lesson.id) },
          update: { $inc: { space: -1 } }
        }
      }));
      const updateResult = await Lesson.bulkWrite(lessonsToUpdate);

      res.json({
        message: "Order inserted successfully",
        orderId: result.insertedId,
        lessonsUpdated: updateResult.modifiedCount
      });
    } catch (err) {
      console.error("Error processing order:", err);
      let errorMessage = "Error processing order";
      if (err.code && err.code === 11000) {
        // Example: Duplicate key error
        errorMessage = "Duplicate order detected";
      }
      res.status(500).send(errorMessage);
    }
  });

  app.use(function (req, res, next) {
    var filePath = path.join(__dirname, "img", req.url);
    fs.stat(filePath, function (err, fileInfo) {
      if (err) {
        next();
        return;
      }
      if (fileInfo.isFile()) {
        res.sendFile(filePath);
      } else {
        next();
      }
    });
  });

  app.use(function (req, res) {
    res.status(404);
    res.send("File not found");
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
