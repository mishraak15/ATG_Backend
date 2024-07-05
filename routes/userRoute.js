const express = require("express");
const router = express.Router();
const { storage } = require("../utils/cloudConfig");
const multer = require("multer");
const {
  addNewPost,
  getPosts,
  addToSavedPost,
  addToFavorites,
  fetchSavedPost,
  fetchFavorites,
  checkStatus,
  fetchUserData,
  fetchFriendRequests,
  fetchNotifications,
  fetchFriends,
  removeFromFavorites,
  removeFromSaved,
  editUser,
} = require("../controllers/userController");

const upload = multer({ storage });
const { protect } = require("../controllers/authController");

router.get("/:userid/checkStatus", checkStatus);

router.use(protect);

router.get("/:userid/profile", fetchUserData);

router.post("/:userid/newpost", upload.single("newPostImg"), addNewPost);

router.post(
  "/:userid/editUser",
  upload.fields([
    { name: "editedData[profile_photo]", maxCount: 1 },
    { name: "editedData[background_photo]", maxCount: 1 },
  ]),
  editUser
);

router.get("/:userid/posts", getPosts);

router.post("/:userid/savepost", addToSavedPost);

router.post("/:userid/addtofavorite", addToFavorites);

router.get("/:userid/fetchsaved", fetchSavedPost);

router.get("/:userid/fetchfavorites", fetchFavorites);

router.get("/:userid/fetchFriendRequests", fetchFriendRequests);

router.get("/:userid/fetchNotifications", fetchNotifications);

router.get("/:userid/fetchFriends", fetchFriends);

router.post("/:userid/removeFromFavorites", removeFromFavorites);

router.post("/:userid/removeFromSaved", removeFromSaved);

module.exports = router;
