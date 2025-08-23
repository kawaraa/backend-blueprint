class Permission {
  constructor(data) {
    if (data.role_id) this.role_id = data.role_id;
    if (data.code) this.code = data.code;
    if (data.description) this.description = data.description;
    if (data.created_by) this.created_by = data.created_by;
  }
}

export default Permission;
