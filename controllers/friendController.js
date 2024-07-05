const User = require("../models/user");
const Notification = require("../models/notification");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

const sendFriendRequest = catchAsync(async (req, res, next) => {
  const id = req.params.friendId;

  if (!id) {
    return next(new AppError("Please provide User Id of recipient", 400));
  }

  if (id === req.user._id.toString()) {
    return next(new AppError("Cannot send friend request to self", 400));
  }

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const currUser = await User.findById(req.user._id);

  // Check if they are friends
  if (currUser.friends.includes(id)) {
    return next(
      new AppError("Friend request cannot be sent since friend exist", 400)
    );
  }

  // Check if a friend request already exists
  if (
    user.friend_requests.some(
      (request) => request.sent_by.toString() === req.user.id
    )
  ) {
    return next(new AppError("Friend request already sent", 400));
  }

  // Add friend request to recipient's friend_requests field
  user.friend_requests.push({
    sent_by: req.user.id,
    sent_at: new Date(Date.now()),
  });
  // Add friend request to sender's friend_requests field and marking isSent true
  currUser.friend_requests.push({
    sent_by: id,
    sent_at: new Date(Date.now()),
    isSent: true,
  });

  const notification = new Notification({
    category: "Friend Request",
    sent_by: currUser,
    sent_at: new Date(Date.now()),
    url: "/",
  });

  user.notifications.push(notification);

  await notification.save();
  await user.save();
  await currUser.save();

  res.status(200).json({
    msg: "OK",
  });
});

// Accept a friend request
const acceptFriendRequest = catchAsync(async (req, res, next) => {
  const id = req.params.friendId;
  const sender = await User.findById(id);
  const user = await User.findById(req.user._id);

  if (!sender) {
    return next(new AppError("User Does not exist", 404));
  }

  const request = user.friend_requests.find(
    (request) => request.sent_by.toString() === id && request.isSent === false
  );
  if (!request) {
    return next(
      new AppError("Request does not exist or has already been accepted", 404)
    );
  }

  // Add to friends list
  user.friends.push(id);
  sender.friends.push(req.user.id);

  // Remove the friend request
  user.friend_requests = user.friend_requests.filter(
    (request) => request.sent_by.toString() !== id
  );

  sender.friend_requests = sender.friend_requests.filter(
    (request) => request.sent_by.toString() !== req.user.id
  );

  // Save both users with validateBeforeSave set to false
  await user.save();
  await sender.save();

  res.status(200).json({
    msg: "OK",
  });
});

// Decline a friend request
const declineFriendRequest = catchAsync(async (req, res, next) => {
  const id = req.params.friendId;

  const sender = await User.findById(id);
  const user = await User.findById(req.user._id);

  if (!sender) {
    return next(new AppError("User does not exist", 404));
  }

  if (
    !user.friend_requests.some((request) => request.sent_by.toString() === id)
  ) {
    return next(new AppError("This request does not exist", 404));
  }

  // Remove the friend request
  user.friend_requests = user.friend_requests.filter(
    (request) => request.sent_by.toString() !== id
  );
  sender.friend_requests = sender.friend_requests.filter(
    (request) => request.sent_by.toString() !== req.user.id
  );

  // Save the user with validateBeforeSave set to false
  await user.save();
  await sender.save();

  res.status(200).json({
    msg: "OK",
  });
});

const unFriend = catchAsync(async (req, res, next) => {
  const id = req.params.friendId;

  if (!id) {
    return next(
      new AppError("Please provide User Id of the friend to remove", 400)
    );
  }

  const user = await User.findById(req.user._id);
  const friend = await User.findById(id);

  if (!friend) {
    return next(new AppError("Friend not found", 404));
  }

  // Check if they are friends
  if (!user.friends.includes(id)) {
    return next(new AppError("You are not friends with this user", 400));
  }

  // Remove friend from both users' friend lists
  user.friends = user.friends.filter((friendId) => friendId.toString() !== id);
  friend.friends = friend.friends.filter(
    (friendId) => friendId.toString() !== req.user._id.toString()
  );

  // Save both users with validateBeforeSave set to false
  await user.save();
  await friend.save();

  res.status(200).json({
    msg: "OK",
  });
});

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  unFriend,
};
