# Project Source Code folders and files structure

Structuring the folders and files in your backend project is crucial for maintaining a clean and organized codebase. While there's no one-size-fits-all solution, a well-thought-out structure makes it easier for developers to understand, maintain, and scale the application. Here's a common approach for structuring a backend project

### Root Directory:

- **config:** Configuration files for your application (database configurations, environment variables, etc.).
- **scripts:**
  Utility and Deployment scripts or Scripts for automation or any utility scripts like A script that cleans up or transforms data in your database or other scripts that provide utility functions or perform specific tasks that don't neatly fit into the main application logic. Examples include:

  - **build:** Build scripts and configurations such as compiling TypeScript.
  - **deploy:** Deployment scripts and configurations like script that automates the deployment process, including tasks like code deployment etc.
  - **db:**
    - **migrations:** Database migration scripts and backup scripts.
    - **seed:** Database Seeding Script to seed data for the database, A script that populates your database with initial data for testing or development purposes.

- **src:**
  - **api:** Define your API routes and controllers here.
  - **models:** Database models and schema definitions.
  - **views / services:** Business logic and application services. In a backend application, the _view_ layer is often replaced with a service layer or response generation logic. This layer is responsible for formatting responses sent to clients, such as JSON data in RESTful APIs or rendered HTML in server-side rendered applications.
  - **middlewares:** Custom middleware functions.
  - **utils:** Utility functions that can be used across the application.
  - **routes:** Organize your route definitions.
  - **controllers:** Handle request and response logic.
  - **validators:** Input validation logic.
  - **config:** Application-specific configurations.
  - **index.js:** Entry point of your application.
  - **app.js:** Express or main application setup.
- **tests:** Organize your unit tests, integration tests, and end-to-end tests.
- **docs:** API documentation or any other relevant documentation.
- **env:** Environment-specific configuration files.
  configurations.
- **logs:** Application logs.

### Tips:

- **Modularity:** Break down your application into modules based on functionality.
- **Consistency:** Be consistent with naming conventions and structure throughout the project.
- **Separation of Concerns:** Keep concerns separated. For example, separate route definitions from business logic.
- **Scalability:** Plan for scalability from the beginning. A good structure accommodates the growth of your project.
- **Keep It Simple:** Avoid overengineering. Keep the structure simple and adjust it as needed.

## (Important)

**RBAC declaration syntax should be like this: {endpoint:rule}**

- `{users:superuser}` mean only the superuser can see and update all users
- `{contact:user}` mean the superuser and the user who created it can see and update the contact
- `{input-field:branch}` mean is the superuser or users with type ADMIN in the same branch can see and update the input_field
- `{translation:allUsers}` mean all logged in users can see and only the superuser can update the translation
- `{product:public}` mean it's public and just the superuser and the user who created it can see and update the product
