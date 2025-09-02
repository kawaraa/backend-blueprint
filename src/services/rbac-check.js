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
  const result = { permitted: false, data: [], params, fields: [], superuser: false };
  const id = params.id;
  const parentId = action == "add" ? data[0]?.parent_id : null;

  if (!user?.role_id) return result;

  const permissions = await db.query("SELECT code FROM  permission WHERE role_id = ?", [user?.role_id]);
  if (permissions.length < 1) return result;

  const { parent, rule, fields } = db.validator.schema[entity];
  const codes = new Set(permissions.map(({ code }) => code));
  result.superuser = codes.has("*:*:*:*");

  data = data.forEach((item) => {
    if (action == "add") {
      if (item.parent_id) item.parent_id = parentId;
      if (rule == "user" && parent == "users") item.parent_id = user.id;
      if (fields["branch_id"]) item.branch_id = user.branch_id;
      item.created_by = user.id;
    }
  });

  if (result.superuser || rule == "allUsers") {
    result.data = data;
    result.permitted = true;
    return result;
  }

  if (rule == "user") {
    result.data = data;
    result.permitted = true;

    if (action != "add") {
      result.params.created_by = user.id;
      if (parent) result.params.parent_id = user.id;
      // if (fields["branch_id"]) result.params.branch_id = user.branch_id;
    }
    return result;
  }

  if (rule == "branch") {
    if (codes.has(`${action}:${entity}:*:*`)) {
      result.data = data;
      result.permitted = true;

      if (fields["branch_id"]) action != "add" && (result.params.branch_id = user.branch_id);
      else result.permitted = await checkBranch(user.branch_id, parentId, entity, id);
      return result;
      //
    } else if (codes.has(`${action}:${entity}:self:*`)) {
      result.data = data;
      result.permitted = true;

      if (action != "add") result.params.created_by = user.id;
      if (fields["branch_id"]) action != "add" && (result.params.branch_id = user.branch_id);
      else result.permitted = await checkBranch(user.branch_id, parentId, entity, id);
      return result;
      //
    } else if (codes.has(`${action}:${entity}:*:`)) {
      if (action == "add" || action == "delete") return result;

      result.fields = Object.keys(fields).filter((f) => codes.has(`${action}:${entity}:*:${f}`));

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
