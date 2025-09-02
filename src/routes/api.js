// src/routes/index.js
import express from "express";
import defaultSubRoutes from "./default.js";
import DefaultController from "../controllers/default.js";
import { schema } from "../config/sql-schema.js";

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
  for (const entity in schema) {
    const path = schema[entity].endpoint;
    const subRoutes = await loadModule(`./${path}.js`, defaultSubRoutes);
    const Controller = await loadModule(`../controllers/${path}.js`, DefaultController);
    router.use(`/api/${path}`, subRoutes(new Controller(entity), schema[entity].public));
  }

  return router;
}

export default await addRoutes(express.Router());
