import { Router } from "express";
import { listRules } from "../sanitizer/index.js";
import { getModels } from "../data/store.js";

const router = Router();

router.get("/", (req, res) => {
  const activeModels = getModels().filter((m) => m.active);

  const allowedModels = req.user?.allowedModels ?? [];
  const userDefaultModel = req.userModel || process.env.DEFAULT_PROVIDER || null;

  let filtered;
  if (allowedModels.length > 0) {
    filtered = activeModels.filter((m) => allowedModels.includes(m.value));
  } else if (userDefaultModel) {
    filtered = activeModels.filter((m) => m.value === userDefaultModel);
  } else {
    filtered = [];
  }

  const data = filtered.map((m) => ({
    id: m.value,
    object: "model",
    owned_by: "gateway",
  }));

  res.json({ object: "list", data });
});

router.get("/rules", (req, res) => {
  res.json({ rules: listRules() });
});

export default router;
