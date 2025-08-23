import Pagination from "../models/pagination.js";

const paginationParser = (req, res, next) => {
  req.pagination = new Pagination(req.query);
  delete req.query.orderby;
  delete req.query.sort;
  delete req.query.page;
  delete req.query.limit;
  delete req.query.offset;
  next();
};

export default paginationParser;
