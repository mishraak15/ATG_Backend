const User = require("../models/user");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const crypto = require("crypto");
const sendEmail = require("../utils/sendMail");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //so that data cannot be modified in cookie
    httpOnly: true,
  };

  if (process.env?.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    msg: "OK",
    token,
    active: user.active,
    userid: user._id,
  });
};

const signup = catchAsync(async (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return next(
      new AppError(
        "Username, Email, Password & ConfirmPassword is required!!",
        400
      )
    );
  }

  if (password !== confirmPassword) {
    return next(
      new AppError("Password & Confirm Password should be same!!", 400)
    );
  }

  const newUser = new User({
    username: username,
    email: email,
    password: password,
  });

  const verificationCode = newUser.createVerificationCode();

  await newUser.save();

  const redirectUrl = `${req.protocol}://${req.get(
    "host"
  )}/verifyemail/${verificationCode}`;

  const to = newUser.email;
  const subject = "Account verification link";
  const message = ` Kindly click on the link ${redirectUrl} to verify your account status`;

  sendEmail(to, subject, message);

  createSendToken(newUser, 201, res);
});

const login = catchAsync(async (req, res, next) => {
  const password = req.body.password;
  const identifier = req.body.username;

  if (!identifier || !password) {
    return next(new AppError("Please enter the email and password", 400));
  }

  //we can login using either email or username
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Invalid email or password", 401));
  }

  if (!user.active) {
    return next(
      new AppError(
        `Your Email is not verified yet Check your ${user.email} for link `,
        401
      )
    );
  }

  createSendToken(user, 200, res);
});

const logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ msg: "OK" });
};

const protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("You are not logged in", 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }
  res.locals.user = freshUser;
  req.user = freshUser;
  next();
});

const restrictTo = (...roles) => {
  //middleware
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

const forgetPassword = catchAsync(async (req, res, next) => {
  //1) get user through email

  const identifier = req.body.username;

  if (!identifier || identifier === "") {
    return next(new AppError("Email or Username is Required!! ", 400));
  }

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });

  if (!user) {
    return next(new AppError("User not found! ", 404));
  }

  //2)Generate random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });
  //3)send it to your's email
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/resetpassword/${resetToken}`;

  try {
    const to = user.email;
    const subject = "Reset Token. Do not Share!!!!!";
    const message = `Forget your password? Submit a PATCH request with your new password and password confirm to: ${resetURL}.\n
    If you didn't forget your password ignore this email!`;
    sendEmail(to, subject, message);

    res.status(200).json({
      msg: "OK",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. try again later!"),
      500
    );
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on token
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    return next(
      new AppError("Password and Confirm Password is required.", 400)
    );
  }

  if (password !== confirmPassword) {
    return next(
      new AppError("Password and Confirm Password should be same", 400)
    );
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2)If token is not expired and there is user , set the new password
  if (!user) {
    return next(new AppError("Wrong Token OR Token Expired", 400));
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});

const verifyEmailHandler = catchAsync(async (req, res, next) => {
  //1)Get user based on the code
  const verificationCode = crypto
    .createHash("sha256")
    .update(req.params.Code)
    .digest("hex");

  const user = await User.findOne({
    verificationCode: verificationCode,
  });

  if (!user) {
    return next(new AppError("Invalid Registration Link...", 400));
  }
  user.active = true;
  user.verificationCode = null;
  await user.save({ validateBeforeSave: false });
  //4) log the user in send JWT
  createSendToken(user, 200, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  let { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select("+password");
  //2)check if posted password is correct
  if (!(await user.correctPassword(oldPassword, user.password))) {
    return next(new AppError("Your current password is wrong", 401));
  }

  //3)if so, update password
  user.password = newPassword;
  await user.save();
  createSendToken(user, 200, res);
});

module.exports = {
  signup,
  login,
  logout,
  protect,
  updatePassword,
  verifyEmailHandler,
  resetPassword,
  forgetPassword,
  restrictTo,
};
