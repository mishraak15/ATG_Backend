const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/user");
const Post = require("../models/post");
const Notification = require("../models/notification");
const Comment = require("../models/comment");

const addNewPost = catchAsync(async (req, res, next) => {
  const { userid } = req.params;
  const { newPostText, postCategory } = req.body;

  if (!userid || (!newPostText && typeof req.file === "undefined")) {
    return next(
      new AppError(
        "Post should be posted by a  user , Post should have some text or image",
        400
      )
    );
  }

  let currUser = await User.findById(userid).populate("friends");

  if (!currUser) {
    return next(new AppError("User not found", 404));
  }

  if (newPostText?.length > 500) {
    return next(new AppError("Text should be within 500 characters", 400));
  }

  const newPost = new Post({
    created_by: currUser,
    created_at: new Date(Date.now()),
    post_text: newPostText,
    category: postCategory,
  });

  if (typeof req.file != "undefined") {
    newPost.post_img = {
      filename: req.file.filename || "ATG_Post_Img",
      url: req.file.path,
    };
  }

  await newPost.save();

  const notification = new Notification({
    category: "Posted",
    sent_by: currUser,
    sent_at: new Date(Date.now()),
    url: `/post/${newPost?.id}`,
  });

  const friends = currUser?.friends;

  friends.forEach(async (f) => {
    await User.findByIdAndUpdate(f?.id, {
      $push: { notifications: notification },
    });
  });

  await notification.save();

  currUser.posts.push(newPost);
  await currUser.save();

  res.status(200).json({ msg: "OK" });
});

const getPosts = catchAsync(async (req, res, next) => {
  // const { userid } = req.params;
  //  Actual me us user ke saare friends ki post aur fir sort created_at
  let posts = await Post.find({})
    .populate("created_by")
    .populate("comments")
    .populate("likes");

  posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.status(200).json({ msg: "OK", posts });
});

const addToSavedPost = catchAsync(async (req, res, next) => {
  const { userid } = req.params;
  const { postid } = req.body;

  if (!userid || !postid) {
    return next(new AppError("User is must , Post is must", 400));
  }

  let post = await Post.findById(postid);

  if (!post) {
    return next(new AppError("Invalid Post", 400));
  }

  let currUser = await User.findById(userid).populate("saved");

  if (!currUser) {
    return next(new AppError("User not found", 404));
  }

  let flag = 0;
  currUser?.saved?.forEach((s) => {
    if (s.id === postid) {
      flag = 1;
    }
  });

  if (flag === 1) {
    return res.status(200).json({ msg: "Already Saved" });
  }

  await User.findByIdAndUpdate(userid, {
    $push: { saved: post },
  });

  res.status(200).json({ msg: "OK" });
});

const addToFavorites = catchAsync(async (req, res, next) => {
  const { userid } = req.params;
  const { postid } = req.body;

  if (!userid || !postid) {
    return next(new AppError("User is must , Post is must", 400));
  }

  let post = await Post.findById(postid);

  if (!post) {
    return next(new AppError("Invalid Post", 400));
  }

  let currUser = await User.findById(userid).populate("favorites");

  if (!currUser) {
    return next(new AppError("User Not Found", 404));
  }

  let flag = 0;
  currUser?.favorites?.forEach((s) => {
    if (s.id === postid) {
      flag = 1;
    }
  });

  if (flag === 1) {
    return res.status(200).json({ msg: "Already in Favorites" });
  }

  await User.findByIdAndUpdate(userid, {
    $push: { favorites: post },
  });

  res.status(200).json({ msg: "OK" });
});

const fetchSavedPost = catchAsync(async (req, res, next) => {
  const { userid } = req.params;

  if (!userid) {
    return next(new AppError("User is must", 400));
  }

  let currUser = await User.findById(userid).populate({
    path: "saved",
    populate: [
      {
        path: "created_by",
        select: "created_at username profile_photo",
      },
      {
        path: "comments",
      },
      {
        path: "likes",
        select: "id",
      },
    ],
  });

  if (!currUser) {
    return next(new AppError("User Not Found", 404));
  }

  let saved = currUser.saved;

  res.status(200).json({ msg: "OK", saved });
});

const fetchFavorites = catchAsync(async (req, res, next) => {
  const { userid } = req.params;

  if (!userid) {
    return next(new AppError("User is must", 400));
  }

  let currUser = await User.findById(userid).populate({
    path: "favorites",
    populate: [
      {
        path: "created_by",
        select: "created_at username profile_photo",
      },
      {
        path: "comments",
      },
      {
        path: "likes",
        select: "id",
      },
    ],
  });

  if (!currUser) {
    return next(new AppError("User Not Found", 404));
  }

  let favorites = currUser.favorites;

  res.status(200).json({ msg: "OK", favorites });
});

