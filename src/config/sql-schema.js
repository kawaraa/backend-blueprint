import { access, readFileSync } from "node:fs";
import path from "node:path";
import Normalizer from "k-utilities/normalizer.js";
const scriptPath = path.resolve("scripts/database/schema.sql");

function extractSchema(sqlScriptLines) {
  // The string contains only lowercase letters (a-z) and underscores (_):
  const isField = (field) => field && /^[a-z_]+$/.test(field);
  const numberRegEx = /INTEGER|FLOAT|SERIAL|SMALLINT/gim;
  const dateRegEx = /DATE|TIMESTAMP/gim;
  const schema = {};
  let entity = null;

  sqlScriptLines.forEach((line) => {
    if (!line.startsWith("--") && line.includes("CREATE TABLE")) {
      const [part1, part2] = line.split("(");
      entity = part1.trim().split(" ").at(-1);
      const [endpoint, rule, parent] = part2?.split("{")[1]?.split("}")[0]?.split(":") || []; // if accessible via API
      if (endpoint) schema[entity] = { endpoint, public: false, rule, parent, fields: {} };
      return;
    }

    if (!entity || !schema[entity]?.endpoint || line.includes("hidden")) return;

    const field = line.trim().split(" ")[0].trim() || null;
    let type = "";
    const defaultType = "string-250";

    if (field && isField(field)) {
      if (field == "public") schema[entity].public = true;
      const length = Normalizer.extractNumbers(line);
      // if (field=="id") type = "string-150";
      // else if (line.includes("VARCHAR")) type = "string";
      // else if (line.includes("TEXT")) type = "string";
      if (line.match(numberRegEx)) type = "number";
      else if (line.match(dateRegEx)) type = "date";
      else if (line.includes("BOOLEAN")) type = "boolean";
      else if (line.includes("BYTEA")) type = "buffer";
      else if (line.includes("enum")) type = "enum";

      type = !type ? defaultType : type + (!length ? "" : `-${length}`);
      const immutable = line.includes("immutable");

      schema[entity].fields[field] = { type, immutable };
    }
  });

  return schema;
}

function getAllFields(schema) {
  const allFields = Object.keys(schema).flatMap((entity) => Object.keys(schema[entity].fields));
  return Array.from(new Set(allFields));
}

export const schema = extractSchema(readFileSync(scriptPath, "UTF-8").split("\n"));
export const allFields = getAllFields(schema);
