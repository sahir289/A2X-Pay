import axios from "axios";
import config from "../../config.js";
import { logger } from "../utils/logger.js";

const locationRestrictMiddleware = async (req, res, next) => {
    const API_KEY = config?.proxyCheckApiKey;
    const userIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info(`${req.ip}, req.ip, ${req.headers['x-forwarded-for']}, headers, ${req.connection.remoteAddress}, requested`)
    const restrictedLocation = { latitude: config?.latitudeBlock, longitude: config?.longitudeBlock };
    const radiusKm = 60;
    const restrictedStates = ['Haryana', 'Rajasthan'];

    try {
      const response = await axios.get(`https://proxycheck.io/v2/${userIp}?key=${API_KEY}&vpn=3&asn=1`);
      logger.info('response data here:', response.data);
      console.log(response.data, "1223443")
      const newresp = await response.data;
      const userData = newresp[userIp];

      if (!userData) {
        logger.warn("No data found for the provided IP.");
        return res.status(500).send('No location data available.');
      }
      const { latitude, longitude, vpn, region } = userData;
      if (vpn === 'yes') {
        logger.warn("VPN detected. Access denied.");
        return res.status(403).send('Access denied due to VPN usage.');
      }

      if (restrictedStates.includes(region)) {
        logger.error(`Access restricted for users in ${region}.`);
        return res.status(403).send('Access restricted in your region.');
      }
      if (!isNaN(latitude) && !isNaN(longitude)) {
      // Check if the user is in the restricted region
      if (isLocationBlocked(latitude, longitude, restrictedLocation.latitude, restrictedLocation.longitude, radiusKm)) {
        logger.error("Access restricted in your region.");
        return res.status(403).send('Access restricted in your region.');
      }
      } else {
        logger.warn("Invalid latitude/longitude data received.");
        return res.status(500).send('Invalid location data.');
      }

      next();
    } catch (error) {
      logger.error('Error fetching location data:', error);
      res.status(500).send('Internal server error.');
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
  
  const isLocationBlocked = (userLat, userLon, restrictedLat, restrictedLon, radiusKm) => {
    const distance = haversineDistance(userLat, userLon, restrictedLat, restrictedLon);
    return distance <= radiusKm;
  };
  

  export default locationRestrictMiddleware;