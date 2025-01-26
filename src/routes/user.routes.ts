import { Router } from "express";
import {
	createUser,
	deleteUsers,
	getUsers,
	loginUser,
	toggleUserStatus,
} from "../controllers/user.controller";

const router = Router();

router.post("/login", loginUser);
router.post("/users", createUser);
router.get("/users", getUsers);
router.put("/users", toggleUserStatus);
router.delete("/users", deleteUsers);

export default router;
