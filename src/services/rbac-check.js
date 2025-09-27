// Role-Based Access Control check Permission Function
import db from "../providers/sqlite.js";

/**
 *** Role-Based Access Control check Permission Function ***
  permission code syntax: "action:entity:who:field"
  user: User object with id, role_id, branch_id
  action: One of: 'add', 'view', 'edit', 'delete'
  entity: The entity to check permissions for
  data: Array of objects to filter if needed
*/
export default async function checkPermission(user, action, entity, data = [], params = {}) {
  const result = { superuser: false, permitted: false, data, params, fields: [] };

  if (!user?.role_id) return result;
  if (!Array.isArray(result.data)) result.data = [result.data];

  const permissions = await db.getAll("SELECT code FROM  permission WHERE role_id = ?", [user?.role_id]);
  if (permissions.length < 1) return result;

  const { parent, rule, fields } = db.validator.schema[entity];
  const codes = new Set(permissions.map(({ code }) => code));
  const hasPermission = codes.has(`${action}:${entity}:*:`) || codes.has(`${action}:${entity}:self:*`);
  result.superuser = codes.has("*:*:*:*");

  let notPermitted = false;
  result.data.forEach((item) => {
    if (rule == "group" && fields.group_ids && !item.group_ids.every((id) => user.group_ids.includes(id))) {
      notPermitted = true;
    }
    if (action == "add") {
      if (rule == "user" && parent == "users") item.user_id = user.id;
      item.created_by = user.id;
    } else if (action == "edit") {
      Object.keys(item).filter((f) => codes.has(`edit:${entity}:*:${f}`) || delete item[f]);
    }
  });

  if (notPermitted) return result;

  if (result.superuser) {
    result.permitted = true;
    return result;
  }

  if (action == "view" && hasPermission && !codes.has(`${action}:${entity}:*:*`)) {
    result.fields =
      (params.fields?.trim() && params.fields.trim().split(",")) ||
      Object.keys(fields).filter((f) => codes.has(`${action}:${entity}:*:${f}`));
    delete result.params.fields;
  }

  if (rule == "allUsers") {
    result.permitted = action == "view" || hasPermission;
    return result;
  }

  if (rule == "user") {
    result.permitted = true;
    if (action != "add") {
      result.params.created_by = user.id;
      result.permitted = hasPermission;
    }
    return result;
  }

  let inTheSameGroup = action == "view" && user.group_ids.includes(params.group_ids);
  if (["edit", "delete"].includes(action)) {
    const data = (await db.getAll(db.generateQuery(entity, params, null, null, false)))[0];
    const key = data.group_ids ? "group_ids" : Object.keys(data).find((field) => field.includes("group_"));
    const itemGroupIds = data[key]?.split(",") || [];
    if (!itemGroupIds.some((id) => user.group_ids.includes(id))) inTheSameGroup = false;
  }
  result.permitted = user.groups_ids && inTheSameGroup && hasPermission;
}
