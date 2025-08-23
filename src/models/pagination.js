import { validateFields } from "../utils/validators/sql-query-validator.js";
const directions = ["ASC", "DESC"];

class Pagination {
  constructor(query) {
    const orderby = validateFields(query.orderby).length < 1 ? query.orderby : "created_at";
    const direction = query.sort?.toUpperCase();
    const page = parseInt(query.page) || 0;

    this.orderby = ` ${orderby} ${directions.includes(direction) ? direction : directions[1]}`;
    this.limit = parseInt(query.limit) || 20;
    this.offset = (page < 1 ? page : page - 1) * this.limit;
  }
}

// function val
export default Pagination;
