import { StatusCodes } from "http-status-codes";

// Express identifies an error-handling middleware by the presence of all four arguments. Without next, it won't be treated as a middleware.
const errorHandlerMiddleware = (error, req, res, next) => {
  console.log("errorHandlerMiddleware:", req.url, error);

  const [type, msg] = (error?.message || error || "").split("-");
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Internal Server Error";

  if (!isNaN(+type)) {
    statusCode = +type;
    message = msg;
  } else if (type == "FORBIDDEN") {
    statusCode = StatusCodes.FORBIDDEN;
    message = "Insufficient permission";
  } else {
    const code = StatusCodes[type];
    if (code) {
      statusCode = code;
      message = msg || type?.toLowerCase();
    }
  }

  res.status(statusCode).json({ message });
};

export default errorHandlerMiddleware;
