import app from "./src/app";
import prisma from "./prisma/prismaClient";
import { configDotenv } from "dotenv";
configDotenv();

async function main() {
	app.listen(process.env.PORT);
	console.log("Server is listening on port", process.env.PORT);
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async e => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