const checkStatus = catchAsync(async (req, res, next) => {
  const { userid } = req.params;

  if (!userid) {
    return next(new AppError("User is must", 400));
  }

  let currUser = await User.findById(userid);

  if (!currUser) {
    return next(new AppError("User Not Found", 404));
  }
  if (currUser.active) {
    res.status(200).json({ msg: "OK" });
  } else {
    res.status(200).json({ msg: "Not Active" });
  }
});

const fetchUserData = catchAsync(async (req, res, next) => {
  const { userid } = req.params;

  if (!userid) {
    return next(new AppError("User is must", 400));
  }

  let currUser = await User.findById(userid)
    .populate({
      path: "posts",
      populate: [
        {
          path: "created_by",
          select: "username profile_photo",
        },
        {
          path: "likes",
          select: "_id",
        },
        {
          path: "comments",
        },
      ],
    })
    .populate("friend_requests friends");

  if (!currUser) {
    return next(new AppError("User Not Found", 404));
  }

  currUser?.posts?.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  res.status(200).json({ msg: "OK", user: currUser });
});

const fetchFriendRequests = catchAsync(async (req, res, next) => {
  const { userid } = req.params;

  if (!userid) {
    return next(new AppError("User is must", 400));
  }

  let fr = await User.findById(userid)
    .populate({
      path: "friend_requests",
      populate: "sent_by",
    })
    .select("friend_requests");

  fr = fr?.friend_requests.filter((f) => f.isSent !== true);

  fr.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

  res.status(200).json({ msg: "OK", friendRequests: fr });
});

const fetchNotifications = catchAsync(async (req, res, next) => {
  const { userid } = req.params;

  if (!userid) {
    return next(new AppError("User is must", 400));
  }

  let user = await User.findById(userid).populate({
    path: "notifications",
    populate: "sent_by",
  });

  if (!user) {
    return next(new AppError("User not found!", 404));
  }

  let notifications = user?.notifications.sort(
    (a, b) => new Date(b.sent_at) - new Date(a.sent_at)
  );

  res.status(200).json({ msg: "OK", notifications });
});

const fetchFriends = catchAsync(async (req, res, next) => {
  const { userid } = req.params;

  if (!userid) {
    return next(new AppError("User is must", 400));
  }

  let user = await User.findById(userid).populate("friends");

  if (!user) {
    return next(new AppError("User not found!", 404));
  }

  let friends = user?.friends;

  res.status(200).json({ msg: "OK", friends });
});

const removeFromFavorites = catchAsync(async (req, res, next) => {
  const { userid } = req.params;
  const { postid } = req.body;

  if (!userid) {
    return next(new AppError("User is must", 400));
  }

  if (!postid) {
    return next(new AppError("Post is must", 400));
  }

  await User.findByIdAndUpdate(userid, {
    $pull: { favorites: postid },
  });

  res.status(200).json({ msg: "OK" });
});

const removeFromSaved = catchAsync(async (req, res, next) => {
  const { userid } = req.params;
  const { postid } = req.body;

  if (!userid) {
    return next(new AppError("User is must", 400));
  }

  if (!postid) {
    return next(new AppError("Post is must", 400));
  }

  await User.findByIdAndUpdate(userid, {
    $pull: { saved: postid },
  });

  res.status(200).json({ msg: "OK" });
});

const editUser = catchAsync(async (req, res, next) => {
  const { userid } = req.params;
  const { editedData } = req.body;

  if (!userid) {
    return next(new AppError("User is must", 400));
  }

  let comments = await Comment.find({ creator_id: userid });

  await User.findByIdAndUpdate(
    userid,
    {
      username: editedData?.username,
      name: editedData?.fullname,
      dob: editedData?.dob,
      mobile_no: editedData?.mobile_no,
      gender: editedData?.gender,
      bio: editedData?.bio,
    },
    { runValidators: true }
  );

  let user = await User.findById(userid);

  if (typeof req?.files["editedData[background_photo]"] !== "undefined") {
    user.background_photo = {
      filename:
        req?.files["editedData[background_photo]"][0].filename ||
        "ATG_Post_Img",
      url: req?.files["editedData[background_photo]"][0].path,
    };
  }

  if (typeof req?.files["editedData[profile_photo]"] !== "undefined") {
    user.profile_photo = {
      filename:
        req?.files["editedData[profile_photo]"][0].filename || "ATG_Post_Img",
      url: req?.files["editedData[profile_photo]"][0].path,
    };
  }

  await user.save();

  // For changing image in the comments
  comments.forEach(async (comment) => {
    comment.creator_name = editedData?.username;
    if (typeof req?.files["editedData[profile_photo]"] !== "undefined") {
      comment.creator_profile_photo = {
        filename:
          req?.files["editedData[profile_photo]"][0].filename || "ATG_Post_Img",
        url: req?.files["editedData[profile_photo]"][0].path,
      };
    }
    await comment.save();
  });

  res.status(200).json({ msg: "OK" });
});

module.exports = {
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
};
