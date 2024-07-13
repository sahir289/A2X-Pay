// Default Response For Every Api
export const DefaultResponse = (
	res,
	statusCode,
	message,
	data,
	total ,
	page
) => {
	let response = {
		message: message,
		statusCode: statusCode,
		data: data,
	};
	if (total) {
		response = { ...response, total };
	}
	if (page) {
		response = { ...response, page };
	}

	return res.status(statusCode).json(response);
};
