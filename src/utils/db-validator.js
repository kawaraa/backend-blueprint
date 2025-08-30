import Validator from "k-utilities/validator.js";
import { schema, allFields } from "./get-sql-schema.js";

export default class DBValidator {
  static schema = schema;
  static allFields = allFields;

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
        if (!fields[field]) return `400-Invalid field name ${field}`;
        else {
          const [type, length] = fields[field].type.split("-");
          const number = Validator.isNumber(item[field]);
          const string = Validator.isString(item[field]);

          if (field == "id" && (number || string)) return;
          if (
            (type == "number" && !number) ||
            (type == "date" && !Validator.isDate(item[field])) ||
            (type == "boolean" &&
              !(item[field] == "true" || item[field] == "false" || type.includes(typeof item[field]))) ||
            (type == "string" && !string) ||
            (type == "buffer" && !Buffer.isBuffer(item[field]))
          ) {
            return `400-Invalid value, '${field}' must be ${type}`;
          }
        }
      }
    }
  }
}
