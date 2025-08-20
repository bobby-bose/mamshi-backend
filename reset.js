const mongoose = require("mongoose");

import HOST from '../../constants/constant';
import PORT from '../../constants/constant';
const Order = require("./models/cart");

// Connection string
const MONGO_URI = `mongodb://${HOST}:27017/mamshi`;

async function resetDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Drop collections if they exist
    const collections = [ "cart"];
    for (let coll of collections) {
      if (await mongoose.connection.db.listCollections({ name: coll }).hasNext()) {
        await mongoose.connection.db.dropCollection(coll);
        console.log(`🗑️ Dropped collection: ${coll}`);
      }
    }


    await Order.createCollection();

    console.log("✅ cart collections successfully");


    console.log("cart indexes:",Order.collection.getIndexes());

    await mongoose.disconnect();
    console.log("🔌 Disconnected");
  } catch (err) {
    console.error("❌ Error resetting DB:", err);
    process.exit(1);
  }
}

resetDB();
