# How to View Orders and Data in MongoDB

## Method 1: Using MongoDB Shell (mongosh)

### Connect to MongoDB
```bash
mongosh mongodb://localhost:27017/shopping-app
```

### View All Collections
```javascript
show collections
```

You should see:
- `orders`
- `products`
- `users`

### View All Orders
```javascript
db.orders.find().pretty()
```

### View Specific Order by ID
```javascript
db.orders.findOne({ _id: ObjectId("your-order-id-here") })
```

### View Orders for a Specific User
```javascript
db.orders.find({ userId: ObjectId("user-id-here") }).pretty()
```

### Count Total Orders
```javascript
db.orders.countDocuments()
```

### View Most Recent Orders
```javascript
db.orders.find().sort({ createdAt: -1 }).limit(5).pretty()
```

### View Orders by Status
```javascript
// Pending orders
db.orders.find({ status: "pending" }).pretty()

// Processing orders
db.orders.find({ status: "processing" }).pretty()

// All statuses
db.orders.distinct("status")
```

### View Order with Product Details
```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "items.product",
      foreignField: "_id",
      as: "productDetails"
    }
  }
]).pretty()
```

## Method 2: Using MongoDB Compass (GUI)

### Install MongoDB Compass
```bash
# Download from: https://www.mongodb.com/try/download/compass
# Or install via package manager

# macOS
brew install --cask mongodb-compass

# Windows
winget install MongoDB.Compass
```

### Connect to Database
1. Open MongoDB Compass
2. Connection string: `mongodb://localhost:27017`
3. Click "Connect"
4. Select database: `shopping-app`
5. Select collection: `orders`

### View Orders in GUI
- **Left sidebar**: See all collections (users, products, orders)
- **Main view**: Browse documents in grid or list view
- **Filter**: Use the filter bar to search
- **Sort**: Click column headers to sort

### Useful Filters in Compass

**Orders by user email:**
```javascript
{ "userId": ObjectId("user-id-here") }
```

**Orders with total > $100:**
```javascript
{ "total": { $gt: 100 } }
```

**Recent orders (last 7 days):**
```javascript
{
  "createdAt": {
    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
}
```

## Method 3: Quick Command Line Queries

### View latest order
```bash
mongosh shopping-app --eval "db.orders.find().sort({createdAt:-1}).limit(1).pretty()"
```

### Count orders
```bash
mongosh shopping-app --eval "db.orders.countDocuments()"
```

### View all user emails
```bash
mongosh shopping-app --eval "db.users.find({}, {email:1, firstName:1, lastName:1}).pretty()"
```

## Database Structure

### Orders Collection Schema
```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),           // Reference to users collection
  items: [
    {
      product: ObjectId("..."),      // Reference to products collection
      productName: "Product Name",
      productPrice: 99.99,
      productImage: "https://...",
      quantity: 2
    }
  ],
  shippingAddress: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "USA"
  },
  paymentMethod: {
    type: "credit-card",
    last4: "4242",
    cardHolder: "John Doe"
  },
  subtotal: 199.98,
  tax: 15.99,
  shipping: 9.99,
  total: 225.96,
  status: "pending",                 // pending, processing, shipped, delivered, cancelled
  estimatedDelivery: ISODate("..."),
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Users Collection Schema
```javascript
{
  _id: ObjectId("..."),
  email: "test@example.com",
  password: "$2a$10$...",             // Hashed with bcrypt
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890",
  avatar: "https://...",
  address: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "USA"
  },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Products Collection Schema
```javascript
{
  _id: ObjectId("..."),
  name: "Product Name",
  description: "Product description...",
  price: 99.99,
  category: "Electronics",
  image: "https://...",
  images: ["https://...", "https://..."],
  stock: 50,
  rating: 4.5,
  reviews: 234,
  tags: ["tag1", "tag2"],
  specifications: {
    "Key": "Value"
  },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

## Common Queries

### Find User by Email
```javascript
db.users.findOne({ email: "test@example.com" })
```

### Get User's Order History
```javascript
// First get user ID
const user = db.users.findOne({ email: "test@example.com" })

// Then get their orders
db.orders.find({ userId: user._id }).sort({ createdAt: -1 })
```

### Calculate Total Revenue
```javascript
db.orders.aggregate([
  { $match: { status: { $ne: "cancelled" } } },
  { $group: { _id: null, totalRevenue: { $sum: "$total" } } }
])
```

### Products Low in Stock
```javascript
db.products.find({ stock: { $lt: 10 } }).sort({ stock: 1 })
```

### Orders This Month
```javascript
const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

db.orders.find({
  createdAt: { $gte: startOfMonth }
}).count()
```

## Export Orders to JSON

### Single Order
```bash
mongosh shopping-app --eval "db.orders.findOne()" > order.json
```

### All Orders
```bash
mongoexport --db=shopping-app --collection=orders --out=orders.json --jsonArray
```

### Export as CSV
```bash
mongoexport --db=shopping-app --collection=orders --type=csv --fields=_id,userId,total,status,createdAt --out=orders.csv
```

## Useful MongoDB Shell Commands

```javascript
// Show current database
db.getName()

// Show all databases
show dbs

// Show all collections
show collections

// Get collection stats
db.orders.stats()

// Get index information
db.orders.getIndexes()

// Drop a collection (CAREFUL!)
db.orders.drop()

// Drop entire database (VERY CAREFUL!)
db.dropDatabase()
```

## Testing: Create a Test Order

### Using mongosh
```javascript
db.orders.insertOne({
  userId: ObjectId("user-id-here"),
  items: [
    {
      product: ObjectId("product-id-here"),
      productName: "Test Product",
      productPrice: 99.99,
      productImage: "https://example.com/image.jpg",
      quantity: 1
    }
  ],
  shippingAddress: {
    street: "123 Test St",
    city: "Test City",
    state: "TC",
    zipCode: "12345",
    country: "USA"
  },
  paymentMethod: {
    type: "credit-card",
    last4: "4242",
    cardHolder: "Test User"
  },
  subtotal: 99.99,
  tax: 8.00,
  shipping: 9.99,
  total: 117.98,
  status: "pending",
  estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Troubleshooting

### Can't Connect to MongoDB
```bash
# Check if MongoDB is running
mongosh --eval "db.version()"

# Or for Docker
docker ps | grep mongo
```

### Database Not Found
```bash
# List all databases
mongosh --eval "show dbs"

# Switch to database (creates if not exists)
mongosh
use shopping-app
```

### No Orders Found
1. Make sure you've created an order through the app
2. Check you're connected to the right database: `shopping-app`
3. Verify backend is saving orders: Check backend logs

## Quick Reference Card

```bash
# Connect
mongosh mongodb://localhost:27017/shopping-app

# View orders
db.orders.find().pretty()

# Count orders
db.orders.countDocuments()

# Latest order
db.orders.find().sort({createdAt:-1}).limit(1).pretty()

# Orders by status
db.orders.find({status:"pending"}).pretty()

# Exit
exit
```

## Desktop Tools

### MongoDB Compass (Official GUI)
- Download: https://www.mongodb.com/try/download/compass
- Best for: Visual exploration, query building

### Studio 3T
- Download: https://studio3t.com/download/
- Best for: Advanced queries, data import/export

### Robo 3T (Free)
- Download: https://robomongo.org/download
- Best for: Lightweight shell-like GUI
