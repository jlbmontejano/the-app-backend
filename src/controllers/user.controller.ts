import { NextFunction, Request, Response } from "express";
import prisma from "../../prisma/prismaClient";
import asyncHandler from "../middleware/asyncHandler";
import bcrypt from "bcrypt";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ErrorResponse } from "../utils/errorResponse";

//@desc   Create a user
//@route  POST /users
//@access Public
export const createUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { name, email, password } = req.body;
			const saltRounds = 10;

			if (!name || !email || !password) {
				return res
					.status(400)
					.json({ success: false, message: "All fields are required." });
			}

			const hashedPassword = await bcrypt.hash(password, saltRounds);

			const response = await prisma.user.create({
				data: {
					name,
					email,
					password: hashedPassword,
				},
				select: {
					name: true,
					email: true,
				},
			});

			if (!response) {
				return res
					.status(400)
					.json({ success: false, message: "Error creating user." });
			}

			return res.status(200).json({ success: true, data: response });
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				return res
					.status(400)
					.json({ success: false, message: "Email is already used." });
			}

			return res.status(400).json({ success: false, message: "Error" });
		}
	}
);

//@desc   Logs in a user
//@route  POST /login
//@access Public
export const loginUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { email, password } = req.body;

			if (!email || !password) {
				return res
					.status(400)
					.json({ success: false, message: "All fields are required." });
			}

			const response = await prisma.user.findFirst({
				where: {
					email,
				},
				select: {
					name: true,
					password: true,
					status: true,
				},
			});

			if (!response) {
				return res
					.status(404)
					.json({ success: false, message: "User not found." });
			}

			let isValid = await bcrypt.compare(password, response.password);

			if (!isValid) {
				return res
					.status(403)
					.json({ success: false, message: "Invalid credentials." });
			}

			if (response.status === "BLOCKED") {
				return res
					.status(400)
					.json({ success: false, message: "This account is blocked." });
			}

			return res.status(200).json({
				success: true,
				data: { email, name: response.name, status: response.status },
			});
		} catch (err) {
			return res
				.status(400)
				.json({ success: false, message: "Internal error. Please try again." });
		}
	}
);

//@desc   Get all users' information
//@route  GET /users
//@access Public
export const getUsers = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const response = await prisma.user.findMany({
			select: {
				name: true,
				email: true,
				status: true,
			},
		});

		return res
			.status(200)
			.json({ success: true, count: response.length, data: response });
	}
);

//@desc   Blocks users
//@route  PUT /users
//@access Private
export const blockUsers = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { userEmail, emailsToBlock } = req.body;

			if (!userEmail || !emailsToBlock) {
				return res
					.status(400)
					.json({ success: false, message: "All fields are required." });
			}

			if (emailsToBlock.length === 0) {
				return res
					.status(200)
					.json({ success: false, message: "No users were selected." });
			}

			await verifyUser(userEmail);

			const response = await prisma.user.updateMany({
				where: {
					email: {
						in: emailsToBlock,
					},
				},
				data: {
					status: "BLOCKED",
				},
			});

			return res.status(200).json({
				success: true,
				message: `${response.count} user(s) have been blocked.`,
			});
		} catch (err) {
			if (err instanceof ErrorResponse) {
				return res.status(403).json({
					success: false,
					message: err.message,
				});
			}

			return res
				.status(400)
				.json({ success: false, message: "Internal error. Please try again." });
		}
	}
);

//@desc   Deletes users
//@route  DELETE /users
//@access Private
export const deleteUsers = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { userEmail, emailsToDelete } = req.body;

			if (!userEmail || !emailsToDelete) {
				return res
					.status(400)
					.json({ success: false, message: "All fields are required." });
			}

			if (emailsToDelete.length === 0) {
				return res
					.status(200)
					.json({ success: false, message: "No users were selected." });
			}

			await verifyUser(userEmail);

			const response = await prisma.user.deleteMany({
				where: {
					email: {
						in: emailsToDelete,
					},
				},
			});

			return res.status(200).json({
				success: true,
				message: `${response.count} user(s) have been deleted.`,
			});
		} catch (err) {
			if (err instanceof ErrorResponse) {
				return res.status(403).json({
					success: false,
					message: err.message,
				});
			}

			return res.status(400).json({
				success: false,
				message: "Error. Please try again.",
			});
		}
	}
);

const verifyUser = async (email: string) => {
	const user = await prisma.user.findFirst({
		where: {
			email,
		},
	});

	if (!user || user.status === "BLOCKED") {
		throw new ErrorResponse("Your account has been blocked or deleted.");
	}
};
