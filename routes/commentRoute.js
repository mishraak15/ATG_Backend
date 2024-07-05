const express = require("express");
const {
  likeComment,
  unlikeComment,
  deleteComment,
} = require("../controllers/commentController");
const { protect } = require("../controllers/authController");
const router = express.Router();

router.use(protect);
router.post("/:commentid/addCommentLike", likeComment);
router.post("/:commentid/removeCommentLike", unlikeComment);
router.delete("/:commentid/deleteComment", deleteComment);

module.exports = router;
