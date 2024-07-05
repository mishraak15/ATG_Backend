const catchAsync = require("../utils/catchAsync");
const Post = require("../models/post");
const User = require("../models/user");
const Comment = require("../models/comment");
const Notification = require("../models/notification");
const cloudinary = require("cloudinary").v2;

const addLike = catchAsync(async (req, res, next) => {
  const { postid } = req.params;
  const { userid } = req.body;

  if (!userid || !postid) {
    return next(new AppError("UserId is must. , PostId is must.", 400));
  }

  let currUser = await User.findById(userid);

  if (!currUser) {
    return next(new AppError("User not found", 404));
  }

  await Post.findByIdAndUpdate(
    postid,
    { $push: { likes: currUser } },
    { runValidators: true }
  );

  let postOwner = await Post.findById(postid)
    .select("created_by")
    .populate("created_by");

  if (postOwner?.created_by?.id !== userid) {
    let notification = new Notification({
      category: "Liked",
      sent_by: currUser,
      sent_at: new Date(Date.now()),
      url: `/post/${postid}`,
    });

    await notification.save();

    await User.findByIdAndUpdate(postOwner.created_by, {
      $push: { notifications: notification },
    });
  }

  res.json({ msg: "OK" });
});

const removeLike = catchAsync(async (req, res, next) => {
  const { postid } = req.params;
  const { userid } = req.body;

  if (!userid || !postid) {
    return next(new AppError("UserId is must. , PostId is must.", 400));
  }

  // Remove notification
  await Post.findByIdAndUpdate(
    postid,
    { $pull: { likes: userid } },
    { runValidators: true }
  );

  res.json({ msg: "OK" });
});

const addComment = catchAsync(async (req, res, next) => {
  const { postid } = req.params;
  const { userid, newCommentText } = req.body;

  if (!userid || !postid) {
    return next(new AppError("UserId is must. , PostId is must.", 400));
  }

  if (!newCommentText && typeof req.file === "undefined") {
    return next(new AppError("Comment should have text or image.", 400));
  }

  if (newCommentText?.length > 200) {
    return next(new AppError("Comment should be within 500 characters", 400));
  }

  let currUser = await User.findById(userid);

  if (!currUser) {
    return next(new AppError("User not found", 404));
  }

  let newComment = new Comment({
    creator_id: userid,
    creator_profile_photo: currUser.profile_photo,
    creator_name: currUser.username,
    created_on: postid,
    created_at: new Date(Date.now()),
    comment_text: newCommentText,
  });

  if (typeof req.file != "undefined") {
    newComment.comment_img = {
      filename: req.file.filename || "ATG_Comment_Img",
      url: req.file.path,
    };
  }

  let post = await Post.findById(postid).populate("created_by");

  let owner = await User.findById(post?.created_by?._id);

  if (owner?.id !== userid) {
    const notification = new Notification({
      category: "Commented",
      sent_by: currUser,
      sent_at: new Date(Date.now()),
      url: `/post/${postid}`,
    });

    owner.notifications.push(notification);
    owner.save();
    notification.save();
  }

  await newComment.save();

  await Post.findByIdAndUpdate(postid, { $push: { comments: newComment } });

  res.json({ msg: "OK", comment: newComment });
});

const fetchPostData = catchAsync(async (req, res, next) => {
  const postId = req.params.postid;
  const post = await Post.findById(postId).populate(
    "created_by comments likes"
  );

  if (!post) {
    return next(new AppError("Post Not Found!!!", 404));
  }

  post.comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.status(200).json({
    msg: "OK",
    post,
  });
});

const deletePost = catchAsync(async (req, res, next) => {
  const { postid } = req.params;

  const post = await Post.findById(postid);

  if (!post) {
    return next(new AppError("Post Not Found!!!", 404));
  }

  if (post?.created_by?.toString() !== req?.user?._id.toString()) {
    return next(new AppError("Unauthorised Action", 401));
  }

  if (post?.post_img?.url) {
    const imgId = post.post_img?.url.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(imgId);
  }

  await Post.findByIdAndDelete(postid);
  await User.updateMany(
    {},
    { $pull: { posts: postid, saved: postid, favorites: postid } }
  );

  let deletedComments = await Comment.deleteMany({ created_on: postid });

  // function to delete all images of comment.

  // deletedComments.forEach(async (comm) => {
  //   if (comm?.comment_img?.url) {
  //     const commId = comm?.comment_img?.url.split("/").pop().split(".")[0];
  //     await cloudinary.uploader.destroy(commId);
  //   }
  // });

  res.status(200).json({
    msg: "OK",
  });
});

const fetchJobs = catchAsync(async (req, res, next) => {
  let { category } = req.params;
  let jobs;
  if (category === "all") {
    jobs = await Post.find({
      category: {
        $in: [
          "Web Development",
          "Content Writing",
          "Full Stack Development",
          "Marketing",
          "Designing",
          "SEO Optimization",
          "Data Entry",
        ],
      },
    })
      .populate("created_by")
      .populate("comments")
      .populate("likes");
  } else {
    jobs = await Post.find({
      category: category,
    })
      .populate("created_by")
      .populate("comments")
      .populate("likes");
  }

  jobs?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.status(200).json({
    msg: "OK",
    jobs,
  });
});

module.exports = {
  addLike,
  removeLike,
  addComment,
  fetchPostData,
  deletePost,
  fetchJobs,
};
