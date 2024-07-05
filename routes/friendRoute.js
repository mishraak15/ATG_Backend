const express = require("express");
const { protect, restrictTo } = require("../controllers/authController");
const {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  unFriend,
} = require("../controllers/friendController");

const router = express.Router();

router.use(protect);
// router.use(restrictTo('user'));

router.get("/:friendId/send-request", sendFriendRequest);
router.get("/:friendId/accept-request", acceptFriendRequest);
router.get("/:friendId/decline-request", declineFriendRequest);
router.get("/:friendId/unfriend", unFriend);

module.exports = router;
