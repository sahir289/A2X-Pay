
import { verifyAccessToken } from "../helper/tokenHelper.js";
import { CustomError } from "../models/customError.js";
import tokenRepo from "../repository/tokenRepo.js";
import userRepo from "../repository/userRepo.js";

const isAuthenticated = async (
    req,
    res,
    next
) => {
    try {
        // Fetch Token from Header
        const accessTokenFromCookie = req?.headers?.authorization?.split(
            " "
        )[1]

        // Check if the access token is missing
        if (!accessTokenFromCookie) {
            const error = new CustomError(
                401,
                "Authentication Error: Your session has expired. Please log in again to continue using the app."
            );
            return next(error);
        }

        // Verify the access token
        const verifiedAccessToken = verifyAccessToken(accessTokenFromCookie);

        // Check if the access token is invalid
        if (!verifiedAccessToken) {
            const error = new CustomError(
                401,
                "Authentication Error: Invalid access token"
            );
            return next(error);
        }

        // Attach user information to the request
        req.user = {
            id: verifiedAccessToken.id,
            userName: verifiedAccessToken.userName,
            loggedInUserRole: verifiedAccessToken.role, // For getting the role of the logged in user
        };

        // Fetch the token from the database for the user
        const data = await tokenRepo.getTokenByUserId(req.user.id);
        const tokenFromDatabase = data?.accessToken;

        // Check if token from the database exists and matches the token from the cookie
        if (tokenFromDatabase !== accessTokenFromCookie) {
            throw new CustomError(
                401,
                "Authentication Error: Your session has been overridden"
            );
        }

        // User is authenticated
        next();
    } catch (err) {
        next(err);
    }
};

// export const refreshAccessToken = async (
//   accessToken: string,
//   refreshToken: string
// ) => {
//   try {
//     // Check if the refresh token is valid
//     const verified: any = verifyRefreshToken(refreshToken);

//     if (!verified) {
//       const error = new CustomError(401, "Invalid refresh token");
//       throw error;
//     }

//     // Generate new access token
//     const newAccessToken = generateAccessToken({
//       id: verified?.id,
//       email: verified?.email,
//     });

//     // Generate new refresh token
//     const newRefreshToken = generateRefreshToken(
//       {
//         id: verified?.id,
//         email: verified?.email,
//       },
//       false
//     );

//     // await tokenRepository?.updateTokens(
//     // 	verified?.id,
//     // 	accessToken,
//     // 	refreshToken,
//     // 	newAccessToken,
//     // 	newRefreshToken
//     // );

//     return { newAccessToken, newRefreshToken };
//   } catch (err: any) {
//     if (err.name == "TokenExpiredError") {
//       const error = new CustomError(401, "Token expired");
//       throw error;
//     } else {
//       throw err;
//     }
//   }
// };

export default isAuthenticated