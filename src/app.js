import draw from "./plot.js";
import { cleanData } from "./utils.js";

/* global d3 */

const tasks = [1, 3, 2, 5, 4, 6, 7, 8, 9, 10, 11, 12, 13];
const groups = ["A", "B", "C"];
d3.csv("../data/dadosAnderson.csv", cleanData).then(data =>
  draw(data, tasks, groups)
);
