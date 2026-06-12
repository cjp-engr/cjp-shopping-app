# View Orders in MongoDB (Docker)

Since you're running MongoDB in Docker, use these commands:

## ✅ Your Current Order

**You have 1 order in the database!**

- **Order ID:** `6a2bce9d677ff4c533040caa`
- **Product:** Children's Picture Book ($14.99)
- **Total:** $26.18 (including tax + shipping)
- **Status:** pending
- **Created:** 2026-06-12 at 09:17:17

## Quick Commands (Docker MongoDB)

### View All Orders
```bash
docker exec mongodb mongosh shopping-app --quiet --eval "db.orders.find().pretty()"
```

### Count Total Orders
```bash
docker exec mongodb mongosh shopping-app --quiet --eval "db.orders.countDocuments()"
```

### View Latest Order
```bash
docker exec mongodb mongosh shopping-app --quiet --eval "db.orders.find().sort({createdAt:-1}).limit(1).pretty()"
```

### View All Users
```bash
docker exec mongodb mongosh shopping-app --quiet --eval "db.users.find({}, {email:1, firstName:1, lastName:1}).pretty()"
```

### View All Products (first 10)
```bash
docker exec mongodb mongosh shopping-app --quiet --eval "db.products.find({}, {name:1, price:1, category:1}).limit(10).pretty()"
```

### Database Statistics
```bash
docker exec mongodb mongosh shopping-app --quiet --eval "
  print('Orders:', db.orders.countDocuments());
  print('Users:', db.users.countDocuments());
  print('Products:', db.products.countDocuments());
"
```

## Interactive MongoDB Shell

### Enter MongoDB Shell
```bash
docker exec -it mongodb mongosh shopping-app
```

Once inside, you can run commands directly:

```javascript
// List collections
show collections

// View all orders
db.orders.find().pretty()

// Count orders
db.orders.countDocuments()

// Find specific order
db.orders.findOne({ _id: ObjectId("6a2bce9d677ff4c533040caa") })

// Orders by status
db.orders.find({ status: "pending" }).pretty()

// Exit shell
exit
```

## Query Orders by User

### Get User Email First
```bash
docker exec mongodb mongosh shopping-app --quiet --eval "db.users.find({}, {email:1}).pretty()"
```

### Find User's Orders
```bash
# Replace USER_ID with actual user ID
docker exec mongodb mongosh shopping-app --quiet --eval '
  var userId = ObjectId("6a2bce5ef2760db8a508386b");
  db.orders.find({ userId: userId }).pretty()
'
```

## Using MongoDB Compass (Recommended GUI)

### 1. Install MongoDB Compass
- Download: https://www.mongodb.com/try/download/compass
- Or: `winget install MongoDB.Compass` (Windows)

### 2. Connect to Docker MongoDB
- Connection string: `mongodb://localhost:27017`
- Click "Connect"

### 3. Navigate to Orders
1. Select database: `shopping-app`
2. Select collection: `orders`
3. Browse orders visually with filters and sorting

### 4. Useful Filters in Compass

**Pending orders:**
```json
{ "status": "pending" }
```

**Orders over $50:**
```json
{ "total": { "$gt": 50 } }
```

**Orders this week:**
```json
{
  "createdAt": {
    "$gte": { "$date": "2026-06-05T00:00:00.000Z" }
  }
}
```

## Export Data

### Export Orders to JSON
```bash
docker exec mongodb mongoexport --db=shopping-app --collection=orders --out=/tmp/orders.json --jsonArray

# Copy to your computer
docker cp mongodb:/tmp/orders.json ./orders.json
```

### Export as CSV
```bash
docker exec mongodb mongoexport --db=shopping-app --collection=orders --type=csv --fields=_id,userId,total,status,createdAt --out=/tmp/orders.csv

# Copy to your computer
docker cp mongodb:/tmp/orders.csv ./orders.csv
```

## Advanced Queries

