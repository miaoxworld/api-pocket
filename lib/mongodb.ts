import { MongoClient, MongoClientOptions } from 'mongodb';

// Remove the immediate check at the top level
// Instead, define a function to get the URI that will be called at runtime
const getMongoUri = () => {
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/api-pocket';
};

const options: MongoClientOptions = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the connection between hot reloads
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    // Only get URI when actually connecting
    client = new MongoClient(getMongoUri(), options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create a new client
  // Only get URI when actually connecting
  client = new MongoClient(getMongoUri(), options);
  clientPromise = client.connect();
}

export default clientPromise; 