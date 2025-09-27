import Pagination from "../models/pagination.js";
// import DBValidator from "../utils/db-validator.js";

const queryParser = (req, res, next) => {
  req.pagination = new Pagination(req.query);
  delete req.query.orderby;
  delete req.query.sort;
  delete req.query.page;
  delete req.query.limit;
  delete req.query.offset;

  // Todo: the query validation can be moved to here, Also mapping the fields to it's  entity, E.g. query?tables=table1,table2&created_at=>::2024-01-01 will become {entity1:{field1:"",field2:""}

  next();
};

export default queryParser;
