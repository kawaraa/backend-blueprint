import { readFileSync } from "node:fs";
import Normalizer from "k-utilities/normalizer.js";
import Validator from "k-utilities/validator.js";
import path from "node:path";
const immutableFields = jsonRequire("src/config/immutable-fields.json");
const scriptPath = path.resolve("database/schema.sql");

export const columns = extractColumn(readFileSync(scriptPath, "UTF-8").split("\n"));

export function removeImmutableFields(data, leaveId) {
  (leaveId ? immutableFields.filter((f) => f != "id") : immutableFields).forEach((f) => delete data[f]);
  return data;
}

export function validateFields(columnsNames) {
  if (!Array.isArray(columnsNames)) columnsNames = [columnsNames];
  return columnsNames.filter((col) => !columns[col]);
}

export function validateData(data) {
  data = Array.isArray(data) ? data : [data];
  for (const item of data) {
    for (const field in item) {
      if (!columns[field]) return `400-Invalid field name ${field}`;
      else {
        const [type, length] = columns[field].split("-");
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

function extractColumn(lines) {
  // The string contains only lowercase letters (a-z) and underscores (_):
  const isField = (field) => field && /^[a-z_]+$/.test(field);
  const numberRegEx = /INTEGER|FLOAT|SERIAL|SMALLINT/gim;
  const dateRegEx = /DATE|TIMESTAMP/gim;
  const filteredColumns = {};

  lines.forEach((sqlScriptLine) => {
    const field = sqlScriptLine.trim().split(" ")[0].trim() || null;
    let type = "";

    if (field && isField(field)) {
      const length = Normalizer.extractNumbers(sqlScriptLine);
      // if (sqlScriptLine.includes("UUID")) type = "string-150";
      // else if (sqlScriptLine.includes("VARCHAR")) type = "string";
      // else if (sqlScriptLine.includes("TEXT")) type = "string";
      if (sqlScriptLine.match(numberRegEx)) type = "number";
      else if (sqlScriptLine.match(dateRegEx)) type = "date";
      else if (sqlScriptLine.includes("BOOLEAN")) type = "boolean";
      else if (sqlScriptLine.includes("BYTEA")) type = "buffer";
      else if (sqlScriptLine.includes("enum")) type = "enum";

      filteredColumns[field] = !type ? "string-250" : type + (!length ? "" : `-${length}`);
    }
  });

  return filteredColumns;
}
