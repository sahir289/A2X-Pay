import loginServices from "../services/loginServices.js";

class LogInController {
    // Login User
    async login(req, res, next) {
        try {
            // Check request validation
            // checkValidation(req);

            const { userName, password } = req.body;
            console.log("🚀 ~ LogInController ~ login ~ req.body:", req.body)

            // Attempt to log in the user
            const user = await loginServices.login(userName,password)

            console.log("🚀 ~ LogInController ~ login ~ user:", user)





            // Destructure user properties and remove sensitive information
            const {
                password: userPassword,
                forgotPasswordToken,
                isVerified,
                ...finalUser
            } = user;

            // Check if the user's first company allows login
            if (!user?.companies[0]?.status) {
                const error = new CustomError(401, "User is not allowed to login");
                throw error;
            }

            //Manage Last Login Date
            await authServices.manageLastLogIn(email.toLowerCase());

            // Respond with a success message and the user data
            return DefaultResponse(
                res,
                200,
                "User logged in successfully",
                finalUser
            );
        } catch (err) {
            // Handle errors and pass them to the next middleware
            next(err);
        }
    }
}

export default new LogInController()