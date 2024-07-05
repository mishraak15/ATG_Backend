const express = require("express");
const router = express.Router();
const {
  signup,
  verifyEmailHandler,
  logout,
  login,
  forgetPassword,
  resetPassword,
} = require("../controllers/authController");
const { fetchJobs } = require("../controllers/postController");

router.post("/signup", signup);

router.get("/logout", logout);

router.post("/login", login);

router.get("/fetchJobs/:category", fetchJobs);

router.post("/forgetpassword", forgetPassword);

router.patch("/resetpassword/:token", resetPassword);

router.get("/verifyemail/:Code", verifyEmailHandler);

module.exports = router;