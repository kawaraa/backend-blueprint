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
  const result = { permitted: false, data, params, fields: [], superuser: false };

  if (!user?.role_id) return result;
  if (!Array.isArray(result.data)) result.data = [result.data];

  const permissions = await db.getAll("SELECT code FROM  permission WHERE role_id = ?", [user?.role_id]);
  if (permissions.length < 1) return result;

  const { parent, rule, fields } = db.validator.schema[entity];
  const codes = new Set(permissions.map(({ code }) => code));
  const hasPermission =
    codes.has(`${action}:${entity}:*:*`) ||
    codes.has(`${action}:${entity}:self:*`) ||
    codes.has(`${action}:${entity}:*:`);

  result.superuser = codes.has("*:*:*:*");

  result.data.forEach((item) => {
    if (action == "add") {
      if (rule == "user" && parent == "users") item.user_id = user.id;
      item.created_by = user.id;
    }
  });

  if (result.superuser) {
    result.permitted = true;
    return result;
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

  result.permitted = hasPermission;
  if (action != "add") result.params.user_id = user.id;
}
