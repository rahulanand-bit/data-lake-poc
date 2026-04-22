import { chooseToolFromMessage } from "../models/router.js";

export async function routeSkill(message: string) {
  return chooseToolFromMessage(message);
}
