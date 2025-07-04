import axios from "axios";
import config from "../../config.js";
import { logger } from "../utils/logger.js";
import payInRepo from "../repository/payInRepo.js";

const locationRestrictMiddleware = async (req, res, next) => {
  const API_KEY = config?.proxyCheckApiKey;
  const {payInId} = req.params;

  const urlValidationRes = await payInRepo.validatePayInUrl(payInId);
  const merchantCode = urlValidationRes?.Merchant?.code;

  const userIp =
    req.headers["x-forwarded-for"] || req.ip || req.connection.remoteAddress;
  logger.info(`Request Details:
      Headers: ${JSON.stringify(req.headers, null, 2)}
      req.ip: ${req.ip}
      x-forwarded-for: ${req.headers["x-forwarded-for"]}
      remoteAddress: ${req.connection.remoteAddress}`);

  const userIpShouldBlock = "13.41.235.43";
  if (userIp === userIpShouldBlock) {
    logger.warn("Fraud User. Access denied.", userIp);
    return res.status(403).send("403: Access denied");
  }

  const restrictedLocation = {
    latitude: config?.latitudeBlock,
    longitude: config?.longitudeBlock,
  };
  const radiusKm = 60;
  const restrictedStates = ["Haryana", "Rajasthan", "Gujarat"];
  

  try {
    const response = await axios.get(
      `https://proxycheck.io/v2/${userIp}?key=${API_KEY}&vpn=3&asn=1`
    );
    logger.info("response data here:", response.data);
    const newresp = await response.data;
    const userData = newresp[userIp];

    if (!userData) {
      logger.warn("No data found for the provided IP.");
      return res.status(500).send("500: Access denied");
    }
    const { latitude, longitude, vpn, region, country} = userData;
    logger.info("user data here", userData);

    if (vpn === "yes") {
      logger.warn("VPN detected. Access denied.", userData);
      return res.status(403).send("403: Access denied, Please do not use VPN");
    }
    const codes = ['RP', 'RP-STG', 'anna247'];

    if(!codes.includes(merchantCode)) {
      if (country === 'India' && restrictedStates.includes(region)) {
        logger.error(`Access restricted for users in ${region}.`, userData);
        return res.status(403).send('403: Access denied');
      }
    }

    // const europeanCountries = [
    //   'Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium',
    //   'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
    //   'Denmark', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece',
    //   'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kazakhstan', 'Kosovo', 'Latvia',
    //   'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco',
    //   'Montenegro', 'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal',
    //   'Romania', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
    //   'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom', 'Vatican City'
    // ];

    // if (country !== 'India' && country !== 'United Arab Emirates' && country !== 'Pakistan' && !europeanCountries.includes(country)) {
    //   logger.error(`Access restricted for users from ${country}.`, userData);
    //   return res.status(403).send('403: Access denied, Please do not use VPN');
    // }

    // if (!isNaN(latitude) && !isNaN(longitude)) {
    //   // Check if the user is in the restricted region
    //   if (
    //     isLocationBlocked(
    //       latitude,
    //       longitude,
    //       restrictedLocation.latitude,
    //       restrictedLocation.longitude,
    //       radiusKm
    //     )
    //   ) {
    //     logger.error("Access restricted in your region.", userData);
    //     return res
    //       .status(403)
    //       .send("403: Access denied, Please do not use VPN");
    //   }
    // } else {
    //   logger.warn("Invalid latitude/longitude data received.");
    //   return res.status(500).send("500: Access denied");
    // }

    next();
  } catch (error) {
    logger.error("Error fetching location data:", error);
    res.status(500).send("500: Access denied");
  }
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const isLocationBlocked = (
  userLat,
  userLon,
  restrictedLat,
  restrictedLon,
  radiusKm
) => {
  const distance = haversineDistance(
    userLat,
    userLon,
    restrictedLat,
    restrictedLon
  );
  return distance <= radiusKm;
};

export default locationRestrictMiddleware;
