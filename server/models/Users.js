const mongoose = require('mongoose');

// Define a reusable schema for option objects
const OptionSchema = new mongoose.Schema({
  value: { type: String, required: true },
  label: { type: String, required: true }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Store location fields as objects with value and label
  country: { 
    value: { type: String },
    label: { type: String }
  },
  province: { 
    value: { type: String },
    label: { type: String }
  },
  city: { 
    value: { type: String },
    label: { type: String }
  },
  profilePicture: { type: String },
  birthday: { type: Date },
  open: { type: String, enum: ['Yes', 'No'] },
  type: { type: String, enum: ['Volunteer', 'Paid'] },
  rate: { type: Number },
  // Store languages as an array of objects instead of strings
  languages: { 
    type: [{ 
      value: { type: String, required: true },
      label: { type: String, required: true }
    }], 
    default: [] 
  },
  bio: { type: String }
});  

module.exports = mongoose.model("User", UserSchema);