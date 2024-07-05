const express = require("express");
const router = express.Router();
const { storage } = require("../utils/cloudConfig");
const multer = require("multer");
const upload = multer({ storage });
const {
  addLike,
  removeLike,
  addComment,
  fetchPostData,
  deletePost,
} = require("../controllers/postController");
const { protect } = require("../controllers/authController");

router.use(protect);

router.route("/:postid").get(fetchPostData).delete(deletePost);

router.post("/:postid/addlike", addLike);

router.post("/:postid/removelike", removeLike);


router.post("/:postid/addcomment", upload.single("newCommentImg"), addComment);

module.exports = router;
