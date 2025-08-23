class User {
  constructor(data) {
    if (data.id) this.id = data.id;
    if (data.name) this.name = data.name;
    if (data.username) this.username = data.username;
    if (data.type) this.type = data.type;
    if (data.branch_id) this.branch_id = data.branch_id;
    if (data.role_id) {
      this.role_id = data.role_id;
      if (!data.role_assignor) throw new Error("'role_assignor' is required field");
      this.role_assignor = data.role_assignor;
      this.role_assigned_at = new Date().toISOString();
    }
    if (data.status) this.status = data.status;
  }
}

export default User;
