const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  created_at: {
    type: String,
    required: true,
  },

  post_text: String,

  post_img: {
    filename: String,
    url: String,
  },

  category: {
    type: String,
    default: "Simple Post",
    enum: [
      "Simple Post",
      "Web Development",
      "Content Writing",
      "Full Stack Development",
      "Marketing",
      "Designing",
      "SEO Optimization",
      "Data Entry",
    ],
  },

  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    {
      unique: true,
    },
  ],
});

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
