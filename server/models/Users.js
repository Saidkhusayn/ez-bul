const mongoose = require('mongoose');

const OptionScheme = new mongoose.Schema({
    code: { type: String, required: true },
    label: { type: String, required: true }
  }, { _id: false });

  const UserSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    country: { type: String,  },
    province: { type: String,  }, //required: true
    city: { type: String,  },
    profilePicture: { type: String },
    birthday: { type: Date },
    open: { type: String, enum: ['Yes', 'No'] },
    type: { type: String, enum: ['Volunteer', 'Paid'] },
    rate: { type: Number },
    languages: { type: [String], default: [] },
    bio: { type: String }
  });  


module.exports = mongoose.model("User", UserSchema);