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
  const id = params.id;
  const parentId = result.data[0]?.parent_id;

  if (!user?.role_id) return result;

  const permissions = await db.query("SELECT code FROM  permission WHERE role_id = ?", [user?.role_id]);
  if (permissions.length < 1) return result;

  const { parent, rule, fields } = db.validator.schema[entity];
  const codes = new Set(permissions.map(({ code }) => code));
  result.superuser = codes.has("*:*:*:*");

  result.data.forEach((item) => {
    if (action == "add") {
      if (item.parent_id) item.parent_id = parentId;
      if (rule == "user" && parent == "users") item.parent_id = user.id;
      if (fields["branch_id"]) item.branch_id = user.branch_id;
      item.created_by = user.id;
    }
  });

  if (result.superuser || rule == "allUsers") {
    result.permitted = true;
    return result;
  }

  if (rule == "user") {
    result.permitted = true;
    if (action != "add") result.params.created_by = user.id;
    return result;
  }

  if (rule == "branch") {
    if (codes.has(`${action}:${entity}:*:*`)) {
      result.permitted = true;

      if (entity == "branch") {
        if (action != "add") result.params.created_by = user.id;
        return result;
      }
      if (fields["branch_id"]) action != "add" && (result.params.branch_id = user.branch_id);
      else result.permitted = await checkBranch(user.branch_id, parentId, entity, id);
      return result;
      //
    } else if (codes.has(`${action}:${entity}:self:*`)) {
      result.permitted = true;

      if (action != "add") result.params.created_by = user.id;
      if (!user.type || user.type == "NORMAL") {
        if (entity == "users" && action == "add") result.permitted = false;
        return result;
      }

      if (entity == "branch") return result;

      if (fields["branch_id"]) action != "add" && (result.params.branch_id = user.branch_id);
      else result.permitted = await checkBranch(user.branch_id, parentId, entity, id);
      return result;
      //
    } else if (codes.has(`${action}:${entity}:*:`)) {
      if (action == "add" || action == "delete") return result;

      result.fields = Object.keys(fields).filter((f) => codes.has(`${action}:${entity}:*:${f}`));

      if (entity == "branch") {
        result.params.created_by = user.id;
        result.permitted = true;
        return result;
      }
      if (fields["branch_id"]) {
        result.params.branch_id = user.branch_id;
        result.permitted = true;
      } else {
        result.permitted = await checkBranch(user.branch_id, parentId, entity, id);
      }
      return result;
    }

    return result;
  }
}

export async function checkBranch(userBranchId, parentId, entity, id) {
  return !((!parentId && !id) || (await db.getBranchId(parentId, entity, id)) != userBranchId);
}
