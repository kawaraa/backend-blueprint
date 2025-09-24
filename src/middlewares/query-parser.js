import Pagination from "../models/pagination.js";
import db from "../utils/db-validator.js";

const queryParser = (req, res, next) => {
  req.pagination = new Pagination(req.query);
  delete req.query.orderby;
  delete req.query.sort;
  delete req.query.page;
  delete req.query.limit;
  delete req.query.offset;

  // Map the fields to it's  entity, E.g. query?tables=table1,table2&created_at=>::2024-01-01
  // validate input, db.validateData

  next();
};

export default queryParser;
