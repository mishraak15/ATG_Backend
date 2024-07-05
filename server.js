const express = require("express");
const app = express();
const mongoose = require("mongoose");
const userRoute = require("./routes/userRoute");
const postRoute = require("./routes/postRoute");
const homeRoute = require("./routes/homeRoute");
const commentRoute = require("./routes/commentRoute");
const friendRoute = require("./routes/friendRoute");
const globalErrorHandler = require("./controllers/errorController");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const AppError = require("./utils/appError");
const cors = require("cors");

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);

dotenv.config();

app.use(bodyParser.urlencoded({ limit: "10kb", extended: false }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.SERVER_PORT || 2800;
const ATLAS_URL = process.env.MONGO_ATLAS_URL;

async function main() {
  await mongoose.connect(ATLAS_URL);
}

main()
  .then(() => {
    console.log("Connected to Database Successfully");
  })
  .catch((err) => {
    console.log(err);
  });

app.use("/", homeRoute);
app.use("/user", userRoute);
app.use("/post", postRoute);
app.use("/friend", friendRoute);
app.use("/comment", commentRoute);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`App is listining at port: ${PORT}`);
});
