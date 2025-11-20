import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.dev' });

let models = {};

main().catch(err => console.log(err));

async function main() {
  console.log('connecting to mongodb');
  
  const DB_PASSWORD = process.env.DB_PASSWORD || '';
  const MONGODB_URI = `mongodb+srv://info441retroarcade_db_user:${DB_PASSWORD}@retroarcadepong.26d8swo.mongodb.net/?appName=retroarcadepong`;
  await mongoose.connect(MONGODB_URI);
  console.log('successfully connected to mongodb!');
}

export default models;