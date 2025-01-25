import { Router } from "express";
import {
	blockUsers,
	createUser,
	deleteUsers,
	getUsers,
	loginUser,
} from "../controllers/user.controller";

const router = Router();

router.post("/login", loginUser);
router.post("/users", createUser);
router.get("/users", getUsers);
router.put("/users", blockUsers);
router.delete("/users", deleteUsers);

export default router;
