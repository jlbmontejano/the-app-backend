export class ErrorResponse extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ErrorResponse";
	}
}
