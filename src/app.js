import draw from "./plot.js";
import { cleanData } from "./utils.js";

/* global d3 */

d3.csv("../data/dadosAnderson.csv", cleanData).then(draw);
