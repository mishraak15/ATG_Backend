const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      // required: true,
    },

    name: String,

    profile_photo: {
      filename: {
        type: String,
        default: "profilePhoto",
      },
      url: {
        type: String,
        default:
          "https://cdn-icons-png.freepik.com/512/64/64572.png?ga=GA1.1.343122819.1710065287&",
      },
    },

    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    bio: {
      type: String,
      default: "ATG User",
    },

    background_photo: {
      filename: {
        type: String,
        default: "backgroundPhoto",
      },

      url: {
        type: String,
        default:
          "https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?q=80&w=1469&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other", ""],
      default: "",
    },

    mobile_no: {
      type: Number,
      maxlength: 14,
      minlength: 10,
    },

    dob: {
      type: String,
    },

    saved: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    friend_requests: [
      {
        sent_by: {
          type: mongoose.Schema.Types.ObjectId, // Not necessary to add full details
          ref: "User",
        },
        sent_at: {
          type: String,
          required: true,
        },
        isSent: {
          type: Boolean,
          default: false,
        },
      },
    ],

    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],

    passwordChangedAt: Date,

    passwordResetToken: String,

    passwordResetExpires: Date,

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    verificationCode: {
      type: String,
      select: false,
    },

    isFrozen: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  CandidatePassword,
  userPassword
) {
  return await bcrypt.compare(CandidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimeStamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

userSchema.methods.createVerificationCode = function () {
  const verificationCode = crypto.randomBytes(32).toString("hex");
  this.verificationCode = crypto
    .createHash("sha256")
    .update(verificationCode)
    .digest("hex");
  return verificationCode;
};

let User = mongoose.model("User", userSchema);
module.exports = User;
