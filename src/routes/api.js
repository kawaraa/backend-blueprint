// src/routes/index.js
import express from "express";
import defaultSubRoutes from "./default.js";
import DefaultController from "../controllers/default.js";

const routePaths = ["role", "permission", "users", "branch", "department", "translation"];

// Additional global middleware or routes can be defined here

async function loadModule(path, fallback) {
  try {
    return (await import(path))?.default || fallback;
  } catch (err) {
    if (!/cannot\s+find/gim.test(err.message)) console.warn(`Failed to load module "${path}":`, err.message);
    return fallback;
  }
}

async function addRoutes(router) {
  for (const routePath of routePaths) {
    const entity = routePath.replaceAll("-", "_").toLowerCase();
    const subRoutes = await loadModule(`./${routePath}.js`, defaultSubRoutes);
    const Controller = await loadModule(`../controllers/${routePath}.js`, DefaultController);
    router.use(`/${routePath}`, subRoutes(new Controller(entity)));
  }
  return router;
}

export default await addRoutes(express.Router());
