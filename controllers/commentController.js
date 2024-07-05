const Comment = require("../models/comment");
const Post = require("../models/post");
const User = require("../models/user");
const catchAsync = require("../utils/catchAsync");
const cloudinary = require("cloudinary").v2;

const likeComment = catchAsync(async (req, res, next) => {
  const { commentid } = req.params;
  const { userid } = req.body;

  const comment = await Comment.findById(commentid);
  const user = await User.findById(userid);

  if (!comment) {
    return next(new AppError("Comment Not Found!!!", 404));
  }

  if (!user) {
    return next(new AppError("User Not Valid!!", 400));
  }

  if (comment?.likes?.includes(userid)) {
    return next(new AppError("Already Liked the Comment!!", 400));
  }

  comment?.likes?.push(user);

  await comment.save();

  res.status(200).json({
    msg: "OK",
  });
});

const unlikeComment = catchAsync(async (req, res, next) => {
  const { commentid } = req.params;
  const { userid } = req.body;

  const comment = await Comment.findById(commentid).populate("likes");

  if (!comment) {
    return next(new AppError("Comment Not Found!!!", 404));
  }

  // if (!comment?.likes?.includes(userid)) {
  //   return next(new AppError("Invalid Action!!", 404));
  // }

  await Comment.findByIdAndUpdate(commentid, { $pull: { likes: userid } });

  res.status(200).json({
    msg: "OK",
  });
});

const deleteComment = catchAsync(async (req, res, next) => {
  const { commentid } = req.params;

  let comment = await Comment.findById(commentid).populate("created_on");

  if (!comment) {
    return next(new AppError("Comment Not Found!!!", 404));
  }
  let postid = comment?.created_on?._id;

  await Post.findByIdAndUpdate(postid, { $pull: { comments: commentid } });

  await Comment.findByIdAndDelete(commentid);

  if (comment?.comment_img?.url) {
    const imgId = comment.comment_img?.url.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(imgId);
  }

  res.status(200).json({
    msg: "OK",
  });
});

module.exports = { likeComment, unlikeComment, deleteComment };
