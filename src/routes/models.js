import { Router } from "express";
import { listRules } from "../sanitizer/index.js";
import { getModels } from "../data/store.js";

const router = Router();

router.get("/", (req, res) => {
  const activeModels = getModels().filter((m) => m.active);

  const filtered =
    req.user?.allowedModels?.length > 0
      ? activeModels.filter((m) => req.user.allowedModels.includes(m.value))
      : activeModels;

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
