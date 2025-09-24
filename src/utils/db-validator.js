import Validator from "k-utilities/validator.js";
import { schema, allFields } from "../config/sql-schema.js";

export default class DBValidator {
  static schema = schema;
  static allFields = allFields;
  static sqlOperators = ["IS", "=", "!=", ">", "<", "IN", "LINK"];
  static decodes = { "&lt;": "<" };

  static removeImmutableFields(entity, data) {
    const fields = schema[entity].fields;
    Object.keys(fields).forEach((f) => fields[f].immutable && delete data[f]);
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
          let value = (item[field] + "")?.split("::");
          let operator = "";
          if (value.length < 2) value = value[0];
          else {
            operator = this.decodes[value[0]] || value[0];
            value = value[1];
            item[field] = { operator, value };
          }

          if (operator && !this.sqlOperators.includes(operator)) return "BAD_REQUEST-Invalid logic operator";
          if (value == "NULL" || value == "NOT NULL") continue;

          const [type, length] = fields[field].type.split("-");
          const number = Validator.isNumber(value);
          const string = Validator.isString(value);

          if (field == "id" && (number || string)) continue;
          if (
            (type == "number" && !number) ||
            (type == "date" && !Validator.isDate(value)) ||
            (type == "boolean" && !(value == "true" || value == "false" || type.includes(typeof value))) ||
            (type == "string" && !string && !number) ||
            (type == "buffer" && !Buffer.isBuffer(value))
          ) {
            return `400-Invalid value, '${field}' must be ${type}`;
          }
        }
      }
    }
  }
}
