import Validator from "k-utilities/validator.js";
import { schema, allFields } from "../config/sql-schema.js";

export default class DBValidator {
  static schema = schema;
  static allFields = allFields;
  static sqlOperators = ["IS", "=", "!=", ">", "<", "IN", "LINK"];
  static decodes = { "&lt;": "<" };

  static removeImmutableFields(entity, data, ignoredFields = []) {
    const fields = schema[entity].fields;
    Object.keys(fields).forEach((f) => fields[f].immutable && !ignoredFields.includes(f) && delete data[f]);
    return data;
  }

  static validateFields(fields) {
    return (Array.isArray(fields) ? fields : [fields]).filter((f) => !allFields.includes(f));
  }

  static validateData(entity, data) {
    data = Array.isArray(data) ? data : [data];
    const fields = this.schema[entity].fields;

    for (const item of data) {
      for (const field in item) {
        if (!fields[field]) return `BAD_REQUEST-Invalid field name ${field}`;
        else {
          let [operator, value] = (item[field] + "")?.split("::");

          if (!value) {
            item[field] = value = operator;
            operator = null;
          } else {
            operator = this.decodes[operator] || operator;
            item[field] = { operator, value };
          }

          if (item[field].value && !this.sqlOperators.includes(operator)) {
            return "BAD_REQUEST-Invalid logic operator";
          }
          if (value == "NULL" || value == "NOT NULL" || ["FALSE", "TRUE"].includes(value)) {
            if (value.includes("NULL")) item[field] = { operator: "IS", value };
            else item[field] = value; // ignore the rest
            continue;
          }

          value.split(",").forEach((v, i) => {
            const [type, length] = fields[field].type.split("-");
            const number = Validator.isNumber(v);
            const string = Validator.isString(v);

            if ((field == "id" && (number || string)) || field == "deleted_at") return;
            if (
              (type == "number" && !number) ||
              (type == "date" && !Validator.isDate(v)) ||
              (type == "boolean" && !(v == "true" || v == "false" || type.includes(typeof v))) ||
              (type == "string" && !string && !number)
            ) {
              return `400-Invalid value, '${field}' must be ${type}`;
            }
          });
        }
      }
    }
  }
}
