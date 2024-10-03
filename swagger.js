import swaggerJsDoc from "swagger-jsdoc";
import YAML from "yamljs";
import path from "path";


const __dirname = path.dirname(new URL(import.meta.url).pathname);

const swaggerDefinition = YAML.load(path.join(__dirname, 'trust-pay-24.yaml'));

const swaggerOptions = {
  swaggerDefinition,
  apis: [], 
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
export default swaggerDocs;
