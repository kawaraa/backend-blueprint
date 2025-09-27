class User {
  constructor(data) {
    if (data.id) this.id = data.id;
    if (data.type) this.type = data.type;
    if (data.name) this.name = data.name;
    if (data.username) this.username = data.username;
    if (data.status) this.status = data.status;
    if (data.group_ids) this.group_ids = data.group_ids;
    if (data.role_id) {
      this.role_id = data.role_id;
      if (!data.role_assignor) throw new Error("'role_assignor' is required field");
      this.role_assignor = data.role_assignor;
      this.role_assigned_at = new Date().toISOString();
    }
  }
}

export default User;
