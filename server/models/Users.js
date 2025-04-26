const mongoose = require('mongoose');

// Define a reusable schema for option objects
const OptionSchema = new mongoose.Schema({
  value: { type: String, required: true },
  label: { type: String, required: true }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, required: true, unique: true, trim: true, index: true },
  username: { type: String, required: true, unique: true, trim: true, index: true },
  password: { type: String, required: true },
  
  country: OptionSchema,
  province: OptionSchema,
  city: OptionSchema,
  
  profilePicture: { type: String },
  birthday: { type: Date },
  
  open: { type: String, enum: ['Yes', 'No'], default: 'No' },
  type: { type: String, enum: ['Volunteer', 'Paid'], default: 'Volunteer' },
  rate: { type: Number },
  
  languages: { type: [OptionSchema], default: [] },
  
  bio: { type: String, trim: true },
});

// Create Indexes for frequenlty used filter categories
UserSchema.index({ open: 1, country: 1, province: 1, city: 1 });
UserSchema.index({ 'languages.value': 1 });

module.exports = mongoose.model("User", UserSchema);