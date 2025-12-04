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


const matchSchema = new mongoose.Schema({
  player1: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  player2: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  score: {
    player1: { type: Number, default: 0 },
    player2: { type: Number, default: 0 }
  },
  winner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  date: Date
})

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  firstName: String,
  lastName: String,
  matchHistory: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Match'
  }],
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  rank: { type: Number, default: 0 }
})

models.Match = mongoose.model('Match', matchSchema)
console.log('mongoose matchSchema created')
models.User = mongoose.model('User', userSchema)
console.log('mongoose userSchema created')


export default models;