### Total Revenue
```bash
docker exec mongodb mongosh shopping-app --quiet --eval '
  db.orders.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $group: { _id: null, totalRevenue: { $sum: "$total" } } }
  ]).pretty()
'
```

### Orders by Status Count
```bash
docker exec mongodb mongosh shopping-app --quiet --eval '
  db.orders.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).pretty()
'
```

### Most Popular Products
```bash
docker exec mongodb mongosh shopping-app --quiet --eval '
  db.orders.aggregate([
    { $unwind: "$items" },
    { $group: {
      _id: "$items.productName",
      totalSold: { $sum: "$items.quantity" },
      revenue: { $sum: { $multiply: ["$items.productPrice", "$items.quantity"] } }
    }},
    { $sort: { totalSold: -1 } },
    { $limit: 10 }
  ]).pretty()
'
```

## Real-time Monitoring

### Watch for New Orders
```bash
docker exec -it mongodb mongosh shopping-app --eval '
  var cursor = db.orders.watch();
  print("Watching for new orders... (Ctrl+C to stop)");
  while (cursor.hasNext()) {
    var change = cursor.next();
    print("New order:", change.fullDocument._id);
  }
'
```

## Common Tasks

### Find Order by ID
```bash
docker exec mongodb mongosh shopping-app --quiet --eval '
  db.orders.findOne({ _id: ObjectId("6a2bce9d677ff4c533040caa") })
'
```

### Update Order Status
```bash
docker exec mongodb mongosh shopping-app --quiet --eval '
  db.orders.updateOne(
    { _id: ObjectId("6a2bce9d677ff4c533040caa") },
    { $set: { status: "processing" } }
  )
'
```

### Get User Info for Order
```bash
docker exec mongodb mongosh shopping-app --quiet --eval '
  db.orders.aggregate([
    { $match: { _id: ObjectId("6a2bce9d677ff4c533040caa") } },
    { $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "userInfo"
    }},
    { $project: {
      total: 1,
      status: 1,
      "userInfo.email": 1,
      "userInfo.firstName": 1,
      "userInfo.lastName": 1
    }}
  ]).pretty()
'
```

## Backup Database

### Create Backup
```bash
docker exec mongodb mongodump --db=shopping-app --out=/tmp/backup

# Copy to your computer
docker cp mongodb:/tmp/backup ./mongodb-backup
```

### Restore Backup
```bash
# Copy backup to container
docker cp ./mongodb-backup mongodb:/tmp/backup

# Restore
docker exec mongodb mongorestore --db=shopping-app /tmp/backup/shopping-app
```

## Troubleshooting

### Can't Access MongoDB
```bash
# Check if container is running
docker ps | grep mongodb

# View container logs
docker logs mongodb
```

### Permission Denied
```bash
# Run with proper permissions
docker exec -u mongodb mongodb mongosh shopping-app
```

### Container Not Found
```bash
# List all containers
docker ps -a

# Start container if stopped
docker start mongodb
```

## Quick Reference

```bash
# === VIEWING DATA ===
docker exec mongodb mongosh shopping-app --quiet --eval "db.orders.find().pretty()"
docker exec mongodb mongosh shopping-app --quiet --eval "db.users.find().pretty()"
docker exec mongodb mongosh shopping-app --quiet --eval "db.products.find().limit(10).pretty()"

# === STATISTICS ===
docker exec mongodb mongosh shopping-app --quiet --eval "db.orders.countDocuments()"
docker exec mongodb mongosh shopping-app --quiet --eval "db.stats()"

# === INTERACTIVE SHELL ===
docker exec -it mongodb mongosh shopping-app

# === EXPORT DATA ===
docker exec mongodb mongoexport --db=shopping-app --collection=orders --out=/tmp/orders.json
docker cp mongodb:/tmp/orders.json ./orders.json
```

## Your Current Database

- **Orders:** 1
- **Users:** 1 (test@example.com)
- **Products:** 40

Create more orders by shopping in the app at http://localhost:5173!
