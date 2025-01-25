import app from "./src/app";
import prisma from "./prisma/prismaClient";

async function main() {
	app.listen(3000);
	console.log("Server is listening on port", 3000);
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
