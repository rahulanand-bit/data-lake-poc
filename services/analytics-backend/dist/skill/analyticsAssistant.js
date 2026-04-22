import { chooseToolFromMessage } from "../models/router.js";
export async function routeSkill(message) {
    return chooseToolFromMessage(message);
}
