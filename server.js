const path = require("path");
const fs = require("fs");
const cors = require("cors");
const express = require("express");
const { ObjectId } = require("mongodb");
const MongoClient = require("mongodb").MongoClient;

const app = express();

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Orign", "*"); // Allow cross-origin requests
  res.header("Access-Control-Allow-Headers", "*"); // Allow all headers
  next();
});

// logger middleware
app.use((req, res, next) => {
  console.log("Request IP: " + req.url);
  console.log("Request date: " + new Date());
  next();
});

const connectionString =
  "mongodb+srv://hassankhan:3Hfkhan800774256@cluster0.txjv8ql.mongodb.net/";

const databaseName = "CW2";

MongoClient.connect(connectionString, (err, client) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    const db = client.db(databaseName);
    console.log("Database connected");

    const Lesson = db.collection("lesson");
    const Order = db.collection("order");

    app.get("/lesson", (req, res) => {
      Lesson.find({}).toArray((err, lessons) => {
        if (err) {
          res.status(500).send("Error retrieving lessons from the database");
        } else {
          res.json(lessons);
        }
      });
    });

    app.param("collectionName", (req, res, next, collectionName) => {
      req.connection = db.collection(collectionName);
      return next();
    });

    app.get("/collection/:collectionName", (req, res, next) => {
      req.connection.find({}).toArray((e, results) => {
        if (e) return next(e);
        res.send(results);
      });
    });

    app.post("/collection/:collectionName", (req, res, next) => {
      req.connection.insert(req.body, (e, results) => {
        if (e) return next(e);
        let response = { message: "Success" };
        res.send(response);
      });
    });

    app.put("/collection/:collectionName/:id", (req, res, next) => {
      try {
        const objectID = require("mongodb").ObjectID;

        req.connection.updateOne(
          { _id: new objectID(req.params.id) },
          { $inc: { space: -1 * 1 } }, // Decrementing space by 1
          { safe: true, multi: false },
          (e, result) => {
            if (e) return next(e);
            res.send(
              result.result.n === 1 ? { msg: "Success" } : { msg: "error" }
            );
          }
        );
      } catch (ex) {
        console.log("🚀 ~ app.put ~ ex:", ex);
        next(ex); // Pass error to the error handler
      }
    });

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
            filter: { _id: ObjectId(lesson.id) }, // Update this line
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
  }
});
