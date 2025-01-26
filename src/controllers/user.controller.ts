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
					isActive: true,
				},
			});

			if (!response) {
				return res
					.status(401)
					.json({ success: false, message: "Invalid credentials." });
			}

			let isValid = await bcrypt.compare(password, response.password);

			if (!isValid) {
				return res
					.status(401)
					.json({ success: false, message: "Invalid credentials." });
			}

			if (!response.isActive) {
				return res
					.status(400)
					.json({ success: false, message: "This account is blocked." });
			}

			return res.status(200).json({
				success: true,
				data: { email, name: response.name, isActive: response.isActive },
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
				isActive: true,
			},
		});

		return res
			.status(200)
			.json({ success: true, count: response.length, data: response });
	}
);

//@desc   Toggle users' status
//@route  PUT /users
//@access Private
export const toggleUserStatus = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { userEmail, emailsToUpdate } = req.body;

			if (!userEmail || !emailsToUpdate) {
				return res
					.status(400)
					.json({ success: false, message: "All fields are required." });
			}

			if (emailsToUpdate.length === 0) {
				return res
					.status(200)
					.json({ success: false, message: "No users were selected." });
			}

			await verifyUser(userEmail);

			const usersToUpdate = await prisma.user.findMany({
				where: {
					email: {
						in: emailsToUpdate,
					},
				},
				select: {
					email: true,
					isActive: true,
				},
			});

			const toggleUpdates = usersToUpdate.map(user =>
				prisma.user.update({
					where: { email: user.email },
					data: {
						isActive: !user.isActive,
					},
				})
			);

			const response = await prisma.$transaction(toggleUpdates);

			if (emailsToUpdate.includes(userEmail)) {
				return res.status(202).json({
					success: true,
					message: `You have blocked your own account.`,
				});
			}

			return res.status(200).json({
				success: true,
				message: `${usersToUpdate.length} user(s) status has changed.`,
			});
		} catch (err) {
			if (err instanceof ErrorResponse) {
				return res.status(401).json({
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

			if (emailsToDelete.includes(userEmail)) {
				return res.status(202).json({
					success: true,
					message: `You have deleted your own account.`,
				});
			}

			return res.status(200).json({
				success: true,
				message: `${response.count} user(s) have been deleted.`,
			});
		} catch (err) {
			if (err instanceof ErrorResponse) {
				return res.status(401).json({
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

	if (!user || !user.isActive) {
		throw new ErrorResponse("Your account has been blocked or deleted.");
	}
};
