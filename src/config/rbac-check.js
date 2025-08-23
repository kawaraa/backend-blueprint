// Role-Based Access Control check Permission Function
import sqliteDB from "../providers/sqlite.js";

// permission syntax: "action:entity:who:field"
async function checkPermission(user, action, entity, data = []) {
  const result = { permitted: false, data: [], superuser: false };

  if (!user || !user.role_id) return result;

  const permissions = await sqliteDB.query(
    "SELECT permission.code FROM role JOIN permission ON role.id = permission.role_id WHERE role.id = $1",
    [user.role_id]
  );

  if (permissions.length < 1) return result;

  for (const { code } of permissions) {
    if (code == "*:*:*:*" || code == `${action}:${entity}:*:*`) {
      result.permitted = true;
      result.data = data;
      result.superuser = true;
      return result;
    }

    if (code == `${action}:${entity}:self:*`) {
      if (action == "delete") return result;
      if (action == "edit") {
        data = await sqliteDB.get(entity, "id", data[0].id, "id,created_by");
        if (!data[0] || data[0]?.created_by != user.id) return result;
      }

      const filteredData = data.filter((item) => item.created_by == user.id);
      result.permitted = data.length == filteredData.length;
      result.data = filteredData;
      return result;
    }

    if (code.includes(`${action}:${entity}:*:`)) {
      if (action == "add" || action == "delete") return result;

      const field = code.replace(`${action}:${entity}:*:`, "");
      const fields = Object.keys(data[0]);

      const filteredData = data.map((item) => {
        const newItem = {};
        fields.forEach((f) => f == field && (newItem[f] = item[f]));
        return newItem;
      });

      result.permitted = filteredData.every((item) => fields.length == Object.keys(item || {}).length);
      result.data = filteredData;
      return result;
    }
  }
  return result;
}

export default checkPermission;
