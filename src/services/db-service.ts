import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/monday-calculations';

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: true,
};

// Function to initialize the database connection
export const connectToDatabase = async (): Promise<typeof mongoose> => {
  try {
    if (mongoose.connection.readyState === 0) {
      console.log('Connecting to MongoDB database...');
      const connection = await mongoose.connect(MONGODB_URI);
      console.log('Successfully connected to MongoDB!');
      return connection;
    }

    return mongoose;
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

// Function to close the database connection
export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB', error);
  }
};

export default {
  connectToDatabase,
  disconnectFromDatabase,
};
