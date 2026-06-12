import dotenv from 'dotenv';
import { connectDB } from '../config/database.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

dotenv.config();

const products = [
  // Electronics
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium noise-cancelling over-ear headphones with 30-hour battery life and superior sound quality.',
    price: 199.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500'
    ],
    stock: 45,
    rating: 4.5,
    reviews: 234,
    tags: ['wireless', 'bluetooth', 'noise-cancelling'],
    specifications: new Map([
      ['Battery Life', '30 hours'],
      ['Bluetooth', '5.0'],
      ['Weight', '250g'],
      ['Warranty', '2 years']
    ])
  },
  {
    name: 'Smartphone 128GB',
    description: 'Latest generation smartphone with 6.5" OLED display, triple camera system, and 5G connectivity.',
    price: 799.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500',
    stock: 28,
    rating: 4.7,
    reviews: 512,
    tags: ['5G', 'smartphone', 'OLED'],
    specifications: new Map([
      ['Display', '6.5" OLED'],
      ['Storage', '128GB'],
      ['RAM', '8GB'],
      ['Camera', '48MP + 12MP + 5MP']
    ])
  },
  {
    name: 'Laptop 15.6" Intel i7',
    description: 'Powerful laptop with Intel Core i7, 16GB RAM, 512GB SSD, perfect for work and gaming.',
    price: 1299.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500',
    stock: 15,
    rating: 4.6,
    reviews: 187,
    tags: ['laptop', 'gaming', 'productivity'],
    specifications: new Map([
      ['Processor', 'Intel Core i7'],
      ['RAM', '16GB'],
      ['Storage', '512GB SSD'],
      ['Display', '15.6" Full HD']
    ])
  },
  {
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with precision tracking and rechargeable battery.',
    price: 29.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
    stock: 120,
    rating: 4.3,
    reviews: 342,
    tags: ['wireless', 'mouse', 'ergonomic']
  },
  {
    name: '4K Webcam',
    description: 'Professional 4K webcam with auto-focus and noise-cancelling microphone.',
    price: 149.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=500',
    stock: 63,
    rating: 4.4,
    reviews: 89,
    tags: ['webcam', '4K', 'streaming']
  },
  {
    name: 'Mechanical Keyboard RGB',
    description: 'Gaming mechanical keyboard with RGB backlighting and customizable keys.',
    price: 89.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
    stock: 74,
    rating: 4.6,
    reviews: 298,
    tags: ['keyboard', 'gaming', 'RGB']
  },
  {
    name: 'Smart Watch',
    description: 'Fitness tracking smart watch with heart rate monitor and GPS.',
    price: 249.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500',
    stock: 52,
    rating: 4.6,
    reviews: 412,
    tags: ['smartwatch', 'fitness', 'wearable']
  },
  {
    name: 'Portable Bluetooth Speaker',
    description: 'Waterproof portable speaker with 360° sound and 12-hour battery.',
    price: 59.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500',
    stock: 134,
    rating: 4.4,
    reviews: 567,
    tags: ['speaker', 'bluetooth', 'portable']
  },

  // Clothing
  {
    name: 'Classic White T-Shirt',
    description: '100% cotton classic fit t-shirt, comfortable and durable for everyday wear.',
    price: 19.99,
    category: 'Clothing',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
    stock: 200,
    rating: 4.2,
    reviews: 423,
    tags: ['t-shirt', 'cotton', 'casual'],
    specifications: new Map([
      ['Material', '100% Cotton'],
      ['Fit', 'Classic'],
      ['Care', 'Machine washable']
    ])
  },
  {
    name: 'Denim Jeans - Slim Fit',
    description: 'Premium denim jeans with stretch comfort and modern slim fit.',
    price: 59.99,
    category: 'Clothing',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500',
    stock: 85,
    rating: 4.5,
    reviews: 267,
    tags: ['jeans', 'denim', 'slim-fit']
  },
  {
    name: 'Running Shoes',
    description: 'Lightweight running shoes with superior cushioning and breathable mesh.',
    price: 79.99,
    category: 'Clothing',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
    stock: 56,
    rating: 4.7,
    reviews: 512,
    tags: ['shoes', 'running', 'athletic']
  },
  {
    name: 'Winter Jacket',
    description: 'Waterproof winter jacket with down insulation, perfect for cold weather.',
    price: 149.99,
    category: 'Clothing',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
    stock: 42,
    rating: 4.8,
    reviews: 178,
    tags: ['jacket', 'winter', 'waterproof']
  },
  {
    name: 'Casual Sneakers',
    description: 'Comfortable canvas sneakers perfect for everyday casual wear.',
    price: 45.99,
    category: 'Clothing',
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500',
    stock: 92,
    rating: 4.3,
    reviews: 234,
    tags: ['sneakers', 'casual', 'canvas']
  },
  {
    name: 'Hoodie - Pullover',
    description: 'Cozy pullover hoodie made from soft cotton blend fabric.',
    price: 39.99,
    category: 'Clothing',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500',
    stock: 110,
    rating: 4.4,
    reviews: 356,
    tags: ['hoodie', 'casual', 'cotton']
  },
  {
    name: 'Dress Shirt - Formal',
    description: 'Classic formal dress shirt in white, wrinkle-resistant fabric.',
    price: 39.99,
    category: 'Clothing',
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500',
    stock: 87,
    rating: 4.3,
    reviews: 189,
    tags: ['shirt', 'formal', 'business']
  },
  {
    name: 'Leather Belt',
    description: 'Genuine leather belt with classic buckle, available in multiple colors.',
    price: 24.99,
    category: 'Clothing',
    image: 'https://images.unsplash.com/photo-1624222247344-550fb60583bb?w=500',
    stock: 145,
    rating: 4.2,
    reviews: 298,
    tags: ['belt', 'leather', 'accessory']
  },

  // Home & Garden
  {
    name: 'Modern Table Lamp',
    description: 'Sleek modern table lamp with adjustable brightness and USB charging port.',
    price: 49.99,
    category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500',
    stock: 67,
    rating: 4.5,
    reviews: 145,
    tags: ['lamp', 'lighting', 'modern']
  },
  {
    name: 'Throw Pillow Set (4-Pack)',
    description: 'Decorative throw pillows with removable covers in various colors.',
    price: 34.99,
    category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500',
    stock: 88,
    rating: 4.2,
    reviews: 223,
    tags: ['pillows', 'decor', 'home']
  },
  {
    name: 'Indoor Plant - Snake Plant',
    description: 'Low-maintenance snake plant, perfect for improving indoor air quality.',
    price: 24.99,
    category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=500',
    stock: 135,
    rating: 4.6,
    reviews: 412,
    tags: ['plant', 'indoor', 'air-purifying']
  },
  {
    name: 'Coffee Table - Wood',
    description: 'Rustic wooden coffee table with storage shelf, perfect for living rooms.',
    price: 199.99,
    category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=500',
    stock: 23,
    rating: 4.7,
    reviews: 87,
    tags: ['furniture', 'table', 'wood']
  },
  {
    name: 'Wall Clock - Minimalist',
    description: 'Silent minimalist wall clock with clean design, battery operated.',
    price: 27.99,
    category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=500',
    stock: 156,
    rating: 4.3,
    reviews: 267,
    tags: ['clock', 'wall-decor', 'minimalist']
  },
  {
    name: 'Area Rug 5x7',
    description: 'Soft area rug with geometric pattern, stain-resistant and easy to clean.',
    price: 89.99,
    category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1601153896234-b09b52f3f8f4?w=500',
    stock: 41,
    rating: 4.4,
    reviews: 178,
    tags: ['rug', 'carpet', 'decor']
  },
  {
    name: 'Desk Organizer Set',
    description: 'Bamboo desk organizer with multiple compartments for office supplies.',
    price: 32.99,
    category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=500',
    stock: 78,
    rating: 4.5,
    reviews: 234,
    tags: ['organizer', 'office', 'bamboo']
  },
  {
    name: 'Scented Candle Set',
    description: 'Set of 3 soy wax candles with calming lavender, vanilla, and citrus scents.',
    price: 28.99,
    category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1602874801006-e7f2dc7e8027?w=500',
    stock: 156,
    rating: 4.6,
    reviews: 445,
    tags: ['candles', 'scented', 'decor']
  },

  // Books
  {
    name: 'The Art of Programming',
    description: 'Comprehensive guide to modern programming practices and design patterns.',
    price: 44.99,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500',
    stock: 78,
    rating: 4.8,
    reviews: 523,
    tags: ['programming', 'technical', 'education'],
    specifications: new Map([
      ['Pages', '648'],
      ['Publisher', 'Tech Books Inc'],
      ['Language', 'English'],
      ['ISBN', '978-1234567890']
    ])
  },
  {
    name: 'Mystery Novel: The Lost Key',
    description: 'Gripping mystery thriller that will keep you guessing until the very end.',
    price: 16.99,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500',
    stock: 145,
    rating: 4.5,
    reviews: 892,
    tags: ['fiction', 'mystery', 'thriller']
  },
  {
    name: 'Cookbook: Healthy Recipes',
    description: 'Collection of 200+ healthy and delicious recipes for everyday cooking.',
    price: 29.99,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=500',
    stock: 92,
    rating: 4.6,
    reviews: 356,
    tags: ['cookbook', 'healthy', 'recipes']
  },
  {
    name: 'Science Fiction: Galactic Wars',
    description: 'Epic space opera spanning multiple planets and civilizations.',
    price: 18.99,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500',
    stock: 67,
    rating: 4.7,
    reviews: 678,
    tags: ['sci-fi', 'fiction', 'space']
  },
  {
    name: 'Self-Help: Mindful Living',
    description: 'Practical guide to mindfulness and living a more intentional life.',
    price: 22.99,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500',
    stock: 103,
    rating: 4.4,
    reviews: 445,
    tags: ['self-help', 'mindfulness', 'wellness']
  },
  {
    name: 'Biography: Innovators',
    description: 'Inspiring stories of the world\'s greatest innovators and entrepreneurs.',
    price: 26.99,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=500',
    stock: 58,
    rating: 4.5,
    reviews: 267,
    tags: ['biography', 'business', 'inspiration']
  },
  {
    name: 'Children\'s Picture Book',
    description: 'Beautifully illustrated picture book teaching important life lessons.',
    price: 14.99,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500',
    stock: 198,
    rating: 4.8,
    reviews: 678,
    tags: ['children', 'picture-book', 'education']
  },
  {
    name: 'Travel Guide: Europe',
    description: 'Comprehensive travel guide covering 30+ European destinations.',
    price: 21.99,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500',
    stock: 64,
    rating: 4.5,
    reviews: 234,
    tags: ['travel', 'guide', 'europe']
  },

  // Sports & Outdoors
  {
    name: 'Yoga Mat - Premium',
    description: 'Extra thick yoga mat with non-slip surface and carrying strap.',
    price: 34.99,
    category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500',
    stock: 112,
    rating: 4.6,
    reviews: 534,
    tags: ['yoga', 'fitness', 'exercise']
  },
  {
    name: 'Camping Tent - 4 Person',
    description: 'Waterproof camping tent with easy setup, sleeps up to 4 people.',
    price: 129.99,
    category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=500',
    stock: 34,
    rating: 4.5,
    reviews: 189,
    tags: ['camping', 'tent', 'outdoor']
  },
  {
    name: 'Dumbbell Set - Adjustable',
    description: 'Adjustable dumbbell set from 5-25 lbs, perfect for home workouts.',
    price: 89.99,
    category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500',
    stock: 67,
    rating: 4.7,
    reviews: 423,
    tags: ['fitness', 'weights', 'strength']
  },
  {
    name: 'Hiking Backpack - 40L',
    description: 'Durable hiking backpack with multiple compartments and hydration system.',
    price: 79.99,
    category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1622260614153-03223fb72052?w=500',
    stock: 45,
    rating: 4.6,
    reviews: 278,
    tags: ['hiking', 'backpack', 'outdoor']
  },
  {
    name: 'Basketball - Official Size',
    description: 'Official size basketball with superior grip and durability.',
    price: 29.99,
    category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500',
    stock: 98,
    rating: 4.4,
    reviews: 312,
    tags: ['basketball', 'sports', 'outdoor']
  },
  {
    name: 'Bicycle Helmet',
    description: 'Lightweight bicycle helmet with adjustable fit and ventilation system.',
    price: 39.99,
    category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1589403165913-94b1716e8cb9?w=500',
    stock: 76,
    rating: 4.5,
    reviews: 234,
    tags: ['bicycle', 'helmet', 'safety']
  },
  {
    name: 'Resistance Bands Set',
    description: 'Set of 5 resistance bands with different strength levels and carry bag.',
    price: 24.99,
    category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500',
    stock: 142,
    rating: 4.5,
    reviews: 567,
    tags: ['fitness', 'resistance-bands', 'exercise']
  },
  {
    name: 'Soccer Ball - Pro Quality',
    description: 'Professional quality soccer ball with superior control and durability.',
    price: 34.99,
    category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=500',
    stock: 89,
    rating: 4.6,
    reviews: 389,
    tags: ['soccer', 'ball', 'sports']
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await Product.deleteMany({});
    await User.deleteMany({});

    // Create test user
    console.log('Creating test user...');
    await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });

    // Insert products
    console.log('Seeding products...');
    await Product.insertMany(products);

    console.log(`✅ Database seeded successfully!`);
    console.log(`   - ${products.length} products added`);
    console.log(`   - 1 test user created (test@example.com / password123)`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
