import axios from "axios";
import config from "../../config.js";
import { logger } from "../utils/logger.js";

const locationRestrictMiddleware = async (req, res, next) => {
    const userIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const restrictedLocation = { latitude: config?.latitudeBlock, longitude: config?.longitudeBlock };
    const radiusKm = 50;
  
    try {
        console.log(userIp, "userIp", restrictedLocation.latitude, "userLat", restrictedLocation.longitude, "userLon")
      const { data } = await axios.get(`https://ipinfo.io/${userIp}?token=${config?.ipInfoApiKey}`);
      const loc = data?.loc;

      if (loc) {
        const [userLat, userLon] = loc.split(',').map(Number);

        if (!isNaN(userLat) && !isNaN(userLon)) {
            if (isLocationBlocked(userLat, userLon, restrictedLocation.latitude, restrictedLocation.longitude, radiusKm)) {
            logger.error("Access restricted in your region.");
            return res.status(403).send('Access restricted in your region.');
            }
        } else {
            logger.warn("Invalid latitude/longitude data received.");
        }
      } else {
        logger.warn("Location data not available for the IP.");
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